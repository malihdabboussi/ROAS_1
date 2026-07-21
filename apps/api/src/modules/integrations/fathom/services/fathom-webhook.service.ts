import { Injectable, Logger } from '@nestjs/common'
import { buildInteractionDedupeKey, CUSTOMER_INTERACTION_ROUTE_EVENT } from '@vibey/api-shared'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { CustomerBrainService } from '../../../brain/services/customer-brain.service'
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

    const title = ((event as any).title ||
      (event as any).meeting_title ||
      'Untitled Meeting') as string
    const meetingId = String(
      (event as any).id ||
        (event as any).recording_id ||
        (event as any).call_id ||
        `fathom-${Date.now()}`,
    )

    const hasTranscript = await this.ensureTranscriptOnEvent(userId, event, meetingId)
    if (hasTranscript) {
      const transcript = event.transcript as unknown[]
      this.logger.warn(
        `[FATHOM-DEBUG] Transcript entries: ${transcript.length}, first entry sample: ${JSON.stringify(transcript[0]).slice(0, 200)}`,
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
      await this.enqueueCustomerBrainRoute(userId, event, meetingId, autoIngestSettings)
    } else {
      this.logger.warn(
        `[FATHOM-DEBUG] No transcript for meetingId=${meetingId} title=${title}; continuing Meetings space route without brain import`,
      )
    }

    // Only learn owner alternate emails — never absorb teammate recorded_by hosts
    // (shared_team_recordings), or every Team call would be labeled Personal.
    await this.captureFathomAlias(userId, (event as any).recorded_by)
    // Meetings call rows must still land for shared_team recordings even when
    // Fathom omits transcript from the webhook body (Slack follow-up is downstream).
    await this.processSpaceAutomationRoute(userId, event)
  }

  private readTranscriptEntries(event: Record<string, unknown>): Array<{
    speaker?: { display_name?: string; name?: string }
    text?: string
    timestamp?: string
  }> | null {
    const transcript = event.transcript
    if (!Array.isArray(transcript) || transcript.length === 0) return null
    return transcript as Array<{
      speaker?: { display_name?: string; name?: string }
      text?: string
      timestamp?: string
    }>
  }

  private resolveRecordingId(event: Record<string, unknown>, meetingId: string): string | null {
    const raw =
      (event as any).recording_id ?? (event as any).id ?? (event as any).call_id ?? meetingId
    if (raw == null || raw === '') return null
    return String(raw)
  }

  /**
   * Shared-team webhooks often arrive without `transcript` even when
   * include_transcript=true. Fetch via API when possible; return whether the
   * event now has a non-empty transcript array.
   */
  private async ensureTranscriptOnEvent(
    userId: string,
    event: Record<string, unknown>,
    meetingId: string,
  ): Promise<boolean> {
    if (this.readTranscriptEntries(event)) return true

    const recordingId = this.resolveRecordingId(event, meetingId)
    if (!recordingId) {
      this.logger.warn(
        `[FATHOM-DEBUG] No transcript in payload and no recording id to fetch (meetingId=${meetingId})`,
      )
      return false
    }

    this.logger.warn(
      `[FATHOM-DEBUG] Payload missing transcript; fetching recording ${recordingId} via Fathom API`,
    )
    try {
      const admin = this.repository.getServiceClient()
      const result = await this.api.getRecordingTranscript(admin, userId, recordingId)
      const fetched = Array.isArray(result?.transcript) ? result.transcript : []
      if (fetched.length === 0) {
        this.logger.warn(
          `[FATHOM-DEBUG] Fathom API returned empty transcript for recording ${recordingId}`,
        )
        return false
      }
      event.transcript = fetched
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(
        `[FATHOM-DEBUG] Transcript fetch failed for recording ${recordingId}: ${msg}`,
      )
      return false
    }
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

  private async captureFathomAlias(
    userId: string,
    recordedBy: { email?: unknown; name?: unknown } | null | undefined,
  ): Promise<void> {
    const normalized =
      typeof recordedBy?.email === 'string' ? recordedBy.email.trim().toLowerCase() : ''
    if (!normalized || !normalized.includes('@')) return
    const existing = await this.repository.getFathomAliases(userId)
    if (existing.includes(normalized)) return

    const profile = await this.repository.getProfileIdentity(userId)
    const ownerEmails = [profile?.email, ...existing]
      .filter((e): e is string => typeof e === 'string' && e.includes('@'))
      .map((e) => e.trim().toLowerCase())
    const ownerHints = new Set<string>()
    for (const email of ownerEmails) {
      const local = email.split('@')[0] ?? ''
      for (const part of local.split(/[._+-]/)) {
        if (part.length >= 4) ownerHints.add(part)
      }
    }
    for (const token of String(profile?.full_name ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4)) {
      ownerHints.add(token)
    }

    const local = normalized.split('@')[0] ?? ''
    const recordedName = String(recordedBy?.name ?? '').toLowerCase()
    const looksLikeOwner = [...ownerHints].some(
      (hint) => local.includes(hint) || recordedName.includes(hint),
    )
    if (!looksLikeOwner) {
      this.logger.warn(
        `[FATHOM-DEBUG] Skipping Fathom alias capture for non-owner host ${normalized}`,
      )
      return
    }

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
