import { createHmac } from 'crypto'
import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceAutomationService } from '../../../spaces/services/space-automation.service'
import { FathomIntegration } from '../integrations/fathom.integration'
import { FathomRepository } from '../repositories/fathom.repository'
import type { FathomOAuthTokenResponse, FathomUserIntegration } from '../types/fathom.types'

type StatePayload = {
  userId: string
  redirectTo: string
  ts: number
  scopeMode?: 'personal' | 'org_shared'
  orgId?: string | null
}

export type FathomAutoIngestBillingScope = 'personal' | 'org'

export type FathomAutoIngestSettings = {
  autoIngest: boolean
  billingScope: FathomAutoIngestBillingScope
  billingOrgId: string | null
}

const FATHOM_ORG_BILLING_ROLES = ['owner', 'admin', 'creator', 'editor'] as const

@Injectable()
export class FathomOAuthService {
  private readonly logger = new Logger(FathomOAuthService.name)
  private readonly stateSecret: string
  private readonly appUrl: string
  private readonly apiUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly fathom: FathomIntegration,
    private readonly repo: FathomRepository,
    @Optional() private readonly spaceAutomation?: SpaceAutomationService,
  ) {
    this.stateSecret = this.config.get<string>('FATHOM_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
    this.apiUrl =
      this.config.get<string>('PUBLIC_API_URL') ||
      this.config.get<string>('API_URL') ||
      this.config.get<string>('BACKEND_URL') ||
      'http://localhost:3001'
  }

  isConfigured(): boolean {
    return this.fathom.isConfigured() && !!this.stateSecret
  }

  getAuthorizationUrl(
    userId: string,
    redirectTo: string,
    options?: { scopeMode?: 'personal' | 'org_shared'; orgId?: string | null },
  ): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Fathom OAuth is not configured. Set FATHOM_CLIENT_ID, FATHOM_CLIENT_SECRET, FATHOM_REDIRECT_URI, FATHOM_OAUTH_STATE_SECRET.',
      )
    }
    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    // org_shared requires an orgId to live on the row; fall back to personal
    // when the caller did not establish an org context.
    const scopeMode: 'personal' | 'org_shared' =
      options?.scopeMode === 'org_shared' && options?.orgId ? 'org_shared' : 'personal'
    const orgId = scopeMode === 'org_shared' ? (options?.orgId ?? null) : null
    const state = this.signState({
      userId,
      redirectTo: finalRedirectTo,
      ts: Date.now(),
      scopeMode,
      orgId,
    })
    return this.fathom.buildAuthorizationUrl(state)
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('Fathom OAuth is not configured')

    const parsedState = this.verifyState(state)
    const tokens = await this.fathom.exchangeCodeForTokens(code)
    if (!tokens.access_token) {
      throw new BadRequestException('Fathom token exchange failed: missing access_token')
    }

    const existingMeta = await this.getIntegrationMetadata(parsedState.userId)
    let webhookMeta: { webhook_secret: string; webhook_id: string; triggered_for: string[] }
    if (typeof existingMeta.webhook_id === 'string' && existingMeta.webhook_id.trim().length > 0) {
      await this.fathom.deleteWebhook(tokens.access_token, existingMeta.webhook_id).catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Fathom old webhook delete failed during OAuth callback: ${message}`)
      })
    }
    const destinationUrl = `${this.apiUrl.replace(/\/$/, '')}/api/integrations/fathom/webhook`
    const webhook = await this.fathom.createWebhook(tokens.access_token, {
      destinationUrl,
      // Team plans: include shared team recordings so Meetings can label Personal vs Team.
      // my_recordings alone only delivers Dylan-hosted calls.
      triggeredFor: [
        'my_recordings',
        'shared_team_recordings',
        'my_shared_with_team_recordings',
      ],
      includeTranscript: true,
      includeSummary: true,
      includeActionItems: true,
    })
    if (!webhook?.secret || !webhook?.id) {
      throw new BadRequestException('Fathom webhook creation failed: missing webhook id or secret')
    }
    webhookMeta = {
      webhook_secret: webhook.secret,
      webhook_id: webhook.id,
      triggered_for: [
        'my_recordings',
        'shared_team_recordings',
        'my_shared_with_team_recordings',
      ],
    }

    await this.upsertUserIntegration(parsedState.userId, tokens, webhookMeta, existingMeta, {
      scopeMode: parsedState.scopeMode ?? 'personal',
      orgId: parsedState.orgId ?? null,
    })

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('fathom_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{
    connected: boolean
    status: string | null
    connectedAt: string | null
    autoIngest: boolean
    billingScope: FathomAutoIngestBillingScope
    billingOrgId: string | null
  }> {
    const { data, error } = await this.repo.getStatus(supabase, userId)

    if (error || !data) {
      return {
        connected: false,
        status: null,
        connectedAt: null,
        ...this.parseAutoIngestSettings({}),
      }
    }
    const status = (data.status as string | undefined) ?? null
    const meta = (data.metadata as Record<string, unknown>) ?? {}
    const settings = this.parseAutoIngestSettings(meta)
    const webhookReady =
      typeof meta.webhook_id === 'string' &&
      meta.webhook_id.trim().length > 0 &&
      typeof meta.webhook_secret === 'string' &&
      meta.webhook_secret.trim().length > 0
    const connected = status === 'connected' && webhookReady
    return {
      connected,
      status: status === 'connected' && !webhookReady ? 'needs_reconnect' : status,
      connectedAt: (data.connected_at as string | null) ?? null,
      autoIngest: settings.autoIngest,
      billingScope: settings.billingScope,
      billingOrgId: settings.billingOrgId,
    }
  }

  async updateAutoIngest(
    supabase: SupabaseClient,
    userId: string,
    autoIngest: boolean,
    billing?: {
      billingScope?: FathomAutoIngestBillingScope
      billingOrgId?: string | null
    },
  ): Promise<FathomAutoIngestSettings> {
    const existingMeta = await this.repo.getRequestMetadata(supabase, userId)
    const existingSettings = this.parseAutoIngestSettings(existingMeta)
    const billingScope = billing?.billingScope ?? existingSettings.billingScope
    const billingOrgId =
      billingScope === 'org' ? (billing?.billingOrgId ?? existingSettings.billingOrgId) : null
    if (billingScope === 'org') {
      await this.assertCanUseOrgBilling(supabase, userId, billingOrgId)
    }
    const nextSettings: FathomAutoIngestSettings = {
      autoIngest,
      billingScope,
      billingOrgId,
    }
    await this.repo.updateRequestMetadata(supabase, userId, {
      ...existingMeta,
      auto_ingest: nextSettings.autoIngest,
      auto_ingest_billing_scope: nextSettings.billingScope,
      auto_ingest_billing_org_id: nextSettings.billingOrgId,
    })
    return nextSettings
  }

  async disconnect(supabase: SupabaseClient, userId: string): Promise<void> {
    // Capture the row id BEFORE the update so we can sweep dependent
    // automations even after the row's status flips to disconnected.
    const integrationRowId = await this.repo.getLatestIntegrationId(supabase, userId)

    await this.repo.disconnect(supabase, userId)

    // Phase 4: auto-disable every rule that depended on this Fathom (self
    // and user-mode rules) and notify the rule creators. Best-effort: a
    // failure here should not block disconnect.
    if (integrationRowId && this.spaceAutomation) {
      const admin = this.getAdminClient()
      try {
        await this.spaceAutomation.revokeFathomDependentRules(admin, {
          fathomOwnerUserId: userId,
          userIntegrationId: String(integrationRowId),
          mode: 'disconnect',
          reason: 'The Fathom account that fed this automation was disconnected.',
        })
      } catch (revokeErr) {
        const message = revokeErr instanceof Error ? revokeErr.message : String(revokeErr)
        this.logger.warn(`Fathom revocation cleanup failed: ${message}`)
      }
    }
  }

  async getAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId)
    if (!integration?.access_token) {
      throw new BadRequestException('Fathom is not connected')
    }

    const expiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : 0
    const fiveMinFromNow = Date.now() + 5 * 60 * 1000

    if (expiresAt && expiresAt < fiveMinFromNow && integration.refresh_token) {
      const tokens = await this.fathom.refreshAccessToken(integration.refresh_token)
      await this.updateTokens(userId, tokens)
      return tokens.access_token
    }

    return integration.access_token
  }

  async forceRefreshAndGetToken(supabase: SupabaseClient, userId: string): Promise<string> {
    const integration = await this.getConnectedIntegration(supabase, userId)
    if (!integration?.refresh_token) {
      throw new BadRequestException('Fathom token expired; please reconnect in Settings')
    }
    const tokens = await this.fathom.refreshAccessToken(integration.refresh_token)
    await this.updateTokens(userId, tokens)
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

  private async upsertUserIntegration(
    userId: string,
    tokens: FathomOAuthTokenResponse,
    webhookMeta?: {
      webhook_secret?: string
      webhook_id?: string
      triggered_for?: string[]
    } | null,
    existingMetaHint?: Record<string, unknown>,
    scope?: { scopeMode: 'personal' | 'org_shared'; orgId: string | null },
  ): Promise<void> {
    const existingMeta = existingMetaHint ?? (await this.getIntegrationMetadata(userId))
    const metadata: Record<string, unknown> = {
      ...existingMeta,
      auto_ingest: typeof existingMeta.auto_ingest === 'boolean' ? existingMeta.auto_ingest : true,
      ...(webhookMeta ?? {}),
    }

    // Effective scope: only allow org_shared when an orgId is present, mirrors
    // the constraint in `user_integrations.scope_mode='org_shared'` requiring
    // org_id IS NOT NULL (`integration_scope_modes` migration).
    const scopeMode: 'personal' | 'org_shared' =
      scope?.scopeMode === 'org_shared' && scope.orgId ? 'org_shared' : 'personal'
    const orgId = scopeMode === 'org_shared' ? (scope?.orgId ?? null) : null

    // Fathom = one OAuth account, one webhook secret per user. The repository
    // lookup ignores org_id so scope changes update the same row in place.
    await this.repo.upsertConnection(userId, tokens, metadata, { scopeMode, orgId })
  }

  private async updateTokens(userId: string, tokens: FathomOAuthTokenResponse): Promise<void> {
    await this.repo.updateTokens(userId, tokens)
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<FathomUserIntegration | null> {
    return this.repo.getConnectedIntegration(supabase, userId)
  }

  private async getIntegrationMetadata(userId: string): Promise<Record<string, unknown>> {
    return this.repo.getIntegrationMetadata(userId)
  }

  private parseAutoIngestSettings(meta: Record<string, unknown>): FathomAutoIngestSettings {
    const billingScope = meta.auto_ingest_billing_scope === 'org' ? 'org' : 'personal'
    const billingOrgId =
      billingScope === 'org' && typeof meta.auto_ingest_billing_org_id === 'string'
        ? meta.auto_ingest_billing_org_id
        : null
    return {
      autoIngest: meta.auto_ingest !== false,
      billingScope,
      billingOrgId,
    }
  }

  private async assertCanUseOrgBilling(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<void> {
    if (!orgId) throw new BadRequestException('billingOrgId is required for org billing')
    const { data, error } = await this.repo.findActiveOrgMember(supabase, userId, orgId)
    if (error) throw new BadRequestException(`Failed to validate org billing: ${error.message}`)
    const role = String(data?.role ?? '')
    if (!FATHOM_ORG_BILLING_ROLES.includes(role as (typeof FATHOM_ORG_BILLING_ROLES)[number])) {
      throw new BadRequestException('Not authorized to charge this organization')
    }
  }

  private getAdminClient() {
    const url = this.config.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL || ''
    const serviceKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    if (!url || !serviceKey) {
      throw new BadRequestException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return this.repo.getServiceClient()
  }
}
