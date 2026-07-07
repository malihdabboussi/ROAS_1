import { createHash, createHmac, randomBytes } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import type { SupabaseOAuthTokenResponse, SupabaseUserIntegration } from '../types/supabase.types'

const SUPABASE_API_BASE = 'https://api.supabase.com'
const INTEGRATION_ID = 'supabase'

type StatePayload = {
  userId: string
  orgId: string | null
  redirectTo: string
  codeVerifier: string
  ts: number
}

@Injectable()
export class SupabaseOAuthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.clientId = this.config.get<string>('SUPABASE_OAUTH_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('SUPABASE_OAUTH_CLIENT_SECRET') || ''
    this.redirectUri = this.config.get<string>('SUPABASE_OAUTH_REDIRECT_URI') || ''
    this.stateSecret = this.config.get<string>('SUPABASE_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret && !!this.redirectUri && !!this.stateSecret
  }

  getAuthorizationUrl(userId: string, orgId: string | null, redirectTo: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Supabase OAuth is not configured. Set SUPABASE_OAUTH_CLIENT_ID, SUPABASE_OAUTH_CLIENT_SECRET, SUPABASE_OAUTH_REDIRECT_URI, SUPABASE_OAUTH_STATE_SECRET.',
      )
    }

    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

    const state = this.signState({
      userId,
      orgId,
      redirectTo: finalRedirectTo,
      codeVerifier,
      ts: Date.now(),
    })

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    })

    return `${SUPABASE_API_BASE}/v1/oauth/authorize?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('Supabase OAuth is not configured')

    const parsedState = this.verifyState(state)

    const tokens = await this.exchangeCodeForTokens(code, parsedState.codeVerifier)
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new BadRequestException('Supabase token exchange failed: missing tokens')
    }

    await this.upsertUserIntegration(parsedState.userId, parsedState.orgId, tokens)

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('supabase_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<{
    connected: boolean
    status: string | null
    connectedAt: string | null
  }> {
    const data = await this.connections.getStatus(supabase, INTEGRATION_ID, userId, orgId)
    if (!data) {
      return { connected: false, status: null, connectedAt: null }
    }

    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId: string | null): Promise<void> {
    const integration = await this.connections.getStatus(supabase, INTEGRATION_ID, userId, orgId)
    if (!integration?.id) return
    await this.connections.markDisconnectedById(
      supabase,
      integration.id,
      'Failed to disconnect Supabase',
    )
  }

  async getAccessToken(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    if (!integration.access_token) {
      throw new BadRequestException('Supabase is not connected')
    }

    if (integration.token_expires_at && new Date(integration.token_expires_at) <= new Date()) {
      if (!integration.refresh_token) {
        throw new BadRequestException('Supabase token expired and no refresh token available')
      }
      const refreshed = await this.refreshAccessToken(integration.refresh_token)
      await this.updateTokens(supabase, integration.id, refreshed)
      return refreshed.access_token
    }

    return integration.access_token
  }

  // ── Internal helpers ──

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<SupabaseOAuthTokenResponse> {
    const response = await fetch(`${SUPABASE_API_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase token exchange failed: ${text}`)
    }

    return (await response.json()) as SupabaseOAuthTokenResponse
  }

  private async refreshAccessToken(refreshToken: string): Promise<SupabaseOAuthTokenResponse> {
    const response = await fetch(`${SUPABASE_API_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase token refresh failed: ${text}`)
    }

    return (await response.json()) as SupabaseOAuthTokenResponse
  }

  private async updateTokens(
    supabase: SupabaseClient,
    integrationId: string,
    tokens: SupabaseOAuthTokenResponse,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    await this.connections.updateTokens(
      supabase,
      integrationId,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      'Failed to refresh Supabase tokens',
    )
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
    orgId: string | null,
    tokens: SupabaseOAuthTokenResponse,
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const row = {
      user_id: userId,
      integration_id: INTEGRATION_ID,
      provider: INTEGRATION_ID,
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      connected_at: now,
      error_message: null,
      metadata: {},
      updated_at: now,
    }

    await this.connections.upsertConnection(
      INTEGRATION_ID,
      userId,
      row,
      orgId,
      'personal',
      'Failed to save Supabase connection',
    )
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<SupabaseUserIntegration> {
    return this.connections.getConnectedIntegration<SupabaseUserIntegration>(
      supabase,
      INTEGRATION_ID,
      userId,
      orgId,
      'Supabase is not connected',
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
