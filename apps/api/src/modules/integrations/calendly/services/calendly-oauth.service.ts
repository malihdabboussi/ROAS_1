import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { CalendlyIntegration } from '../integrations/calendly.integration'
import type { CalendlyOAuthTokenResponse, CalendlyUserIntegration } from '../types/calendly.types'

type StatePayload = { userId: string; redirectTo: string; ts: number }

@Injectable()
export class CalendlyOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string
  private readonly webhookCallbackUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly calendly: CalendlyIntegration,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.stateSecret = this.config.get<string>('CALENDLY_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
    const apiUrl =
      this.config.get<string>('PUBLIC_API_URL') ||
      this.config.get<string>('API_URL') ||
      'http://localhost:4000'
    this.webhookCallbackUrl = `${apiUrl}/api/integrations/calendly/webhooks`
  }

  isConfigured(): boolean {
    return this.calendly.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(userId: string, redirectTo: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Calendly OAuth is not configured. Set CALENDLY_CLIENT_ID, CALENDLY_CLIENT_SECRET, CALENDLY_REDIRECT_URI, CALENDLY_OAUTH_STATE_SECRET.',
      )
    }
    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const state = this.signState({ userId, redirectTo: finalRedirectTo, ts: Date.now() })
    return this.calendly.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('Calendly OAuth is not configured')

    const parsedState = this.verifyState(state)
    const tokens = await this.calendly.exchangeCodeForTokens(code)
    if (!tokens.access_token) {
      throw new BadRequestException('Calendly token exchange failed: missing access_token')
    }

    const user = await this.calendly.getCurrentUser(tokens.access_token)

    let webhookUri: string | null = null
    try {
      const orgUri = tokens.organization || user.current_organization
      const webhook = await this.calendly.createWebhookSubscription(
        tokens.access_token,
        orgUri,
        user.uri,
        this.webhookCallbackUrl,
      )
      webhookUri = webhook.resource.uri
    } catch {
      // Non-fatal: webhook creation can fail if already exists or plan doesn't support it
    }

    await this.upsertUserIntegration(parsedState.userId, tokens, user, webhookUri)

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('calendly_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{
    connected: boolean
    status: string | null
    calendlyUserUri: string | null
    schedulingUrl: string | null
    connectedAt: string | null
  }> {
    const data = await this.connections.getStatus(supabase, 'calendly', userId, null)

    if (!data) {
      return {
        connected: false,
        status: null,
        calendlyUserUri: null,
        schedulingUrl: null,
        connectedAt: null,
      }
    }
    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      calendlyUserUri: (metadata?.calendly_user_uri as string | undefined) ?? null,
      schedulingUrl: (metadata?.calendly_scheduling_url as string | undefined) ?? null,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string): Promise<void> {
    const integration = await this.getConnectedIntegration(supabase, userId)

    if (integration?.access_token && integration?.metadata?.webhook_subscription_uri) {
      try {
        await this.calendly.deleteWebhookSubscription(
          integration.access_token,
          integration.metadata.webhook_subscription_uri,
        )
      } catch {
        // Best-effort cleanup
      }
    }

    if (integration?.id) {
      await this.connections.markDisconnectedById(
        supabase,
        integration.id,
        'Failed to disconnect Calendly',
      )
      return
    }

    await this.connections.markPersonalDisconnectedWithClient(
      supabase,
      'calendly',
      userId,
      'Failed to disconnect Calendly',
    )
  }

  async getAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId)
    if (!integration?.access_token) {
      throw new BadRequestException('Calendly is not connected')
    }

    const expiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : 0
    const fiveMinFromNow = Date.now() + 5 * 60 * 1000

    if (expiresAt && expiresAt < fiveMinFromNow && integration.refresh_token) {
      const tokens = await this.calendly.refreshAccessToken(integration.refresh_token)
      await this.updateTokens(userId, tokens)
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
    tokens: CalendlyOAuthTokenResponse,
    user: { uri: string; email: string; scheduling_url: string; current_organization: string },
    webhookUri: string | null,
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    const now = new Date().toISOString()
    const row = {
      user_id: userId,
      integration_id: 'calendly',
      provider: 'calendly',
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      connected_at: now,
      error_message: null,
      metadata: {
        calendly_user_uri: user.uri,
        calendly_org_uri: tokens.organization || user.current_organization,
        calendly_user_email: user.email,
        calendly_scheduling_url: user.scheduling_url,
        webhook_subscription_uri: webhookUri,
      },
      connection_label: user.email ?? null,
      updated_at: now,
    }

    await this.connections.upsertConnection(
      'calendly',
      userId,
      row,
      null,
      'personal',
      'Failed to save Calendly connection',
    )
  }

  private async updateTokens(userId: string, tokens: CalendlyOAuthTokenResponse): Promise<void> {
    this.assertSupabaseServiceConfigured()

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    await this.connections.updatePersonalTokens(
      'calendly',
      userId,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      'Failed to refresh Calendly tokens',
    )
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<CalendlyUserIntegration | null> {
    try {
      return await this.connections.getConnectedIntegration<CalendlyUserIntegration>(
        supabase,
        'calendly',
        userId,
        null,
        'Calendly is not connected',
      )
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
