import { createHmac } from 'crypto'
import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ensureMeetingsSpaceForScope } from '../../../meetings/intake/services/meetings-space-bootstrap'
import {
  buildMeetingWebhookPath,
  generateWebhookKey,
  readWebhookKey,
} from '../../../meetings/providers/webhook-key'
import { SpaceTemplatesService } from '../../../space-templates/services/space-templates.service'
import { MeetingsPrecallPrepService } from '../../../spaces/services/meetings-precall-prep.service'
import { SpaceAutomationService } from '../../../spaces/services/space-automation.service'
import type { UpdateFathomAgendaExclusionDto } from '../dto/fathom.dto'
import { FathomIntegration } from '../integrations/fathom.integration'
import { FathomRepository } from '../repositories/fathom.repository'
import type { FathomOAuthTokenResponse, FathomUserIntegration } from '../types/fathom.types'
import {
  AGENDA_EXCLUSIONS_PREFERENCE_KEY,
  readFathomAgendaExclusions,
  updateFathomAgendaExclusions,
} from './fathom-agenda-exclusions'

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
const FATHOM_DISCONNECT_REASON = 'The Fathom account that fed this automation was disconnected.'
// Team plans: include shared team recordings so Meetings can label Personal vs Team.
// my_recordings alone only delivers the connecting user's hosted calls.
const FATHOM_WEBHOOK_TRIGGERS = [
  'my_recordings',
  'shared_team_recordings',
  'my_shared_with_team_recordings',
] as const

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
    @Optional() private readonly meetingsPrecallPrep?: MeetingsPrecallPrepService,
    @Optional() private readonly spaceTemplates?: SpaceTemplatesService,
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
    const teams = await this.fathom.listTeams(tokens.access_token).catch((err) => {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Fathom account label lookup failed during OAuth callback: ${message}`)
      return []
    })
    if (teams[0]?.name) existingMeta.team_name = teams[0].name
    if (typeof existingMeta.webhook_id === 'string' && existingMeta.webhook_id.trim().length > 0) {
      await this.fathom.deleteWebhook(tokens.access_token, existingMeta.webhook_id).catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Fathom old webhook delete failed during OAuth callback: ${message}`)
      })
    }
    const webhookKey = readWebhookKey(existingMeta) ?? generateWebhookKey()
    const webhook = await this.createSharedDoorWebhook(tokens.access_token, webhookKey)
    const webhookMeta = {
      webhook_secret: webhook.secret,
      webhook_id: webhook.id,
      webhook_key: webhookKey,
      triggered_for: [...FATHOM_WEBHOOK_TRIGGERS],
    }

    await this.upsertUserIntegration(parsedState.userId, tokens, webhookMeta, existingMeta, {
      scopeMode: parsedState.scopeMode ?? 'personal',
      orgId: parsedState.orgId ?? null,
    })

    if (this.spaceAutomation) {
      const admin = this.getAdminClient()
      try {
        const integrationRowId = await this.repo.getLatestIntegrationId(admin, parsedState.userId)
        if (integrationRowId) {
          await this.spaceAutomation.restoreFathomDependentRules(admin, {
            fathomOwnerUserId: parsedState.userId,
            userIntegrationId: String(integrationRowId),
            disabledReason: FATHOM_DISCONNECT_REASON,
          })
        }
      } catch (restoreErr) {
        const message = restoreErr instanceof Error ? restoreErr.message : String(restoreErr)
        this.logger.warn(`Fathom reconnect route restoration failed: ${message}`)
      }
    }

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

  async updateAgendaExclusion(
    supabase: SupabaseClient,
    userId: string,
    input: UpdateFathomAgendaExclusionDto,
  ): Promise<void> {
    const preferences = await this.repo.getRequestProfilePreferences(supabase, userId)
    const exclusions = updateFathomAgendaExclusions(
      readFathomAgendaExclusions(preferences),
      input.event,
      input.minimized,
    )
    await this.repo.updateRequestProfilePreferences(supabase, userId, {
      ...preferences,
      [AGENDA_EXCLUSIONS_PREFERENCE_KEY]: exclusions,
    })
  }

  async listAgendaExclusions(supabase: SupabaseClient, userId: string) {
    const preferences = await this.repo.getRequestProfilePreferences(supabase, userId)
    return readFathomAgendaExclusions(preferences)
  }

  async ensureMeetingsSpace(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<{ id: string; action: 'create' | 'reuse' }> {
    if (!this.meetingsPrecallPrep || !this.spaceTemplates) {
      throw new BadRequestException('Personal Dashboard setup is unavailable')
    }
    const meetingsPrecallPrep = this.meetingsPrecallPrep
    const spaceTemplates = this.spaceTemplates
    try {
      return await ensureMeetingsSpaceForScope({
        supabase,
        scope,
        resolveMeetingsSpaceId: (client, userId, orgId) =>
          meetingsPrecallPrep.resolveMeetingsSpaceId(client, userId, orgId),
        instantiate: (client, createScope, templateKey, options) =>
          spaceTemplates.instantiate(client, createScope, templateKey, options as never),
      })
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new BadRequestException(err instanceof Error ? err.message : String(err))
    }
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
          reason: FATHOM_DISCONNECT_REASON,
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

  /** Fathom posts to the shared meeting door; the key in the path names this connection. */
  private buildWebhookDestination(webhookKey: string): string {
    return `${this.apiUrl.replace(/\/$/, '')}${buildMeetingWebhookPath('fathom', webhookKey)}`
  }

  private async createSharedDoorWebhook(accessToken: string, webhookKey: string) {
    const webhook = await this.fathom.createWebhook(accessToken, {
      destinationUrl: this.buildWebhookDestination(webhookKey),
      triggeredFor: [...FATHOM_WEBHOOK_TRIGGERS],
      includeTranscript: true,
      includeSummary: true,
      includeActionItems: true,
    })
    if (!webhook?.secret || !webhook?.id) {
      throw new BadRequestException('Fathom webhook creation failed: missing webhook id or secret')
    }
    return webhook
  }

  /** Move one connected account's Fathom webhook from the legacy door to the shared door. */
  async reregisterWebhook(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ webhookId: string; destinationUrl: string }> {
    const token = await this.getAccessToken(supabase, userId)
    const meta = await this.repo.getConnectedMetadata(userId)
    const webhookKey = readWebhookKey(meta) ?? generateWebhookKey()
    if (typeof meta.webhook_id === 'string' && meta.webhook_id.trim().length > 0) {
      await this.fathom.deleteWebhook(token, meta.webhook_id).catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Fathom old webhook delete failed during re-registration: ${message}`)
      })
    }
    const webhook = await this.createSharedDoorWebhook(token, webhookKey)
    await this.repo.updateWebhookMetadata(userId, {
      id: webhook.id,
      secret: webhook.secret,
      key: webhookKey,
    })
    return { webhookId: webhook.id, destinationUrl: this.buildWebhookDestination(webhookKey) }
  }

  async reregisterAllWebhooks(): Promise<{
    total: number
    migrated: string[]
    failed: Array<{ userId: string; error: string }>
  }> {
    const admin = this.getAdminClient()
    const rows = await this.repo.listConnectedWebhookRows()
    const migrated: string[] = []
    const failed: Array<{ userId: string; error: string }> = []
    for (const row of rows) {
      const userId = typeof row.user_id === 'string' ? row.user_id : ''
      if (!userId) continue
      try {
        await this.reregisterWebhook(admin, userId)
        migrated.push(userId)
      } catch (err) {
        failed.push({ userId, error: err instanceof Error ? err.message : String(err) })
      }
    }
    return { total: rows.length, migrated, failed }
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
      webhook_key?: string
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
