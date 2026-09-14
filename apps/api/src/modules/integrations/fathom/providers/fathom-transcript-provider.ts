import { Injectable, Logger, Optional, type OnModuleInit } from '@nestjs/common'
import { normalizeFathomMeetingSource } from '../../../meetings/providers/fathom-meeting-source'
import { MeetingProviderRegistry } from '../../../meetings/providers/meeting-provider.registry'
import type {
  IntakeSpaceRoute,
  MeetingListPage,
  ProviderContext,
  TranscriptProvider,
  WebhookHeaders,
  WebhookParseResult,
} from '../../../meetings/providers/transcript-provider.contract'
import type { TranscriptSourceEvent } from '../../../meetings/providers/transcript-source.types'
import { PageGraderMeetingSyncService } from '../../page-grader/services/page-grader-meeting-sync.service'
import { FathomRepository } from '../repositories/fathom.repository'
import {
  matchesFathomAgendaExclusion,
  readFathomAgendaExclusions,
} from '../services/fathom-agenda-exclusions'
import { FathomApiService } from '../services/fathom-api.service'
import { FathomCampaignBrainRouteService } from '../services/fathom-campaign-brain-route.service'
import { captureFathomOwnerAlias } from './fathom-alias-capture'
import { verifyStandardWebhookSignature } from './fathom-webhook-signature'

/**
 * Fathom behind the transcript-provider contract: OAuth account, Standard
 * Webhooks push, REST pull for missing transcript / action items, and the
 * Fathom-only downstream hooks (agenda exclusions, owner alias capture, Page
 * Grader client matching, Campaign Brain routing).
 */
@Injectable()
export class FathomTranscriptProvider implements TranscriptProvider, OnModuleInit {
  private readonly logger = new Logger(FathomTranscriptProvider.name)

  readonly identity = {
    id: 'fathom' as const,
    auth: 'oauth2' as const,
    manifest: { displayName: 'Fathom', personalOnly: true, logoKey: 'fathom' },
  }

  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly api: FathomApiService,
    private readonly repository: FathomRepository,
    private readonly campaignBrainRoute: FathomCampaignBrainRouteService,
    @Optional() private readonly pageGraderMeetings?: PageGraderMeetingSyncService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this)
  }

  readonly push = {
    verify: (input: {
      rawBody: Buffer
      headers: WebhookHeaders
      secret: string
      nowMs?: number
    }): boolean => verifyStandardWebhookSignature(input),

    parse: (rawBody: Buffer, headers: WebhookHeaders): WebhookParseResult | null => {
      let event: Record<string, unknown>
      try {
        const parsed = JSON.parse(rawBody.toString('utf8')) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        event = parsed as Record<string, unknown>
      } catch {
        return null
      }
      const externalId = firstText(event.recording_id, event.id, event.call_id, event.meeting_id)
      if (!externalId) return null
      return {
        externalId,
        deliveryId: headers['webhook-id']?.trim() || null,
        eventType: firstText(event.event_type, event.type) ?? 'recording_ready',
        inlineEvent: event,
      }
    },

    resolveSecret: async (ctx: ProviderContext): Promise<string | null> => {
      const secret = ctx.connection.metadata.webhook_secret
      return typeof secret === 'string' && secret.trim() ? secret.trim() : null
    },
  }

  readonly pull = {
    fetch: async (
      ctx: ProviderContext,
      externalId: string,
      inlineEvent: Record<string, unknown> | null,
    ): Promise<TranscriptSourceEvent> => {
      const event: Record<string, unknown> = { ...(inlineEvent ?? {}) }
      if (!firstText(event.recording_id, event.id, event.call_id, event.meeting_id)) {
        event.recording_id = externalId
      }
      await this.ensureTranscript(ctx, event, externalId)
      await this.ensureActionItems(ctx, event, externalId)
      return this.normalize(event)
    },

    listRecent: async (ctx: ProviderContext, cursor?: string | null): Promise<MeetingListPage> => {
      const page = await this.api.listMeetings(ctx.supabase, ctx.userId, cursor ?? undefined)
      return {
        items: (page.items ?? []).map((meeting) => {
          const row = meeting as unknown as Record<string, unknown>
          return {
            externalId: firstText(row.recording_id, row.id, row.call_id) ?? '',
            title:
              firstText(row.canonical_title, row.title, row.meeting_title) ?? 'Untitled Meeting',
            startedAt: firstText(
              row.recording_start_time,
              row.scheduled_start_time,
              row.created_at,
            ),
            url: firstText(row.url, row.share_url),
            raw: row,
          }
        }),
        nextCursor: page.next_cursor ?? null,
      }
    },
  }

  normalize(raw: Record<string, unknown>): TranscriptSourceEvent {
    return normalizeFathomMeetingSource(raw)
  }

  readonly hooks = {
    beforeIntake: async (
      ctx: ProviderContext,
      input: { source: TranscriptSourceEvent },
    ): Promise<{ proceed: boolean; reason?: string }> => {
      const preferences = await this.repository.getProfilePreferences(ctx.userId)
      if (matchesFathomAgendaExclusion(readFathomAgendaExclusions(preferences), input.source.raw)) {
        return { proceed: false, reason: 'agenda_occurrence_minimized' }
      }
      try {
        await captureFathomOwnerAlias(
          this.repository,
          ctx.userId,
          input.source.raw.recorded_by as { email?: unknown; name?: unknown } | undefined,
        )
      } catch (err) {
        this.logger.warn(`Fathom alias capture skipped: ${errorMessage(err)}`)
      }
      return { proceed: true }
    },

    afterSpaceRoute: async (
      ctx: ProviderContext,
      input: {
        source: TranscriptSourceEvent
        spaceRoute: IntakeSpaceRoute
        hasTranscript: boolean
      },
    ): Promise<void> => {
      const event = input.source.raw
      const pageGraderSync = await this.syncPageGrader(ctx, event, input.spaceRoute)
      if (!input.hasTranscript) return
      // Primary: Portal-matched clients → client_scope_map campaign brains.
      // Fallback: Space route campaign (often General in the one-room model).
      await this.campaignBrainRoute.routeAfterPageGraderSync({
        supabase: ctx.supabase,
        userId: ctx.userId,
        orgId: ctx.orgId,
        event,
        spaceRoute: input.spaceRoute as Parameters<
          FathomCampaignBrainRouteService['routeAfterPageGraderSync']
        >[0]['spaceRoute'],
        matchedClients: pageGraderSync?.matched_clients ?? [],
      })
    },
  }

  /**
   * Shared-team webhooks often arrive without `transcript` even when
   * include_transcript=true. Fetch via API when possible.
   */
  private async ensureTranscript(
    ctx: ProviderContext,
    event: Record<string, unknown>,
    recordingId: string,
  ): Promise<void> {
    if (Array.isArray(event.transcript) && event.transcript.length > 0) return
    try {
      const result = await this.api.getRecordingTranscript(ctx.supabase, ctx.userId, recordingId)
      const fetched = Array.isArray(result?.transcript) ? result.transcript : []
      if (fetched.length > 0) event.transcript = fetched
    } catch (err) {
      this.logger.warn(`Transcript fetch failed for recording ${recordingId}: ${errorMessage(err)}`)
    }
  }

  /**
   * Webhooks often arrive before action_items are filled — one list refetch.
   * Do not invent actions from transcript if still empty.
   */
  private async ensureActionItems(
    ctx: ProviderContext,
    event: Record<string, unknown>,
    recordingId: string,
  ): Promise<void> {
    if (Array.isArray(event.action_items) && event.action_items.length > 0) return
    try {
      const page = await this.api.listMeetings(ctx.supabase, ctx.userId)
      const match = (page.items ?? []).find((row) => {
        const ids = [row.recording_id, row.id, row.call_id]
          .filter((value) => value != null && value !== '')
          .map((value) => String(value))
        return ids.includes(recordingId)
      })
      const fetched = Array.isArray(match?.action_items) ? match.action_items : []
      if (fetched.length > 0) event.action_items = fetched
    } catch (err) {
      this.logger.warn(
        `Action-items refetch failed for recording ${recordingId}: ${errorMessage(err)}`,
      )
    }
  }

  private async syncPageGrader(
    ctx: ProviderContext,
    event: Record<string, unknown>,
    spaceRoute: IntakeSpaceRoute,
  ): Promise<{ matched_clients: Array<{ id: string; name: string; matched_by: string }> } | null> {
    if (!this.pageGraderMeetings) return null
    // A recording lands on exactly one canonical Space route, so the automation
    // result carries a single space_id/item_id pointer instead of a fan-out array.
    const spaceId = String(spaceRoute?.space_id ?? '')
    const itemId = String(spaceRoute?.item_id ?? '')
    const routes = spaceId && itemId ? [{ space_id: spaceId, item_id: itemId }] : []
    try {
      return await this.pageGraderMeetings.syncFathomMeeting({
        supabase: ctx.supabase,
        userId: ctx.userId,
        event,
        routes,
      })
    } catch (err) {
      this.logger.warn(`Page Grader meeting sync skipped: ${errorMessage(err)}`)
      return null
    }
  }
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
