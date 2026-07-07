import { Injectable, Logger } from '@nestjs/common'
import {
  buildInteractionDedupeKey,
  CUSTOMER_INTERACTION_ROUTE_EVENT,
} from '@vibey/api-shared'
import { CustomerBrainService } from '../../../brain/services/customer-brain.service'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { SpaceAutomationService } from '../../../spaces/services/space-automation.service'
import { FathomRepository } from '../repositories/fathom.repository'
import { FathomApiService } from './fathom-api.service'
import { buildFathomEnvelope } from './fathom-envelope.adapter'
import type { FathomAutoIngestSettings } from './fathom-oauth.service'

@Injectable()
export class FathomWebhookService {
  private readonly logger = new Logger(FathomWebhookService.name)

  constructor(
    private readonly api: FathomApiService,
    private readonly importJobs: BrainImportJobsService,
    private readonly customerBrain: CustomerBrainService,
    private readonly spaceAutomation: SpaceAutomationService,
    private readonly repository: FathomRepository,
  ) {}

  async processWebhookAsync(rawBody: string, signature: string): Promise<void> {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      this.logger.warn('[FATHOM-DEBUG] Invalid JSON body')
      return
    }

    const topLevelKeys = Object.keys(event)
    this.logger.warn(`[FATHOM-DEBUG] Payload top-level keys: [${topLevelKeys.join(', ')}]`)
    this.logger.warn(
      `[FATHOM-DEBUG] event_type=${(event as any).event_type}, type=${(event as any).type}`,
    )
    this.logger.warn(
      `[FATHOM-DEBUG] Has transcript: ${Array.isArray((event as any).transcript)}, transcript length: ${Array.isArray((event as any).transcript) ? (event as any).transcript.length : 'N/A'}`,
    )
    this.logger.warn(
      `[FATHOM-DEBUG] Has recorded_by: ${!!(event as any).recorded_by}, recorded_by.email: ${(event as any).recorded_by?.email ?? 'N/A'}`,
    )
    this.logger.warn(
      `[FATHOM-DEBUG] title=${(event as any).title}, meeting_title=${(event as any).meeting_title}`,
    )
    this.logger.warn(
      `[FATHOM-DEBUG] id=${(event as any).id}, recording_id=${(event as any).recording_id}, call_id=${(event as any).call_id}`,
    )
    this.logger.warn(
      `[FATHOM-DEBUG] Signature value (first 20 chars): ${signature ? signature.slice(0, 20) + '...' : '***empty***'}`,
    )

    let userId: string | null = null
    if (signature) {
      userId = await this.api.resolveUserByWebhookSecret(signature)
      this.logger.warn(`[FATHOM-DEBUG] resolveUserByWebhookSecret result: ${userId ?? 'null'}`)
    } else {
      this.logger.warn('[FATHOM-DEBUG] No signature header, skipping secret resolution')
    }
    if (!userId) {
      this.logger.warn('[FATHOM-DEBUG] Secret resolution failed, trying payload resolution...')
      userId = await this.resolveUserFromPayload(event)
      this.logger.warn(`[FATHOM-DEBUG] resolveUserFromPayload result: ${userId ?? 'null'}`)
    }
    if (!userId) {
      this.logger.error(
        '[FATHOM-DEBUG] FAILED: Could not resolve user from signature OR payload. Dropping webhook.',
      )
      return
    }

    this.logger.warn(`[FATHOM-DEBUG] Resolved userId: ${userId}`)

    const autoIngestSettings = await this.api.getAutoIngestSettings(userId)
    this.logger.warn(
      `[FATHOM-DEBUG] autoIngest=${autoIngestSettings.autoIngest}, billingScope=${autoIngestSettings.billingScope}, billingOrgId=${autoIngestSettings.billingOrgId ?? 'null'}`,
    )
    if (!autoIngestSettings.autoIngest) {
      this.logger.warn('[FATHOM-DEBUG] STOPPED: auto-ingest disabled')
      return
    }

    const transcript = (event as any).transcript as
      | Array<{
          speaker?: { display_name?: string; name?: string }
          text?: string
          timestamp?: string
        }>
      | undefined
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      this.logger.error(
        `[FATHOM-DEBUG] FAILED: No transcript in payload. transcript field type: ${typeof (event as any).transcript}, value: ${JSON.stringify((event as any).transcript)?.slice(0, 200)}`,
      )
      return
    }

    this.logger.warn(
      `[FATHOM-DEBUG] Transcript entries: ${transcript.length}, first entry sample: ${JSON.stringify(transcript[0]).slice(0, 200)}`,
    )

    const title = ((event as any).title ||
      (event as any).meeting_title ||
      'Untitled Meeting') as string
    const meetingId = String(
      (event as any).id ||
        (event as any).recording_id ||
        (event as any).call_id ||
        `fathom-${Date.now()}`,
    )

    this.logger.warn(`[FATHOM-DEBUG] Resolved meetingId=${meetingId}, title=${title}`)
    this.logger.warn(`[FATHOM-DEBUG] Queueing fathom import for meetingId=${meetingId}`)

    try {
      const queued = await this.importJobs.enqueueFathomMeetingImport(
        userId,
        event,
        autoIngestSettings.billingScope === 'org' ? autoIngestSettings.billingOrgId : null,
      )
      this.logger.warn(`[FATHOM-DEBUG] Queued fathom import job=${queued.jobId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : ''
      this.logger.error(`[FATHOM-DEBUG] Queue enqueue THREW: ${msg}`, stack)
    }

    await this.captureFathomAlias(userId, (event as any).recorded_by?.email)
    await this.enqueueCustomerBrainRoute(userId, event, meetingId, autoIngestSettings)
    await this.processSpaceAutomationRoute(userId, event)
  }

  private async processSpaceAutomationRoute(
    userId: string,
    event: Record<string, unknown>,
  ): Promise<void> {
    try {
      const admin = this.repository.getServiceClient()
      const result = await this.spaceAutomation.processFathomRecordingEvent(admin, userId, event)
      this.logger.warn(`[FATHOM-DEBUG] Space automation route result: ${JSON.stringify(result)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[FATHOM-DEBUG] Space automation route skipped: ${msg}`)
    }
  }

  private async captureFathomAlias(userId: string, email: unknown): Promise<void> {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!normalized) return
    const existing = await this.repository.getFathomAliases(userId)
    if (existing.includes(normalized)) return
    const next = [...existing, normalized]
    const error = await this.repository.updateFathomAliases(userId, next)
    if (error) this.logger.warn(`[FATHOM-DEBUG] Failed to persist Fathom alias: ${error.message}`)
  }

  private async enqueueCustomerBrainRoute(
    userId: string,
    event: Record<string, unknown>,
    meetingId: string,
    autoIngestSettings: FathomAutoIngestSettings,
  ): Promise<void> {
    try {
      const envelope = buildFathomEnvelope(event, meetingId)
      if (!envelope) {
        this.logger.warn(
          `[FATHOM-DEBUG] No envelope built for meeting ${meetingId} (no transcript), skipping customer route`,
        )
        return
      }
      const routingOrgId =
        autoIngestSettings.billingScope === 'org' ? autoIngestSettings.billingOrgId : null
      const customerBrains = await this.customerBrain.listEnabledCustomerBrainsForRouting(userId, {
        orgId: routingOrgId,
      })
      if (customerBrains.length === 0) return
      const rows = customerBrains.map((brain) => ({
        brain_id: brain.id,
        user_id: userId,
        org_id: brain.org_id ?? null,
        event_type: CUSTOMER_INTERACTION_ROUTE_EVENT,
        dedupe_key: buildInteractionDedupeKey(brain.id, meetingId, meetingId),
        payload: {
          source: 'fathom_webhook',
          routing_scope: autoIngestSettings.billingScope,
          routing_org_id: routingOrgId,
          meeting_id: meetingId,
          envelope,
        },
      }))
      const error = await this.repository.enqueueBrainOpsOutboxRows(rows)
      if (error) {
        this.logger.warn(
          `[FATHOM-DEBUG] Failed to enqueue customer interaction route: ${error.message}`,
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[FATHOM-DEBUG] Customer interaction route enqueue skipped: ${msg}`)
    }
  }

  async resolveUserFromPayload(event: Record<string, unknown>): Promise<string | null> {
    const email = (event as any).recorded_by?.email as string | undefined
    this.logger.warn(`[FATHOM-DEBUG] resolveUserFromPayload: recorded_by.email=${email ?? 'N/A'}`)
    if (!email) {
      this.logger.warn(
        `[FATHOM-DEBUG] resolveUserFromPayload: No email in payload. recorded_by=${JSON.stringify((event as any).recorded_by)?.slice(0, 200)}`,
      )
      return null
    }

    const { data, error } = await this.repository.listConnectedIntegrationUserIds()

    this.logger.warn(
      `[FATHOM-DEBUG] resolveUserFromPayload: Found ${data?.length ?? 0} connected fathom integrations, error=${error?.message ?? 'none'}`,
    )

    if (!data || data.length === 0) return null

    const userIds = data.map((row) => row.user_id as string).filter(Boolean)
    const profiles = await this.repository.listProfilesForUserIds(userIds)

    for (const profile of profiles ?? []) {
      const row = profile as { id?: string; email?: string | null; fathom_aliases?: string[] }
      const profileEmail = row.email?.trim().toLowerCase()
      const aliases = Array.isArray(row.fathom_aliases)
        ? row.fathom_aliases.map((alias) => alias.trim().toLowerCase())
        : []
      if (profileEmail === email.toLowerCase() || aliases.includes(email.toLowerCase())) {
        return row.id ?? null
      }
    }

    this.logger.warn(
      `[FATHOM-DEBUG] resolveUserFromPayload: No exact owner email/alias match; refusing fallback`,
    )
    return null
  }
}
