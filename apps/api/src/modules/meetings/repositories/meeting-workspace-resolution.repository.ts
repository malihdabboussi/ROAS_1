import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ScheduledMeetingEvent = {
  calendarEventId: string
  title: string
  start: string
  end: string
  description?: string | null
  location?: string | null
  videoUrl?: string | null
  htmlLink?: string | null
  attendees: Array<{ email: string; name?: string | null }>
}

@Injectable()
export class MeetingWorkspaceResolutionRepository {
  async findSpaceOrgId(supabase: SupabaseClient, spaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('org_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return typeof data?.org_id === 'string' ? data.org_id : null
  }

  async findByCalendarEvent(
    supabase: SupabaseClient,
    spaceId: string,
    calendarEventId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .select('*')
      .eq('space_id', spaceId)
      .eq('calendar_event_id', calendarEventId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async findByMeetingItem(
    supabase: SupabaseClient,
    meetingItemId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .select('*')
      .eq('meeting_item_id', meetingItemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async createScheduledMeeting(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      event: ScheduledMeetingEvent
    },
  ): Promise<Record<string, unknown>> {
    const participantEmails = input.event.attendees
      .map((attendee) => attendee.email.trim().toLowerCase())
      .filter(Boolean)
    const attendeeLabels = input.event.attendees
      .map((attendee) => attendee.name?.trim() || attendee.email.trim())
      .filter(Boolean)
    const { data, error } = await supabase
      .from('space_items')
      .insert({
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        title: input.event.title.slice(0, 500),
        description: input.event.description?.trim() || null,
        status: 'logged',
        source: 'calendar',
        custom_data: {
          entry_type: 'call',
          call_kind: 'scheduled',
          calendar_event_id: input.event.calendarEventId,
          call_date: input.event.start,
          call_end: input.event.end,
          attendees: attendeeLabels,
          participant_emails: participantEmails,
          location: input.event.location?.trim() || null,
          video_url: input.event.videoUrl?.trim() || null,
          calendar_url: input.event.htmlLink?.trim() || null,
        },
      })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async deleteScheduledMeeting(
    supabase: SupabaseClient,
    meetingItemId: string,
    calendarEventId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_items')
      .delete()
      .eq('id', meetingItemId)
      .eq('source', 'calendar')
      .eq('custom_data->>calendar_event_id', calendarEventId)
    if (error) throw new BadRequestException(error.message)
  }

  async listScheduledMeetingCandidates(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; anchorAt: string | null },
  ): Promise<Record<string, unknown>[]> {
    if (!input.anchorAt) return []
    const anchorMs = new Date(input.anchorAt).getTime()
    if (!Number.isFinite(anchorMs)) return []
    const lower = new Date(anchorMs - 10 * 60 * 1000).toISOString()
    const upper = new Date(anchorMs + 10 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, custom_data')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .eq('source', 'calendar')
      .eq('custom_data->>entry_type', 'call')
      .gte('custom_data->>call_date', lower)
      .lte('custom_data->>call_date', upper)
      .limit(20)
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }
}
