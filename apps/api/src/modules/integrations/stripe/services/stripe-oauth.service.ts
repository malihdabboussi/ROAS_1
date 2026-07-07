import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { StripeIntegration } from '../integrations/stripe.integration'
import type { StripeOAuthTokenResponse, StripeUserIntegration } from '../types/stripe.types'

type StatePayload = {
  userId: string
  redirectTo: string
  ts: number
  orgId?: string | null
  scopeMode?: 'personal' | 'org_shared'
}

@Injectable()
export class StripeOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly stripe: StripeIntegration,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.stateSecret = this.config.get<string>('STRIPE_CONNECT_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return this.stripe.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(
    userId: string,
    redirectTo: string,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Stripe OAuth is not configured. Set STRIPE_CONNECT_CLIENT_ID, STRIPE_CONNECT_REDIRECT_URI, STRIPE_CONNECT_SECRET_KEY, STRIPE_CONNECT_STATE_SECRET.',
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
    return this.stripe.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('Stripe OAuth is not configured')

    const parsedState = this.verifyState(state)
    const tokens = await this.stripe.exchangeCodeForTokens(code)
    if (!tokens.access_token || !tokens.stripe_user_id) {
      throw new BadRequestException(
        'Stripe token exchange failed: missing access_token/stripe_user_id',
      )
    }

    await this.upsertUserIntegration(
      parsedState.userId,
      tokens,
      parsedState.orgId ?? null,
      parsedState.scopeMode ?? 'personal',
    )

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('stripe_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{
    connected: boolean
    status: string | null
    stripeUserId: string | null
    livemode: boolean | null
    connectedAt: string | null
  }> {
    const data = await this.connections.getStatus(supabase, 'stripe', userId, orgId)

    if (!data) {
      return {
        connected: false,
        status: null,
        stripeUserId: null,
        livemode: null,
        connectedAt: null,
      }
    }
    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      stripeUserId: (metadata?.stripe_user_id as string | undefined) ?? null,
      livemode: (metadata?.livemode as boolean | undefined) ?? null,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId?: string | null): Promise<void> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    await this.connections.markDisconnectedById(
      supabase,
      integration.id,
      'Failed to disconnect Stripe',
    )
  }

  async getAccessToken(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    if (!integration.access_token) {
      throw new BadRequestException('Stripe is not connected')
    }
    return integration.access_token
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

  private async upsertUserIntegration(
    userId: string,
    tokens: StripeOAuthTokenResponse,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()
    const now = new Date().toISOString()
    const row = {
      user_id: userId,
      integration_id: 'stripe',
      provider: 'stripe',
      org_id: orgId ?? null,
      scope_mode: scopeMode,
      is_default: false,
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: {
        token_type: tokens.token_type,
        scope: tokens.scope,
        livemode: tokens.livemode,
        stripe_user_id: tokens.stripe_user_id,
        stripe_publishable_key: tokens.stripe_publishable_key,
      },
      connection_label: tokens.stripe_user_id ?? null,
      updated_at: now,
    }

    await this.connections.upsertConnection(
      'stripe',
      userId,
      row,
      orgId,
      scopeMode,
      'Failed to save Stripe connection',
    )
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<StripeUserIntegration> {
    return this.connections.getConnectedIntegration<StripeUserIntegration>(
      supabase,
      'stripe',
      userId,
      orgId,
      'Stripe is not connected',
    )
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
}
