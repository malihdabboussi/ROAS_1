import { Injectable, Logger } from '@nestjs/common'
import { buildInteractionDedupeKey, CUSTOMER_INTERACTION_ROUTE_EVENT } from '@vibey/api-shared'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { CustomerBrainService } from '../../../brain/services/customer-brain.service'
import { SpaceAutomationService } from '../../../spaces/services/space-automation.service'
import { PageGraderMeetingSyncService } from '../../page-grader/services/page-grader-meeting-sync.service'
import { FathomRepository } from '../repositories/fathom.repository'
import {
  matchesFathomAgendaExclusion,
  readFathomAgendaExclusions,
} from './fathom-agenda-exclusions'
import { FathomApiService } from './fathom-api.service'
import { FathomCampaignBrainRouteService } from './fathom-campaign-brain-route.service'
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
    private readonly campaignBrainRoute: FathomCampaignBrainRouteService,
    private readonly pageGraderMeetings?: PageGraderMeetingSyncService,
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

    const agendaPreferences = await this.repository.getProfilePreferences(userId)
    if (matchesFathomAgendaExclusion(readFathomAgendaExclusions(agendaPreferences), event)) {
      this.logger.log('[FATHOM-DEBUG] STOPPED: agenda occurrence is minimized')
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
    // Webhooks often arrive before action_items are filled — one list refetch.
    await this.ensureActionItemsOnEvent(userId, event, meetingId)
    // Meetings call rows must still land for shared_team recordings even when
    // Fathom omits transcript from the webhook body (Slack follow-up is downstream).
    const spaceRoute = await this.processSpaceAutomationRoute(userId, event)
    if (hasTranscript) {
      // Same meeting, client's campaign brain — deterministic from the Space route.
      await this.campaignBrainRoute.enqueueForRoute({
        supabase: this.repository.getServiceClient(),
        userId,
        orgId: autoIngestSettings.billingScope === 'org' ? autoIngestSettings.billingOrgId : null,
        event,
        spaceRoute,
      })
    }
    await this.processPageGraderMeetingRoute(userId, event, spaceRoute)
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
  /**
   * When the webhook payload has no action_items, pull the meeting once from
   * Fathom list API. Do not invent actions from transcript if still empty.
   */
  private async ensureActionItemsOnEvent(
    userId: string,
    event: Record<string, unknown>,
    meetingId: string,
  ): Promise<void> {
    const existing = Array.isArray(event.action_items) ? event.action_items : []
    if (existing.length > 0) return

    const recordingId = this.resolveRecordingId(event, meetingId)
    if (!recordingId) return

    try {
      const admin = this.repository.getServiceClient()
      const page = await this.api.listMeetings(admin, userId)
      const match = (page.items ?? []).find((row) => {
        const ids = [row.recording_id, row.id, row.call_id]
          .filter((value) => value != null && value !== '')
          .map((value) => String(value))
        return ids.includes(recordingId) || ids.includes(meetingId)
      })
      const fetched = Array.isArray(match?.action_items) ? match.action_items : []
      if (fetched.length === 0) {
        this.logger.warn(
          `[FATHOM-DEBUG] Action-items refetch still empty for recording ${recordingId}`,
        )
        return
      }
      event.action_items = fetched
      this.logger.warn(
        `[FATHOM-DEBUG] Action-items refetch filled ${fetched.length} items for recording ${recordingId}`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(
        `[FATHOM-DEBUG] Action-items refetch failed for recording ${recordingId}: ${msg}`,
      )
    }
  }

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
  ): Promise<Record<string, unknown> | null> {
    try {
      const admin = this.repository.getServiceClient()
      const result = await this.spaceAutomation.processFathomRecordingEvent(admin, userId, event)
      this.logger.warn(`[FATHOM-DEBUG] Space automation route result: ${JSON.stringify(result)}`)
      return result as Record<string, unknown>
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[FATHOM-DEBUG] Space automation route skipped: ${msg}`)
      return null
    }
  }

  private async processPageGraderMeetingRoute(
    userId: string,
    event: Record<string, unknown>,
    routeResult: Record<string, unknown> | null,
  ): Promise<void> {
    if (!this.pageGraderMeetings) return
    // A Fathom recording now lands on exactly one canonical Space route, so the
    // automation result carries a single space_id/item_id pointer instead of a
    // fan-out array.
    const spaceId = String(routeResult?.space_id ?? '')
    const itemId = String(routeResult?.item_id ?? '')
    const routes = spaceId && itemId ? [{ space_id: spaceId, item_id: itemId }] : []
    try {
      const result = await this.pageGraderMeetings.syncFathomMeeting({
        supabase: this.repository.getServiceClient(),
        userId,
        event,
        routes,
      })
      this.logger.log(
        `[FATHOM-DEBUG] Page Grader meeting sync: ${JSON.stringify({
          source_meeting_id: result.source_meeting_id,
          matched_clients: result.matched_clients.map((client) => client.name),
          synced: result.synced,
          unchanged: result.unchanged,
          failed: result.failed,
          needs_client_mapping: result.needs_client_mapping,
        })}`,
      )
    } catch (error) {
      this.logger.warn(
        `[FATHOM-DEBUG] Page Grader meeting sync skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
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
    const { data, error } = await this.repository.listConnectedIntegrationUserIds()

    this.logger.warn(
      `[FATHOM-DEBUG] resolveUserFromPayload: Found ${data?.length ?? 0} connected fathom integrations, error=${error?.message ?? 'none'}`,
    )

    if (!data || data.length === 0) return null

    const userIds = data.map((row) => row.user_id as string).filter(Boolean)
    const profiles = await this.repository.listProfilesForUserIds(userIds)
    const userIdByEmail = new Map<string, string>()
    for (const profile of profiles ?? []) {
      const row = profile as { id?: string; email?: string | null; fathom_aliases?: string[] }
      if (!row.id) continue
      const profileEmail = row.email?.trim().toLowerCase()
      if (profileEmail) userIdByEmail.set(profileEmail, row.id)
      const aliases = Array.isArray(row.fathom_aliases) ? row.fathom_aliases : []
      for (const alias of aliases) {
        const normalized = String(alias ?? '')
          .trim()
          .toLowerCase()
        if (normalized) userIdByEmail.set(normalized, row.id)
      }
    }

    const recordedByEmail = this.normalizeEmail((event as any).recorded_by?.email)
    this.logger.warn(
      `[FATHOM-DEBUG] resolveUserFromPayload: recorded_by.email=${recordedByEmail ?? 'N/A'}`,
    )
    if (recordedByEmail) {
      const ownerMatch = userIdByEmail.get(recordedByEmail)
      if (ownerMatch) return ownerMatch
    }

    // Shared-team webhooks often omit the signature. Attribute via invitees /
    // shared_with so teammate-hosted calls still land for connected attendees.
    const participantEmails = this.collectParticipantEmails(event)
    for (const email of participantEmails) {
      const matched = userIdByEmail.get(email)
      if (matched) {
        this.logger.warn(
          `[FATHOM-DEBUG] resolveUserFromPayload: matched connected user via participant ${email}`,
        )
        return matched
      }
    }

    // Last resort for unsigned shared_team deliveries: if exactly one connected
    // account subscribed to shared_team_recordings, that account owns the webhook.
    const sharedTeamOwners = await this.listSharedTeamRecordingOwnerUserIds()
    if (sharedTeamOwners.length === 1) {
      this.logger.warn(
        `[FATHOM-DEBUG] resolveUserFromPayload: attributed unsigned shared-team event to sole subscriber ${sharedTeamOwners[0]}`,
      )
      return sharedTeamOwners[0]
    }

    this.logger.warn(
      `[FATHOM-DEBUG] resolveUserFromPayload: No owner/participant/shared-team match; refusing fallback`,
    )
    return null
  }

  private normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return normalized.includes('@') ? normalized : null
  }

  private collectParticipantEmails(event: Record<string, unknown>): string[] {
    const emails = new Set<string>()
    const push = (value: unknown) => {
      if (typeof value === 'string') {
        const email = this.normalizeEmail(value)
        if (email) emails.add(email)
        return
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return
      const row = value as Record<string, unknown>
      const email = this.normalizeEmail(row.email ?? row.mail ?? row.address)
      if (email) emails.add(email)
    }

    for (const key of ['calendar_invitees', 'shared_with', 'invitees', 'attendees'] as const) {
      const list = event[key]
      if (!Array.isArray(list)) continue
      for (const entry of list) push(entry)
    }
    return [...emails]
  }

  private async listSharedTeamRecordingOwnerUserIds(): Promise<string[]> {
    const rows = await this.repository.listConnectedWebhookRows()
    const owners: string[] = []
    for (const row of rows) {
      const userId = typeof row.user_id === 'string' ? row.user_id : ''
      if (!userId) continue
      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const triggeredFor = Array.isArray(metadata.triggered_for)
        ? metadata.triggered_for.map((entry) => String(entry))
        : Array.isArray(metadata.webhook_triggered_for)
          ? metadata.webhook_triggered_for.map((entry) => String(entry))
          : []
      if (triggeredFor.includes('shared_team_recordings')) owners.push(userId)
    }
    return [...new Set(owners)]
  }
}
