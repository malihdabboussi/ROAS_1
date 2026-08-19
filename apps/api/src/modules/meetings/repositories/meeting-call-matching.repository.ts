import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Queries that match an agenda event to existing Meetings call items by
 * natural keys (ical_uid, Fathom meeting id, calendar event id) or by
 * title/time proximity. Consumed through MeetingWorkspaceResolutionRepository.
 */
@Injectable()
export class MeetingCallMatchingRepository {
  async listMeetingCandidates(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; anchorAt: string | null },
  ): Promise<Record<string, unknown>[]> {
    if (!input.anchorAt) return []
    const anchorMs = new Date(input.anchorAt).getTime()
    if (!Number.isFinite(anchorMs)) return []
    // ±20m covers Fathom "Impromptu" starts that land slightly before the invite.
    const lower = new Date(anchorMs - 20 * 60 * 1000).toISOString()
    const upper = new Date(anchorMs + 20 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, custom_data')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .in('source', ['calendar', 'manual', 'fathom'])
      .eq('custom_data->>entry_type', 'call')
      .gte('custom_data->>call_date', lower)
      .lte('custom_data->>call_date', upper)
      .limit(20)
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  /** Exact Meetings call already stamped with this Google/Outlook event id. */
  async findCallItemByCalendarEventId(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; calendarEventId: string },
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, custom_data')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .eq('custom_data->>entry_type', 'call')
      .eq('custom_data->>calendar_event_id', input.calendarEventId)
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  /** Meetings call stamped with the invite's stable iCalendar UID. */
  async findCallItemByIcalUid(
    supabase: SupabaseClient,
    spaceId: string,
    icalUid: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('custom_data->>entry_type', 'call')
      .eq('custom_data->>ical_uid', icalUid)
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  /**
   * Prefer an existing Meetings call (especially Fathom-backed) over creating a
   * second calendar stub for the same invite.
   */
  async findBestExistingCallForEvent(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      calendarEventId: string
      icalUid?: string | null
      title: string
      start: string
    },
  ): Promise<Record<string, unknown> | null> {
    const byCalendar = await this.findCallItemByCalendarEventId(supabase, {
      spaceId: input.spaceId,
      userId: input.userId,
      calendarEventId: input.calendarEventId,
    })
    if (byCalendar) return byCalendar

    const candidates = await this.listMeetingCandidates(supabase, {
      spaceId: input.spaceId,
      userId: input.userId,
      anchorAt: input.start,
    })
    if (candidates.length === 0) return null

    const targetTitle = normalizeCallTitle(input.title)
    const targetIcalUid = input.icalUid?.trim() || null
    const anchorMs = new Date(input.start).getTime()
    const ranked = candidates
      .map((row) => {
        const custom = record(row.custom_data)
        const hasRecording = Boolean(
          firstText(custom.recording_url, custom.fathom_url) ||
          firstText(record(custom.external_automation).meeting_id),
        )
        const source = String(row.source ?? '')
        const title = normalizeCallTitle(String(row.title ?? ''))
        const titleHit =
          Boolean(targetTitle) &&
          Boolean(title) &&
          (title === targetTitle || title.includes(targetTitle) || targetTitle.includes(title))
        let score = 0
        if (hasRecording) score += 40
        if (source === 'fathom') score += 20
        if (titleHit) score += 30
        if (String(custom.calendar_event_id ?? '') === input.calendarEventId) score += 50
        if (targetIcalUid && String(custom.ical_uid ?? '') === targetIcalUid) score += 50
        // Agenda row ids flip between providers/accounts, so a strong title match
        // needs time proximity to clear the threshold instead of duplicating.
        const callMs = new Date(String(custom.call_date ?? '')).getTime()
        if (Number.isFinite(anchorMs) && Number.isFinite(callMs)) {
          const deltaMs = Math.abs(callMs - anchorMs)
          if (deltaMs <= 5 * 60 * 1000) score += 15
          else if (deltaMs <= 20 * 60 * 1000) score += 10
        }
        return { row, score }
      })
      .filter((entry) => entry.score >= 40)
      .sort((a, b) => b.score - a.score)

    return ranked[0]?.row ?? null
  }

  /** Sibling call items in the same space sharing any natural key (dup merge). */
  async listDuplicateCallItemIds(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      icalUid: string | null
      fathomMeetingId: string | null
      calendarEventId: string | null
    },
  ): Promise<string[]> {
    const keyFilters: Array<[string, string]> = []
    if (input.icalUid) keyFilters.push(['custom_data->>ical_uid', input.icalUid])
    if (input.fathomMeetingId) {
      keyFilters.push(['custom_data->external_automation->>meeting_id', input.fathomMeetingId])
    }
    if (input.calendarEventId) {
      keyFilters.push(['custom_data->>calendar_event_id', input.calendarEventId])
    }
    if (keyFilters.length === 0) return []

    const results = await Promise.all(
      keyFilters.map(async ([column, value]) => {
        const { data, error } = await supabase
          .from('space_items')
          .select('id')
          .eq('space_id', input.spaceId)
          .neq('id', input.meetingItemId)
          .eq('custom_data->>entry_type', 'call')
          .eq(column, value)
          .limit(20)
        if (error) throw new BadRequestException(error.message)
        return (data ?? []) as Array<Record<string, unknown>>
      }),
    )
    return [
      ...new Set(
        results
          .flat()
          .map((row) => String(row.id ?? '').trim())
          .filter(Boolean),
      ),
    ]
  }

  async findCallItemById(
    supabase: SupabaseClient,
    meetingItemId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, custom_data')
      .eq('id', meetingItemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async listCallItemsForSpace(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('space_items')
      .select(RELATED_CALL_ITEM_COLUMNS)
      .eq('space_id', spaceId)
      .eq('custom_data->>entry_type', 'call')
      .limit(200)
    if (error) throw new BadRequestException(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[])
  }
}

const RELATED_CALL_ITEM_COLUMNS = [
  'id',
  'space_id',
  'org_id',
  'user_id',
  'title',
  'status',
  'priority',
  'assignee_type',
  'assignee_id',
  'assignees',
  'start_date',
  'due_date',
  'parent_item_id',
  'description',
  'notes',
  'source',
  'linked_mission_id',
  'form_id',
  'is_private',
  'sort_order',
  'custom_data',
  'created_at',
  'updated_at',
].join(', ')

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function normalizeCallTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
