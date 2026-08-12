import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import type { RequestScope } from '@vibey/api-shared'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { SpacesRepository } from '../repositories/spaces.repository'
import { MeetingsPrecallDriveAgendaService } from './meetings-precall-drive-agenda.service'
import {
  assignRelatedCallsExclusive,
  assignSoleNearStartRelatedCalls,
  buildMeetingAgendaEvent,
  buildPrecallPrompt,
  buildRelatedCallCandidates,
  callDateInAgendaWindow,
  eventFromPrecallSnapshot,
  isEligiblePrecallEvent,
  localDayBounds,
  localDayWindowAround,
  mapPrepItemToAgendaLink,
  resolvePreferredMeetingsSpaceId,
  toAgendaFollowUp,
  toAgendaRelatedCall,
  type AgendaPrepLink,
  type AgendaRelatedCall,
  type PrecallAgendaEventLike,
  type PrecallEventSnapshot,
} from './meetings-precall-prep.helpers'
import { loadPrecallRelatedContext } from './meetings-precall-related-context'

const RELATED_CALL_MATCH_PAD_MS = 36 * 60 * 60 * 1000

type CalendarAgendaEvent = PrecallAgendaEventLike & {
  html_link?: string | null
  color_id?: string | null
  source?: string
}

type CalendarServiceLike = {
  getAgenda: (
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    query: { start: string; end: string; timezone?: string },
  ) => Promise<{ events: CalendarAgendaEvent[]; connected: Record<string, boolean> }>
}

export type PrecallPrepRunResult = {
  space_id: string
  day_key: string
  created: number
  refreshed: number
  skipped: number
  failed: number
  items: Array<{
    calendar_event_id: string
    space_item_id: string
    title: string
    status: 'pending' | 'ready' | 'failed'
  }>
}

@Injectable()
export class MeetingsPrecallPrepService {
  private readonly logger = new Logger(MeetingsPrecallPrepService.name)

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly spacesRepo: SpacesRepository,
    private readonly userAgentApi: UserAgentApiService,
    private readonly configService: ConfigService,
    private readonly driveAgenda: MeetingsPrecallDriveAgendaService,
  ) {}

  async resolveMeetingsSpaceId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    return resolvePreferredMeetingsSpaceId({
      orgId,
      loadSpaces: (scopeOrgId) =>
        this.spacesRepo.findAllSpaces(
          supabase,
          userId,
          { limit: 200, paginated: false },
          scopeOrgId,
        ) as Promise<Array<Record<string, unknown>>>,
    })
  }

  async runForToday(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    timezone?: string
    refresh?: boolean
    scope: RequestScope
  }): Promise<PrecallPrepRunResult> {
    const timezone = input.timezone?.trim() || 'America/Los_Angeles'
    const { startIso, endIso, dayKey } = localDayBounds(new Date(), timezone)
    const calendar = this.resolveCalendarService()
    const agenda = await calendar.getAgenda(input.supabase, { id: input.userId }, input.scope, {
      start: startIso,
      end: endIso,
      timezone,
    })

    const eligible = (agenda.events ?? []).filter(isEligiblePrecallEvent)
    const result: PrecallPrepRunResult = {
      space_id: input.spaceId,
      day_key: dayKey,
      created: 0,
      refreshed: 0,
      skipped: 0,
      failed: 0,
      items: [],
    }

    for (const event of eligible) {
      try {
        const outcome = await this.upsertAndInvoke({
          supabase: input.supabase,
          userId: input.userId,
          orgId: input.orgId,
          spaceId: input.spaceId,
          event,
          refresh: input.refresh !== false,
        })
        if (outcome.kind === 'created') result.created += 1
        else if (outcome.kind === 'refreshed') result.refreshed += 1
        else result.skipped += 1
        result.items.push({
          calendar_event_id: event.id,
          space_item_id: outcome.itemId,
          title: outcome.title,
          status: 'pending',
        })
      } catch (err) {
        result.failed += 1
        this.logger.warn(
          `Pre-call prep failed for event ${event.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    return result
  }

  async runForEvent(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    calendarEventId: string
    timezone?: string
    refresh?: boolean
    scope: RequestScope
    /** Prefer this when the UI already has the meeting (Team/Mine/non-today). */
    eventSnapshot?: PrecallEventSnapshot | null
    /** When no snapshot, widen agenda lookup around this start instead of only today. */
    eventStartHint?: string | null
    /** Explicit Page Grader client when triggered from the Portal. */
    pageGraderClientId?: string | null
    /** Mapped ROAS campaign that owns this Page Grader client's Brain. */
    pageGraderCampaignId?: string | null
  }): Promise<{
    calendar_event_id: string
    space_item_id: string
    title: string
    status: 'pending' | 'ready' | 'failed'
    kind: 'created' | 'refreshed' | 'skipped'
  }> {
    const calendarEventId = input.calendarEventId.trim()
    if (!calendarEventId) throw new BadRequestException('calendar_event_id is required')

    const timezone = input.timezone?.trim() || 'America/Los_Angeles'
    let event: CalendarAgendaEvent | null = null

    if (input.eventSnapshot) {
      event = {
        ...eventFromPrecallSnapshot(calendarEventId, input.eventSnapshot),
        location: input.eventSnapshot.location?.trim() || null,
        html_link: null,
        color_id: null,
        video_label: null,
        source: 'google_calendar',
      } as CalendarAgendaEvent
    } else {
      const hintMs = input.eventStartHint ? new Date(input.eventStartHint).getTime() : NaN
      const anchor = Number.isFinite(hintMs) ? new Date(hintMs) : new Date()
      const window = Number.isFinite(hintMs)
        ? localDayWindowAround(anchor, timezone, 1)
        : localDayBounds(anchor, timezone)
      const calendar = this.resolveCalendarService()
      const agenda = await calendar.getAgenda(input.supabase, { id: input.userId }, input.scope, {
        start: window.startIso,
        end: window.endIso,
        timezone,
      })
      event = (agenda.events ?? []).find((row) => row.id === calendarEventId) ?? null
    }

    if (!event) {
      throw new BadRequestException(
        'Calendar event not found for prep. Open the meeting again and retry.',
      )
    }
    if (!isEligiblePrecallEvent(event)) {
      throw new BadRequestException('This calendar event is not eligible for pre-call prep')
    }

    const outcome = await this.upsertAndInvoke({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      spaceId: input.spaceId,
      event,
      refresh: input.refresh !== false,
      pageGraderClientId: input.pageGraderClientId ?? null,
      pageGraderCampaignId: input.pageGraderCampaignId ?? null,
    })
    return {
      calendar_event_id: event.id,
      space_item_id: outcome.itemId,
      title: outcome.title,
      status: 'pending',
      kind: outcome.kind,
    }
  }

  /**
   * Portal-triggered prep: explicit Page Grader client + synthetic calendar event.
   */
  async runForPageGraderClient(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    pageGraderClientId: string
    pageGraderCampaignId: string
    clientName: string
    meetingDate: string
    notes?: string | null
    refresh?: boolean
    scope: RequestScope
  }): Promise<{
    calendar_event_id: string
    space_item_id: string
    title: string
    status: 'pending' | 'ready' | 'failed'
    kind: 'created' | 'refreshed' | 'skipped'
  }> {
    const meetingMs = new Date(input.meetingDate).getTime()
    if (!Number.isFinite(meetingMs)) {
      throw new BadRequestException('meeting_date must be a valid ISO timestamp')
    }
    const start = new Date(meetingMs)
    const end = new Date(meetingMs + 60 * 60 * 1000)
    const calendarEventId = `pg-agenda:${input.pageGraderClientId}:${start.toISOString()}`
    const title = `${input.clientName} — Meeting`.slice(0, 200)
    return this.runForEvent({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      spaceId: input.spaceId,
      calendarEventId,
      refresh: input.refresh !== false,
      scope: input.scope,
      pageGraderClientId: input.pageGraderClientId,
      pageGraderCampaignId: input.pageGraderCampaignId,
      eventSnapshot: {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        all_day: false,
        video_url: null,
        location: null,
        operator_notes: input.notes?.trim() || null,
        attendees: [{ name: input.clientName, email: null }],
      },
    })
  }

  async enrichAgendaEvents(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    events: Array<{ id: string }>
  }): Promise<Map<string, AgendaPrepLink>> {
    const ids = [...new Set(input.events.map((e) => e.id).filter(Boolean))]
    if (ids.length === 0) return new Map()
    // Prep items live on the resolved Meetings space (org preferred, else personal).
    const rows = await this.spacesRepo.findPrepItemsByCalendarEventIds(
      input.supabase,
      input.userId,
      input.orgId,
      ids,
    )
    const map = new Map<string, AgendaPrepLink>()
    for (const row of rows) {
      const custom = (row.custom_data ?? {}) as Record<string, unknown>
      const eventId = String(custom.calendar_event_id ?? '').trim()
      if (!eventId || map.has(eventId)) continue
      map.set(
        eventId,
        mapPrepItemToAgendaLink({
          id: String(row.id),
          space_id: String(row.space_id),
          title: typeof row.title === 'string' ? row.title : null,
          custom_data: custom,
          task_execution_status:
            typeof (row as { task_execution_status?: unknown }).task_execution_status === 'string'
              ? String((row as { task_execution_status: string }).task_execution_status)
              : null,
        }),
      )
    }
    return map
  }

  async enrichAgendaRelatedCalls(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    events: PrecallAgendaEventLike[]
    start: string
    end: string
  }): Promise<{
    relatedByEventId: Map<string, AgendaRelatedCall>
    unmatchedFathomEvents: ReturnType<typeof buildMeetingAgendaEvent>[]
  }> {
    const relatedByEventId = new Map<string, AgendaRelatedCall>()
    const unmatchedFathomEvents: ReturnType<typeof buildMeetingAgendaEvent>[] = []

    const spaceId = await this.resolveMeetingsSpaceId(input.supabase, input.userId, input.orgId)
    if (!spaceId) return { relatedByEventId, unmatchedFathomEvents }

    const windowStartMs = new Date(input.start).getTime()
    const windowEndMs = new Date(input.end).getTime()
    const matchPadStart = Number.isFinite(windowStartMs)
      ? new Date(windowStartMs - RELATED_CALL_MATCH_PAD_MS).toISOString()
      : input.start
    const matchPadEnd = Number.isFinite(windowEndMs)
      ? new Date(windowEndMs + RELATED_CALL_MATCH_PAD_MS).toISOString()
      : input.end

    const { data: callRows } = await input.supabase
      .from('space_items')
      .select('id, space_id, title, status, source, description, custom_data, created_at')
      .eq('space_id', spaceId)
      .eq('custom_data->>entry_type', 'call')
      .gte('custom_data->>call_date', matchPadStart)
      .lte('custom_data->>call_date', matchPadEnd)
      .order('custom_data->>call_date', { ascending: false })
      .limit(120)

    const calls = (callRows ?? []) as Array<{
      id: string
      space_id: string
      title?: string | null
      source?: string | null
      description?: string | null
      custom_data?: Record<string, unknown> | null
    }>
    if (calls.length === 0) return { relatedByEventId, unmatchedFathomEvents }

    const callIdSet = new Set(calls.map((c) => c.id))
    const { data: followUpRows } = await input.supabase
      .from('space_items')
      .select('id, title, status, assignee_id, assignee_type, custom_data, parent_item_id')
      .eq('space_id', spaceId)
      .eq('custom_data->>entry_type', 'follow_up')
      .order('created_at', { ascending: false })
      .limit(120)

    const followUpsByCall = new Map<string, AgendaRelatedCall['follow_ups']>()
    for (const row of (followUpRows ?? []) as Array<{
      id: string
      title?: string | null
      status?: string | null
      assignee_id?: string | null
      assignee_type?: string | null
      custom_data?: Record<string, unknown> | null
      parent_item_id?: string | null
    }>) {
      const sourceId = String(
        row.custom_data?.source_call_item_id ?? row.parent_item_id ?? '',
      ).trim()
      if (!sourceId || !callIdSet.has(sourceId)) continue
      const list = followUpsByCall.get(sourceId) ?? []
      list.push(toAgendaFollowUp(row))
      followUpsByCall.set(sourceId, list)
    }
    const callsById = new Map(calls.map((call) => [call.id, call]))
    const scoredAssigned = assignRelatedCallsExclusive(
      buildRelatedCallCandidates(input.events, calls),
    )
    const assigned = assignSoleNearStartRelatedCalls({
      events: input.events,
      calls: calls.map((call) => ({
        id: call.id,
        call_date:
          typeof call.custom_data?.call_date === 'string' ? call.custom_data.call_date : null,
      })),
      alreadyAssigned: scoredAssigned,
    })
    const matchedCallIds = new Set<string>()
    for (const [eventId, callId] of assigned) {
      const call = callsById.get(callId)
      if (!call) continue
      matchedCallIds.add(call.id)
      relatedByEventId.set(
        eventId,
        toAgendaRelatedCall({
          call,
          followUps: followUpsByCall.get(call.id) ?? [],
        }),
      )
    }

    for (const call of calls) {
      if (matchedCallIds.has(call.id)) continue
      const callDate =
        typeof call.custom_data?.call_date === 'string' ? call.custom_data.call_date : null
      if (!callDateInAgendaWindow(callDate, input.start, input.end)) continue
      const related = toAgendaRelatedCall({
        call,
        followUps: followUpsByCall.get(call.id) ?? [],
      })
      unmatchedFathomEvents.push(
        buildMeetingAgendaEvent({
          spaceId: related.space_id,
          callItemId: related.call_item_id,
          title: related.title,
          callDate: callDate!,
          source: call.source === 'manual' ? 'manual' : 'fathom',
          recordingUrl: related.recording_url,
          externalRecordingId: related.external_recording_id,
          summary: related.summary,
          hasTranscript: related.has_transcript,
          followUps: related.follow_ups,
        }),
      )
    }

    unmatchedFathomEvents.sort((a, b) => a.start.localeCompare(b.start))
    return { relatedByEventId, unmatchedFathomEvents }
  }

  private resolveCalendarService(): CalendarServiceLike {
    try {
      // Lazy resolve avoids Nest circular import (IntegrationsModule → SpacesModule).
      const { IntegrationsCalendarService } =
        require('../../integrations/services/integrations-calendar.service') as {
          IntegrationsCalendarService: new (...args: unknown[]) => CalendarServiceLike
        }
      return this.moduleRef.get(IntegrationsCalendarService, { strict: false })
    } catch {
      throw new BadRequestException('Calendar service unavailable for pre-call prep')
    }
  }

  private async upsertAndInvoke(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    event: CalendarAgendaEvent
    refresh: boolean
    pageGraderClientId?: string | null
    pageGraderCampaignId?: string | null
  }): Promise<{ kind: 'created' | 'refreshed' | 'skipped'; itemId: string; title: string }> {
    const spaceRow = await this.spacesRepo.findSpaceByIdForAccess(input.supabase, input.spaceId)
    // Write using the space's org (personal Meetings → null), not the request org header.
    const writeOrgId =
      spaceRow && typeof (spaceRow as { org_id?: unknown }).org_id === 'string'
        ? String((spaceRow as { org_id: string }).org_id)
        : null

    const existing = await this.spacesRepo.findItemByCalendarEventId(
      input.supabase,
      input.spaceId,
      input.event.id,
    )
    const title = `Prep — ${input.event.title}`.slice(0, 200)
    const attendeeTags = input.event.attendees
      .map((a) => a.name?.trim() || a.email?.trim())
      .filter((v): v is string => Boolean(v))

    const customData = {
      entry_type: 'prep',
      calendar_event_id: input.event.id,
      prep_status: 'pending',
      call_date: input.event.start,
      attendees: attendeeTags,
      ...(input.pageGraderClientId ? { page_grader_client_id: input.pageGraderClientId } : {}),
      ...(input.pageGraderCampaignId
        ? { page_grader_campaign_id: input.pageGraderCampaignId }
        : {}),
    }

    let itemId: string
    let kind: 'created' | 'refreshed' | 'skipped'

    if (existing?.id) {
      itemId = String(existing.id)
      if (!input.refresh) {
        const existingCustom = (existing.custom_data as Record<string, unknown> | null) ?? {}
        const status = String(existingCustom.prep_status ?? '')
        const hasDriveAgenda = Boolean(String(existingCustom.agenda_tab_id ?? '').trim())
        const updatedMs = new Date(String(existing.updated_at ?? '')).getTime()
        const pendingIsFresh =
          status === 'pending' &&
          Number.isFinite(updatedMs) &&
          Date.now() - updatedMs < 10 * 60 * 1000
        if ((status === 'ready' && hasDriveAgenda) || pendingIsFresh) {
          return { kind: 'skipped', itemId, title: String(existing.title ?? title) }
        }
      }
      await input.supabase
        .from('space_items')
        .update({
          title,
          status: 'processing',
          custom_data: {
            ...((existing.custom_data as Record<string, unknown> | null) ?? {}),
            ...customData,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('space_id', input.spaceId)
      kind = 'refreshed'
    } else {
      const created = await this.spacesRepo.createItem(
        input.supabase,
        input.userId,
        input.spaceId,
        {
          title,
          status: 'processing',
          priority: 'high',
          source: 'agent',
          custom_data: customData,
        },
        writeOrgId,
      )
      itemId = String(created.id)
      kind = 'created'
    }

    const relatedContext = await loadPrecallRelatedContext(
      input.supabase,
      input.spaceId,
      input.event,
    )
    await this.driveAgenda.invokePrepAgent({
      supabase: input.supabase,
      userId: input.userId,
      orgId: writeOrgId,
      spaceId: input.spaceId,
      itemId,
      event: input.event,
      space: spaceRow,
      pageGraderClientId: input.pageGraderClientId ?? null,
      pageGraderCampaignId: input.pageGraderCampaignId ?? null,
      relatedContext,
      internalToken:
        this.configService.get<string>('INTERNAL_API_TOKEN') ??
        process.env.INTERNAL_API_TOKEN ??
        '',
      userAgentApi: this.userAgentApi,
    })

    const agendaWrite = this.driveAgenda
      .writeDriveAgendaAfterPrep({
        supabase: input.supabase,
        userId: input.userId,
        spaceId: input.spaceId,
        itemId,
        event: input.event,
        pageGraderClientId: input.pageGraderClientId ?? null,
      })
      .catch(async (err) => {
        const message = err instanceof Error ? err.message : String(err)
        const { data: failedItem } = await input.supabase
          .from('space_items')
          .select('custom_data')
          .eq('id', itemId)
          .maybeSingle()
        await input.supabase
          .from('space_items')
          .update({
            custom_data: {
              ...((failedItem?.custom_data as Record<string, unknown> | null) ?? {}),
              prep_status: 'failed',
              agenda_write_status: 'failed',
              agenda_write_error: message.slice(0, 1000),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
        this.logger.warn(`Drive agenda write failed for prep ${itemId}: ${message}`)
      })

    try {
      waitUntil(agendaWrite)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`waitUntil unavailable for prep ${itemId}: ${message}`)
      void agendaWrite
    }

    return { kind, itemId, title }
  }
}
