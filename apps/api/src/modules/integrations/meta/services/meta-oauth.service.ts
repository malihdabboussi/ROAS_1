import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { META_ERRORS } from '../config/meta-errors.config'
import { MetaIntegration } from '../integrations/meta.integration'
import type { MetaTokenResponse, MetaUserIntegration } from '../types/meta.types'

type StatePayload = {
  userId: string
  redirectTo: string
  ts: number
  orgId?: string | null
  scopeMode?: 'personal' | 'org_shared'
}

@Injectable()
export class MetaOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly meta: MetaIntegration,
    private readonly connections: IntegrationConnectionsRepository,
  ) {
    this.stateSecret = this.config.get<string>('META_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return this.meta.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(
    userId: string,
    redirectTo: string,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(META_ERRORS.MISSING_OAUTH_CONFIG)
    }

    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const state = this.signState({
      userId,
      redirectTo: finalRedirectTo,
      ts: Date.now(),
      orgId: orgId ?? null,
      scopeMode,
    })
    return this.meta.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException(META_ERRORS.MISSING_OAUTH_CONFIG)

    const parsedState = this.verifyState(state)
    const shortLivedTokens = await this.meta.exchangeCodeForTokens(code)

    if (!shortLivedTokens.access_token) {
      throw new BadRequestException('Meta token exchange failed: missing access_token')
    }

    const longLivedTokens = await this.meta.exchangeForLongLivedToken(shortLivedTokens.access_token)
    const expiresAt = longLivedTokens.expires_in
      ? new Date(Date.now() + longLivedTokens.expires_in * 1000).toISOString()
      : null

    const [metaUserProfile, adAccounts, pages] = await Promise.all([
      this.meta.getMetaUserProfile(longLivedTokens.access_token),
      this.meta.getAdAccounts(longLivedTokens.access_token),
      this.meta.getPages(longLivedTokens.access_token),
    ])

    await this.upsertUserIntegration(
      parsedState.userId,
      longLivedTokens,
      expiresAt,
      {
        meta_user_id: metaUserProfile.id,
        meta_user_name: metaUserProfile.name,
        ad_accounts: adAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency })),
        pages: pages.map((p) => ({
          id: p.id,
          name: p.name,
          ...(p.instagram_business_account?.id
            ? {
                instagram_business_account: {
                  id: p.instagram_business_account.id,
                  username: p.instagram_business_account.username,
                },
              }
            : {}),
        })),
      },
      parsedState.orgId ?? null,
      parsedState.scopeMode ?? 'personal',
    )

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('meta_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{
    connected: boolean
    status: string | null
    connectedAt: string | null
    adAccounts: Array<{ id: string; name: string }> | null
    pages: Array<{ id: string; name: string }> | null
  }> {
    const data = await this.connections.getStatus(supabase, 'meta', userId, orgId)

    if (!data)
      return { connected: false, status: null, connectedAt: null, adAccounts: null, pages: null }

    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      connectedAt: (data.connected_at as string | null) ?? null,
      adAccounts: (metadata?.ad_accounts as Array<{ id: string; name: string }>) ?? null,
      pages: (metadata?.pages as Array<{ id: string; name: string }>) ?? null,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId?: string | null): Promise<void> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    await this.connections.markDisconnectedById(
      supabase,
      integration.id,
      'Failed to disconnect Meta',
    )
  }

  async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<MetaUserIntegration> {
    return this.connections.getConnectedIntegration<MetaUserIntegration>(
      supabase,
      'meta',
      userId,
      orgId,
      'Meta is not connected',
    )
  }

  async getAccessToken(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    if (!integration.access_token) {
      throw new BadRequestException('Missing Meta access token. Reconnect Meta.')
    }
    return integration.access_token
  }

  async handleDataDeletion(
    signedRequest: string,
  ): Promise<{ url: string; confirmation_code: string } | null> {
    const data = this.meta.parseSignedRequest(signedRequest)
    if (!data) return null

    const userId = data.user_id as string
    const confirmationCode = `meta_del_${Date.now()}_${userId}`

    const supabaseUrl = this.config.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL || ''
    const serviceKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''

    if (supabaseUrl && serviceKey) await this.connections.markMetaDataDeleted(userId)

    return {
      url: `${this.appUrl}/settings/integrations?data_deletion=confirmed`,
      confirmation_code: confirmationCode,
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

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
    tokens: MetaTokenResponse,
    expiresAt: string | null,
    metadata: Record<string, unknown>,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()
    const now = new Date().toISOString()
    const metaLabel =
      typeof metadata.meta_user_name === 'string' ? metadata.meta_user_name.trim() || null : null

    const row = {
      user_id: userId,
      org_id: orgId ?? null,
      integration_id: 'meta' as const,
      provider: 'meta',
      scope_mode: scopeMode,
      is_default: false,
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: null,
      token_expires_at: expiresAt,
      connected_at: now,
      error_message: null,
      metadata,
      connection_label: metaLabel,
      updated_at: now,
    }

    await this.connections.upsertConnection(
      'meta',
      userId,
      row,
      orgId,
      scopeMode,
      'Failed to save Meta connection',
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
