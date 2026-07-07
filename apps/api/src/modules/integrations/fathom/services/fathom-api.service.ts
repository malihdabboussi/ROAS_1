import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FathomIntegration } from '../integrations/fathom.integration'
import { FathomRepository } from '../repositories/fathom.repository'
import type { FathomMeetingList, FathomWebhook } from '../types/fathom.types'
import { FathomOAuthService, type FathomAutoIngestSettings } from './fathom-oauth.service'

const FATHOM_ORG_BILLING_ROLES = ['owner', 'admin', 'creator', 'editor'] as const

@Injectable()
export class FathomApiService {
  private readonly logger = new Logger(FathomApiService.name)

  constructor(
    private readonly fathom: FathomIntegration,
    private readonly oauth: FathomOAuthService,
    private readonly repo: FathomRepository,
  ) {}

  async listMeetings(
    supabase: SupabaseClient,
    userId: string,
    cursor?: string,
  ): Promise<FathomMeetingList> {
    let token = await this.oauth.getAccessToken(supabase, userId)
    try {
      return await this.fathom.listMeetings(token, cursor)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') && err instanceof BadRequestException) {
        token = await this.oauth.forceRefreshAndGetToken(supabase, userId)
        return this.fathom.listMeetings(token, cursor)
      }
      throw err
    }
  }

  async getRecordingTranscript(
    supabase: SupabaseClient,
    userId: string,
    recordingId: string | number,
  ): Promise<{
    transcript: Array<{ speaker?: { display_name?: string }; text?: string; timestamp?: string }>
  }> {
    let token = await this.oauth.getAccessToken(supabase, userId)
    try {
      return await this.fathom.getRecordingTranscript(token, recordingId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') && err instanceof BadRequestException) {
        token = await this.oauth.forceRefreshAndGetToken(supabase, userId)
        return this.fathom.getRecordingTranscript(token, recordingId)
      }
      throw err
    }
  }

  async getRecordingSummary(
    supabase: SupabaseClient,
    userId: string,
    recordingId: string | number,
  ): Promise<{
    summary: { template_name?: string; markdown_formatted?: string } | null
  }> {
    let token = await this.oauth.getAccessToken(supabase, userId)
    try {
      return await this.fathom.getRecordingSummary(token, recordingId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') && err instanceof BadRequestException) {
        token = await this.oauth.forceRefreshAndGetToken(supabase, userId)
        return this.fathom.getRecordingSummary(token, recordingId)
      }
      throw err
    }
  }

  async createWebhook(
    supabase: SupabaseClient,
    userId: string,
    opts: {
      destinationUrl: string
      triggeredFor: string[]
      includeTranscript?: boolean
      includeSummary?: boolean
      includeActionItems?: boolean
      includeCrmMatches?: boolean
    },
  ): Promise<FathomWebhook> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    const webhook = await this.fathom.createWebhook(token, opts)
    await this.repo.updateWebhookMetadata(userId, webhook)

    return webhook
  }

  async getAutoIngest(userId: string): Promise<boolean> {
    const settings = await this.getAutoIngestSettings(userId)
    return settings.autoIngest
  }

  async getAutoIngestSettings(userId: string): Promise<FathomAutoIngestSettings> {
    const meta = await this.repo.getConnectedMetadata(userId)
    const billingScope = meta.auto_ingest_billing_scope === 'org' ? 'org' : 'personal'
    const billingOrgId =
      billingScope === 'org' && typeof meta.auto_ingest_billing_org_id === 'string'
        ? meta.auto_ingest_billing_org_id
        : null
    if (billingScope === 'org') {
      await this.assertCanUseOrgBilling(userId, billingOrgId)
    }
    return {
      autoIngest: meta.auto_ingest !== false,
      billingScope,
      billingOrgId,
    }
  }

  async resolveUserByWebhookSecret(secret: string): Promise<string | null> {
    const data = await this.repo.listConnectedWebhookRows()

    this.logger.warn(
      `[FATHOM-DEBUG] resolveUserByWebhookSecret: Found ${data.length} rows, error=none`,
    )
    const matches: string[] = []
    for (const row of data) {
      const meta = (row.metadata as Record<string, unknown>) ?? {}
      const storedSecret = meta.webhook_secret as string | undefined
      if (storedSecret === secret) matches.push(row.user_id as string)
    }
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) {
      this.logger.error(
        `[FATHOM-DEBUG] Non-unique Fathom webhook secret matched ${matches.length} users; refusing to resolve owner`,
      )
    }
    return null
  }

  async listWebhooks(supabase: SupabaseClient, userId: string): Promise<FathomWebhook[]> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.fathom.listWebhooks(token)
  }

  async deleteWebhook(supabase: SupabaseClient, userId: string, webhookId: string): Promise<void> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.fathom.deleteWebhook(token, webhookId)
  }

  private async assertCanUseOrgBilling(userId: string, orgId: string | null): Promise<void> {
    if (!orgId) throw new Error('Fathom org billing is missing org id')
    const { data, error } = await this.repo.findActiveOrgMember(
      this.repo.getServiceClient(),
      userId,
      orgId,
    )
    if (error) throw new Error(`Fathom org billing validation failed: ${error.message}`)
    const role = String(data?.role ?? '')
    if (!FATHOM_ORG_BILLING_ROLES.includes(role as (typeof FATHOM_ORG_BILLING_ROLES)[number])) {
      throw new Error('Fathom org billing is not authorized for this user')
    }
  }
}
