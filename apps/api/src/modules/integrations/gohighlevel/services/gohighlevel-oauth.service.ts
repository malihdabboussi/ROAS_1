import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { GoHighLevelIntegration } from '../integrations/gohighlevel.integration'
import type { GhlContact, GhlTokenResponse, GhlUserIntegration } from '../types/gohighlevel.types'

type StatePayload = { userId: string; redirectTo: string; ts: number }

@Injectable()
export class GoHighLevelOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly ghl: GoHighLevelIntegration,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.stateSecret = this.config.get<string>('GHL_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return this.ghl.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(userId: string, redirectTo: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'GoHighLevel OAuth is not configured. Set GHL_OAUTH_CLIENT_ID, GHL_OAUTH_CLIENT_SECRET, GHL_OAUTH_REDIRECT_URI, GHL_OAUTH_STATE_SECRET.',
      )
    }

    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const state = this.signState({ userId, redirectTo: finalRedirectTo, ts: Date.now() })
    return this.ghl.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('GoHighLevel OAuth is not configured')

    const parsedState = this.verifyState(state)
    const tokens = await this.ghl.exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new BadRequestException('GHL token exchange failed: missing access_token/refresh_token')
    }
    if (!tokens.locationId) {
      throw new BadRequestException('GHL token exchange failed: missing locationId')
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    await this.upsertUserIntegration(parsedState.userId, tokens, expiresAt)

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('ghl_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{
    connected: boolean
    status: string | null
    locationId: string | null
    connectedAt: string | null
  }> {
    const data = await this.connections.getStatus(supabase, 'gohighlevel', userId, null)

    if (!data)
      return { connected: false, status: null, locationId: null, connectedAt: null }
    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const locationId = (metadata?.locationId as string | undefined) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      locationId,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string): Promise<void> {
    await this.connections.markPersonalDisconnectedWithClient(
      supabase,
      'gohighlevel',
      userId,
      'Failed to disconnect GHL',
    )
  }

  async refreshAccessToken(supabase: SupabaseClient, userId: string): Promise<void> {
    const integration = await this.getConnectedIntegration(supabase, userId)
    if (!integration.refresh_token) throw new BadRequestException('No refresh token available')

    const tokens = await this.ghl.refreshAccessToken(integration.refresh_token)
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    await this.connections.updateTokens(
      supabase,
      integration.id,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      'Failed to update refreshed tokens',
    )
  }

  /**
   * Pull all contacts from the connected GHL location for CRM import (paginated).
   */
  async listLocationContactsForImport(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ contacts: GhlContact[] }> {
    const integration = await this.getConnectedIntegration(supabase, userId)
    const locationId = this.getLocationIdFromMetadata(integration)
    const accessToken = await this.ensureValidAccessToken(supabase, integration)

    const all: GhlContact[] = []
    let startAfterId: string | undefined
    const maxPages = 80

    for (let page = 0; page < maxPages; page++) {
      const { contacts, nextStartAfterId } = await this.ghl.listContactsPage(
        accessToken,
        locationId,
        {
          limit: 100,
          startAfterId,
        },
      )
      all.push(...contacts)
      if (contacts.length === 0 || !nextStartAfterId) break
      startAfterId = nextStartAfterId
    }

    return { contacts: all }
  }

  async upsertLeadContactInGhl(
    supabase: SupabaseClient,
    userId: string,
    input: {
      leadId: string
      email: string
      firstName?: string
      lastName?: string
      name?: string
      phone?: string
    },
  ): Promise<{ ghlContactId: string; contact: GhlContact }> {
    const integration = await this.getConnectedIntegration(supabase, userId)
    const locationId = this.getLocationIdFromMetadata(integration)
    const accessToken = await this.ensureValidAccessToken(supabase, integration)

    const existing = await this.ghl.findContactByEmail(accessToken, locationId, input.email)

    const contact = existing
      ? await this.ghl.updateContact(accessToken, locationId, existing.id, {
          firstName: input.firstName,
          lastName: input.lastName,
          name: input.name,
          phone: input.phone,
        })
      : await this.ghl.createContact(accessToken, locationId, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          name: input.name,
          phone: input.phone,
        })

    if (!contact?.id) throw new Error('GHL upsert contact failed: missing contact id')

    await this.connections.updateLeadGhlContactId(
      supabase,
      input.leadId,
      contact.id,
      'Failed to update lead with ghl_contact_id',
    )

    return { ghlContactId: contact.id, contact }
  }

  // ----------------------------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------------------------

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
    if (Date.now() - decoded.ts > 10 * 60 * 1000) {
      throw new BadRequestException('State expired')
    }
    return decoded
  }

  private async upsertUserIntegration(
    userId: string,
    tokens: GhlTokenResponse,
    expiresAt: string | null,
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()

    const payload = {
      provider: 'gohighlevel' as const,
      status: 'connected' as const,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      error_message: null,
      metadata: {
        token_type: tokens.token_type,
        scope: tokens.scope,
        locationId: tokens.locationId,
        companyId: tokens.companyId,
        userId: tokens.userId,
        userType: tokens.userType,
      },
      connection_label: tokens.companyId ?? tokens.locationId ?? null,
      updated_at: new Date().toISOString(),
    }

    await this.connections.upsertConnection(
      'gohighlevel',
      userId,
      {
        user_id: userId,
        integration_id: 'gohighlevel',
        ...payload,
      },
      null,
      'personal',
      'Failed to save GoHighLevel connection',
    )
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<GhlUserIntegration> {
    return this.connections.getConnectedIntegration<GhlUserIntegration>(
      supabase,
      'gohighlevel',
      userId,
      null,
      'GoHighLevel is not connected',
    )
  }

  private getLocationIdFromMetadata(integration: GhlUserIntegration): string {
    const metadata = (integration.metadata as Record<string, unknown> | null) ?? null
    const locationId = (metadata?.locationId as string | undefined) ?? null
    if (!locationId) throw new BadRequestException('Missing GHL locationId. Reconnect GoHighLevel.')
    return locationId
  }

  private async ensureValidAccessToken(
    supabase: SupabaseClient,
    integration: GhlUserIntegration,
  ): Promise<string> {
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

    if (!integration.access_token)
      throw new BadRequestException('Missing GHL access token. Reconnect GoHighLevel.')

    if (!expiresAt || expiresAt <= fiveMinutesFromNow) {
      if (!integration.refresh_token)
        throw new BadRequestException('GHL token expired and no refresh token exists')
      const refreshed = await this.ghl.refreshAccessToken(integration.refresh_token)
      const newExpiresAt = refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null

      await this.connections.updateTokens(
        supabase,
        integration.id,
        {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        },
        'Failed to persist refreshed token',
      )
      return refreshed.access_token
    }

    return integration.access_token
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
