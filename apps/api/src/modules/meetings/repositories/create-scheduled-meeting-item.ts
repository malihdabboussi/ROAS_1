import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingCallKind } from '../domain/meeting-call-kind'
import { callStatusForScheduledMeeting } from '../domain/meeting-call-status'
import { meetingHostCustomData, resolveMeetingHost } from '../domain/meeting-host'
import type { ScheduledMeetingEvent } from './meeting-workspace-resolution.repository'

export async function createScheduledMeetingItem(
  supabase: SupabaseClient,
  input: {
    spaceId: string
    userId: string
    orgId: string | null
    event: ScheduledMeetingEvent
    callKind: MeetingCallKind
  },
): Promise<Record<string, unknown>> {
  const participantEmails = input.event.attendees
    .map((attendee) => attendee.email.trim().toLowerCase())
    .filter(Boolean)
  const attendeeLabels = input.event.attendees
    .map((attendee) => attendee.name?.trim() || attendee.email.trim())
    .filter(Boolean)
  const icalUid = input.event.icalUid?.trim() || null
  const host = resolveMeetingHost({ organizer: input.event.organizer })
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
        call_kind: input.callKind,
        call_kind_source: 'automatic',
        call_status: callStatusForScheduledMeeting(input.event.start, input.event.end),
        call_status_source: 'automatic',
        calendar_event_id: input.event.calendarEventId,
        ...(icalUid ? { ical_uid: icalUid } : {}),
        call_date: input.event.start,
        call_end: input.event.end,
        attendees: attendeeLabels,
        participant_emails: participantEmails,
        location: input.event.location?.trim() || null,
        video_url: input.event.videoUrl?.trim() || null,
        calendar_url: input.event.htmlLink?.trim() || null,
        ...meetingHostCustomData(host),
      },
    })
    .select()
    .single()
  if (error) {
    if (isUniqueViolation(error) && icalUid) {
      const existing = await findCallItemByIcalUid(supabase, input.spaceId, icalUid)
      if (existing) return existing
    }
    throw new BadRequestException(error.message)
  }
  return data as Record<string, unknown>
}

export async function findCallItemByIcalUid(
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

export async function patchMeetingItemCustomData(
  supabase: SupabaseClient,
  meetingItemId: string,
  customData: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('space_items')
    .update({ custom_data: { ...customData, ...patch } })
    .eq('id', meetingItemId)
  if (error) throw new BadRequestException(error.message)
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: unknown }).code === '23505',
  )
}
