import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { DropboxIntegration } from '../integrations/dropbox.integration'
import type { DropboxOAuthTokenResponse, DropboxUserIntegration } from '../types/dropbox.types'

type StatePayload = { userId: string; redirectTo: string; ts: number }

@Injectable()
export class DropboxOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly dropbox: DropboxIntegration,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.stateSecret = this.config.get<string>('DROPBOX_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return this.dropbox.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(userId: string, redirectTo: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Dropbox OAuth is not configured. Set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REDIRECT_URI, DROPBOX_OAUTH_STATE_SECRET.',
      )
    }
    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const state = this.signState({ userId, redirectTo: finalRedirectTo, ts: Date.now() })
    return this.dropbox.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('Dropbox OAuth is not configured')

    const parsedState = this.verifyState(state)
    const tokens = await this.dropbox.exchangeCodeForTokens(code)
    if (!tokens.access_token) {
      throw new BadRequestException('Dropbox token exchange failed: missing access_token')
    }

    const user = await this.dropbox.getUserInfo(tokens.access_token)
    await this.upsertUserIntegration(parsedState.userId, tokens, user)

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('dropbox_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{
    connected: boolean
    status: string | null
    email: string | null
    displayName: string | null
    connectedAt: string | null
  }> {
    const data = await this.connections.getStatus(supabase, 'dropbox', userId, orgId)
    if (!data) {
      return { connected: false, status: null, email: null, displayName: null, connectedAt: null }
    }
    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      email: (metadata?.email as string | undefined) ?? null,
      displayName: (metadata?.display_name as string | undefined) ?? null,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId?: string | null): Promise<void> {
    const integration = await this.connections.getStatus(supabase, 'dropbox', userId, orgId)
    if (!integration?.id) return
    await this.connections.markDisconnectedById(
      supabase,
      integration.id,
      'Failed to disconnect Dropbox',
    )
  }

  async getAccessToken(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    if (!integration?.access_token) {
      throw new BadRequestException('Dropbox is not connected')
    }

    const expiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : 0
    const fiveMinFromNow = Date.now() + 5 * 60 * 1000

    if (expiresAt && expiresAt < fiveMinFromNow && integration.refresh_token) {
      const tokens = await this.dropbox.refreshAccessToken(integration.refresh_token)
      await this.updateTokens(supabase, integration.id, tokens)
      return tokens.access_token
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
    tokens: DropboxOAuthTokenResponse,
    user: { email: string; name: string; accountId: string },
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    const now = new Date().toISOString()
    const row = {
      user_id: userId,
      integration_id: 'dropbox',
      provider: 'dropbox',
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      connected_at: now,
      error_message: null,
      metadata: {
        email: user.email,
        display_name: user.name,
        account_id: user.accountId,
      },
      connection_label: user.email ?? user.name ?? null,
      updated_at: now,
    }

    await this.connections.upsertConnection(
      'dropbox',
      userId,
      row,
      null,
      'personal',
      'Failed to save Dropbox connection',
    )
  }

  private async updateTokens(
    supabase: SupabaseClient,
    integrationId: string,
    tokens: DropboxOAuthTokenResponse,
  ): Promise<void> {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    await this.connections.updateTokens(
      supabase,
      integrationId,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      'Failed to refresh Dropbox tokens',
    )
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<DropboxUserIntegration | null> {
    try {
      return (await this.connections.getConnectedIntegration<
        DropboxUserIntegration & Record<string, unknown>
      >(supabase, 'dropbox', userId, orgId, 'Dropbox is not connected')) as DropboxUserIntegration
    } catch {
      return null
    }
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
