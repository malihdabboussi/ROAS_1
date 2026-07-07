import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { PaypalIntegration } from '../integrations/paypal.integration'
import type { PayPalOAuthTokenResponse, PayPalUserIntegration } from '../types/paypal.types'

type StatePayload = {
  userId: string
  redirectTo: string
  ts: number
  orgId?: string | null
  scopeMode?: 'personal' | 'org_shared'
}

const TOKEN_SKEW_MS = 120_000

@Injectable()
export class PaypalOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly paypal: PaypalIntegration,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.stateSecret = this.config.get<string>('PAYPAL_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return this.paypal.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(
    userId: string,
    redirectTo: string,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'PayPal OAuth is not configured. Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_REDIRECT_URI, PAYPAL_STATE_SECRET.',
      )
    }
    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const state = this.signState({
      userId,
      redirectTo: finalRedirectTo,
      ts: Date.now(),
      orgId: orgId ?? null,
      scopeMode,
    })
    return this.paypal.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('PayPal OAuth is not configured')
    const parsedState = this.verifyState(state)
    const tokens = await this.paypal.exchangeCodeForTokens(code)
    if (!tokens.access_token) {
      throw new BadRequestException('PayPal token exchange failed: missing access_token')
    }
    // Userinfo is the whole point of Log in with PayPal — payer_id + email are required
    // to identify, pay out, and dedupe the account. Fail the callback instead of marking
    // the integration "connected" with empty metadata.
    const userInfo = await this.paypal.getUserInfo(tokens.access_token)
    await this.upsertUserIntegration(
      parsedState.userId,
      tokens,
      userInfo,
      parsedState.orgId ?? null,
      parsedState.scopeMode ?? 'personal',
    )

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('paypal_connected', '1')
    return url.toString()
  }

  /**
   * Builds a redirect URL back to the app on PayPal callback failure.
   * Uses the state's `redirectTo` when we can parse it; otherwise falls back to APP_URL.
   * Always preserves a short error code so the UI can toast instead of showing raw HTML.
   */
  buildCallbackErrorRedirect(state: string | undefined, errorCode: string): string {
    const fallback = new URL(this.appUrl)
    fallback.searchParams.set('paypal_error', errorCode)
    try {
      if (!state) return fallback.toString()
      const parsed = this.verifyState(state)
      const url = new URL(parsed.redirectTo)
      url.searchParams.set('paypal_error', errorCode)
      return url.toString()
    } catch {
      return fallback.toString()
    }
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{
    connected: boolean
    status: string | null
    payerId: string | null
    email: string | null
    connectedAt: string | null
  }> {
    const data = await this.connections.getStatus(supabase, 'paypal', userId, orgId)

    if (!data) {
      return { connected: false, status: null, payerId: null, email: null, connectedAt: null }
    }
    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      payerId:
        (metadata?.payer_id as string | undefined) ?? (metadata?.sub as string | undefined) ?? null,
      email: (metadata?.email as string | undefined) ?? null,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId?: string | null): Promise<void> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    await this.connections.markDisconnectedById(
      supabase,
      integration.id,
      'Failed to disconnect PayPal',
    )
  }

  async getValidAccessToken(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    if (!integration.access_token) {
      throw new BadRequestException('PayPal is not connected')
    }
    const expiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : 0
    const now = Date.now()
    if (expiresAt > now + TOKEN_SKEW_MS) {
      return integration.access_token
    }
    const refresh = integration.refresh_token
    if (!refresh) {
      throw new BadRequestException('PayPal access expired and no refresh token is stored')
    }
    const tokens = await this.paypal.refreshAccessToken(refresh)
    if (!tokens.access_token) {
      throw new BadRequestException('PayPal refresh failed: missing access_token')
    }
    const nextRefresh = tokens.refresh_token ?? refresh
    const expiresInSec = typeof tokens.expires_in === 'number' ? tokens.expires_in : 28800
    const tokenExpiresAt = new Date(now + expiresInSec * 1000).toISOString()
    this.assertSupabaseServiceConfigured()
    const refreshNow = new Date().toISOString()
    const refreshRow = {
      user_id: userId,
      integration_id: 'paypal',
      provider: 'paypal',
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: nextRefresh,
      token_expires_at: tokenExpiresAt,
      metadata: {
        ...((integration.metadata as Record<string, unknown> | null) ?? {}),
        scope: tokens.scope,
      },
      updated_at: refreshNow,
    }
    await this.connections.updateServiceTokensById(
      integration.id,
      {
        ...refreshRow,
        updated_at: refreshNow,
        scope_mode:
          ((integration as unknown as { scope_mode?: string }).scope_mode as
            | 'personal'
            | 'org_shared'
            | undefined) ?? 'personal',
      },
      'Failed to persist PayPal tokens',
    )
    return tokens.access_token
  }

  private normalizeRedirectTo(redirectTo: string): string {
    try {
      const url = new URL(redirectTo)
      const app = new URL(this.appUrl)
      if (url.origin !== app.origin) return this.appUrl
      return url.toString()
    } catch {
      return this.appUrl
    }
  }

  private signState(payload: StatePayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    const sig = createHmac('sha256', this.stateSecret).update(encoded).digest('base64url')
    return `${encoded}.${sig}`
  }

  private verifyState(state: string): StatePayload {
    const [encoded, sig] = state.split('.')
    if (!encoded || !sig) throw new BadRequestException('Invalid state')
    const expected = createHmac('sha256', this.stateSecret).update(encoded).digest('base64url')
    if (expected !== sig) throw new BadRequestException('Invalid state')

    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StatePayload
    if (!decoded?.userId || !decoded?.redirectTo || typeof decoded.ts !== 'number') {
      throw new BadRequestException('Invalid state')
    }
    if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new BadRequestException('State expired')
    return decoded
  }

  private assertSupabaseServiceConfigured(): void {
    const url = this.config.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL || ''
    const serviceKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    if (!url || !serviceKey) {
      throw new BadRequestException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
  }

  private async upsertUserIntegration(
    userId: string,
    tokens: PayPalOAuthTokenResponse,
    userInfo: Awaited<ReturnType<PaypalIntegration['getUserInfo']>> | null,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()
    const expiresInSec = typeof tokens.expires_in === 'number' ? tokens.expires_in : 28800
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString()
    const payerId = userInfo?.payer_id ?? userInfo?.user_id ?? userInfo?.sub ?? undefined
    const now = new Date().toISOString()
    const row = {
      user_id: userId,
      org_id: orgId ?? null,
      integration_id: 'paypal',
      provider: 'paypal',
      scope_mode: scopeMode,
      is_default: false,
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokenExpiresAt,
      connected_at: now,
      error_message: null,
      metadata: {
        scope: tokens.scope,
        payer_id: payerId,
        sub: userInfo?.sub,
        email: userInfo?.email,
        name: userInfo?.name,
        verified_account: userInfo?.verified_account,
      },
      connection_label: userInfo?.email ?? null,
      updated_at: now,
    }

    await this.connections.upsertConnection(
      'paypal',
      userId,
      row,
      orgId,
      scopeMode,
      'Failed to save PayPal connection',
    )
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<PayPalUserIntegration> {
    return this.connections.getConnectedIntegration<PayPalUserIntegration>(
      supabase,
      'paypal',
      userId,
      orgId,
      'PayPal is not connected',
    )
  }
}
