import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { SpacesRepository } from '../repositories/spaces.repository'
import {
  assignRelatedCallsExclusive,
  assignSoleNearStartRelatedCalls,
  buildFathomAgendaEvent,
  buildPrecallPrompt,
  callDateInAgendaWindow,
  isEligiblePrecallEvent,
  localDayBounds,
  mapPrepItemToAgendaLink,
  pickMeetingsSpaceId,
  scoreRelatedCallMatch,
  type AgendaPrepLink,
  type AgendaRelatedCall,
  type PrecallAgendaEventLike,
} from './meetings-precall-prep.helpers'

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
  ) {}

  /**
   * Resolve personal-account Meetings / Personal Dashboard.
   * Home Agenda prep and related calls always use this space — never the active org dashboard.
   */
  async resolveMeetingsSpaceId(
    supabase: SupabaseClient,
    userId: string,
    _orgId?: string | null,
  ): Promise<string | null> {
    const spaces = await this.spacesRepo.findAllSpaces(
      supabase,
      userId,
      { limit: 200, paginated: false },
      null,
    )
    return pickMeetingsSpaceId(spaces as Array<Record<string, unknown>>)
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
    const { startIso, endIso } = localDayBounds(new Date(), timezone)
    const calendar = this.resolveCalendarService()
    const agenda = await calendar.getAgenda(input.supabase, { id: input.userId }, input.scope, {
      start: startIso,
      end: endIso,
      timezone,
    })
    const event = (agenda.events ?? []).find((row) => row.id === calendarEventId)
    if (!event) {
      throw new BadRequestException('Calendar event not found in today’s agenda')
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
    })
    return {
      calendar_event_id: event.id,
      space_item_id: outcome.itemId,
      title: outcome.title,
      status: 'pending',
      kind: outcome.kind,
    }
  }

  async enrichAgendaEvents(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    events: Array<{ id: string }>
  }): Promise<Map<string, AgendaPrepLink>> {
    const ids = [...new Set(input.events.map((e) => e.id).filter(Boolean))]
    if (ids.length === 0) return new Map()
    // Prep items live on the personal-account Meetings space.
    const rows = await this.spacesRepo.findPrepItemsByCalendarEventIds(
      input.supabase,
      input.userId,
      null,
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
    unmatchedFathomEvents: ReturnType<typeof buildFathomAgendaEvent>[]
  }> {
    const relatedByEventId = new Map<string, AgendaRelatedCall>()
    const unmatchedFathomEvents: ReturnType<typeof buildFathomAgendaEvent>[] = []

    const spaceId = await this.resolveMeetingsSpaceId(input.supabase, input.userId, null)
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
      .select('id, space_id, title, status, custom_data, created_at')
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
      custom_data?: Record<string, unknown> | null
    }>
    if (calls.length === 0) return { relatedByEventId, unmatchedFathomEvents }

    const callIdSet = new Set(calls.map((c) => c.id))
    const { data: followUpRows } = await input.supabase
      .from('space_items')
      .select('id, title, status, custom_data, parent_item_id')
      .eq('space_id', spaceId)
      .eq('custom_data->>entry_type', 'follow_up')
      .order('created_at', { ascending: false })
      .limit(120)

    const followUpsByCall = new Map<string, AgendaRelatedCall['follow_ups']>()
    for (const row of (followUpRows ?? []) as Array<{
      id: string
      title?: string | null
      status?: string | null
      custom_data?: Record<string, unknown> | null
      parent_item_id?: string | null
    }>) {
      const sourceId = String(
        row.custom_data?.source_call_item_id ?? row.parent_item_id ?? '',
      ).trim()
      if (!sourceId || !callIdSet.has(sourceId)) continue
      const list = followUpsByCall.get(sourceId) ?? []
      list.push({
        id: row.id,
        title: String(row.title ?? 'Untitled').slice(0, 200),
        status: String(row.status ?? ''),
      })
      followUpsByCall.set(sourceId, list)
    }
    const callsById = new Map(calls.map((call) => [call.id, call]))
    const candidates: Array<{ eventId: string; callId: string; score: number }> = []
    for (const event of input.events) {
      for (const call of calls) {
        const custom = call.custom_data ?? {}
        const score = scoreRelatedCallMatch(event, {
          title: call.title,
          call_date: typeof custom.call_date === 'string' ? custom.call_date : null,
          attendees: custom.attendees,
        })
        if (score <= 0) continue
        candidates.push({ eventId: event.id, callId: call.id, score })
      }
    }
    const scoredAssigned = assignRelatedCallsExclusive(candidates)
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
      const custom = call.custom_data ?? {}
      relatedByEventId.set(eventId, {
        space_id: String(call.space_id),
        call_item_id: call.id,
        title: String(call.title ?? 'Call').slice(0, 200),
        recording_url:
          typeof custom.recording_url === 'string' && custom.recording_url.trim()
            ? custom.recording_url.trim()
            : null,
        follow_ups: followUpsByCall.get(call.id) ?? [],
      })
    }

    for (const call of calls) {
      if (matchedCallIds.has(call.id)) continue
      const custom = call.custom_data ?? {}
      const callDate = typeof custom.call_date === 'string' ? custom.call_date : null
      if (!callDateInAgendaWindow(callDate, input.start, input.end)) continue
      unmatchedFathomEvents.push(
        buildFathomAgendaEvent({
          spaceId: String(call.space_id),
          callItemId: call.id,
          title: String(call.title ?? 'Call'),
          callDate: callDate!,
          recordingUrl:
            typeof custom.recording_url === 'string' && custom.recording_url.trim()
              ? custom.recording_url.trim()
              : null,
          followUps: followUpsByCall.get(call.id) ?? [],
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
    }

    let itemId: string
    let kind: 'created' | 'refreshed' | 'skipped'

    if (existing?.id) {
      itemId = String(existing.id)
      if (!input.refresh) {
        const status = String(
          (existing.custom_data as Record<string, unknown> | null)?.prep_status ?? '',
        )
        if (status === 'ready' || status === 'pending') {
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

    await this.invokePrepAgent({
      supabase: input.supabase,
      userId: input.userId,
      orgId: writeOrgId,
      spaceId: input.spaceId,
      itemId,
      event: input.event,
      space: spaceRow,
    })

    return { kind, itemId, title }
  }

  private async invokePrepAgent(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    itemId: string
    event: CalendarAgendaEvent
    space?: Record<string, unknown> | null
  }): Promise<void> {
    const space =
      input.space ?? (await this.spacesRepo.findSpaceByIdForAccess(input.supabase, input.spaceId))
    const relatedContext = await this.loadRelatedContext(input.supabase, input.spaceId, input.event)
    const promptBase = buildPrecallPrompt({ event: input.event, relatedContext })
    const prompt = [
      promptBase,
      '',
      'Create exactly one Document by calling save_document with this shape:',
      JSON.stringify(
        {
          title: `Prep — ${input.event.title}`.slice(0, 120),
          body: '<full prep markdown or html>',
          space_id: input.spaceId,
          source_item_id: input.itemId,
          parent_item_id: input.itemId,
        },
        null,
        2,
      ),
      '',
      'After the document is saved, update_task on THIS prep item: set custom field prep_status to ready and status to logged (To action).',
    ].join('\n')

    const internalToken =
      this.configService.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) throw new Error('INTERNAL_API_TOKEN not configured')

    await input.supabase
      .from('space_items')
      .update({ task_execution_status: 'running' })
      .eq('id', input.itemId)

    const response = await this.userAgentApi.invoke(
      input.userId,
      '/api/task-agent/invoke',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
        body: JSON.stringify({
          item_id: input.itemId,
          space_id: input.spaceId,
          agent_key: 'vibey',
          user_id: input.userId,
          org_id: input.orgId,
          campaign_id:
            space && typeof (space as { campaign_id?: unknown }).campaign_id === 'string'
              ? (space as { campaign_id: string }).campaign_id
              : null,
          prompt,
          agent_collaboration: 'disabled',
        }),
      },
      {
        timeoutMs: 600_000,
        logTag: `precall_prep item=${input.itemId}`,
      },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      await input.supabase
        .from('space_items')
        .update({
          custom_data: {
            entry_type: 'prep',
            calendar_event_id: input.event.id,
            prep_status: 'failed',
            call_date: input.event.start,
          },
          task_execution_status: 'failed',
        })
        .eq('id', input.itemId)
      throw new Error(String(body?.error ?? body?.message ?? 'Task agent invocation failed'))
    }
  }

  private async loadRelatedContext(
    supabase: SupabaseClient,
    spaceId: string,
    event: CalendarAgendaEvent,
  ): Promise<string> {
    const emails = event.attendees
      .map((a) => a.email?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v))
    const { data } = await supabase
      .from('space_items')
      .select('title, notes, custom_data, created_at')
      .eq('space_id', spaceId)
      .eq('custom_data->>entry_type', 'call')
      .order('created_at', { ascending: false })
      .limit(8)
    const rows = (data ?? []) as Array<{
      title?: string
      notes?: string | null
      custom_data?: Record<string, unknown> | null
    }>
    const snippets: string[] = []
    for (const row of rows) {
      const attendees = row.custom_data?.attendees
      const attendeeBlob = Array.isArray(attendees)
        ? attendees.map((a) => String(a).toLowerCase()).join(' ')
        : ''
      const overlap =
        emails.length === 0 ||
        emails.some(
          (email) =>
            attendeeBlob.includes(email) ||
            String(row.title ?? '')
              .toLowerCase()
              .includes(email.split('@')[0] ?? ''),
        )
      if (!overlap && emails.length > 0) continue
      snippets.push(
        `- ${row.title ?? 'Untitled call'}${row.notes ? `: ${String(row.notes).slice(0, 280)}` : ''}`,
      )
      if (snippets.length >= 3) break
    }
    return snippets.join('\n')
  }
}
