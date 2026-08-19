import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { updateSpaceItem } from '@/lib/spaces/spaces-api'

export type MeetingWorkspaceRecord = {
  meeting_item_id: string
  phase: 'scheduled' | 'live' | 'processing' | 'complete'
  conversation_id: string | null
  agenda_doc_item_id: string | null
  notes_doc_item_id: string | null
  recap_doc_item_id: string | null
  live_started_at: string | null
}

export type MeetingRecording = {
  id: string
  title: string
  provider: string
  external_recording_id?: string | null
  recording_url: string | null
  duration_seconds: number | null
  is_primary: boolean
  provider_summary: string | null
  transcript_doc_item_id: string | null
}

export type FathomRecordingCandidate = {
  id?: string | number
  recording_id?: string | number
  call_id?: string | number
  title: string
  meeting_title?: string
  canonical_title?: string
  url?: string
  created_at?: string
  recording_start_time?: string
  scheduled_start_time?: string
  calendar_invitees?: Array<{ name?: string | null; email?: string | null } | null>
  recorded_by?: { name?: string | null; email?: string | null } | null
}

export type MeetingAction = {
  id: string
  title: string
  source_type: 'provider' | 'ai' | 'manual'
  status: string
  task_status?: string | null
  priority?: string | null
  due_at?: string | null
  start_date?: string | null
  assignee_type?: string | null
  assignee_id?: string | null
  assignees?: Array<{ type: 'human' | 'agent'; id: string }>
  org_id?: string | null
  user_id?: string | null
  sort_order?: number | null
  description?: string | null
  notes?: string | null
  linked_mission_id?: string | null
  canonical_assignee_name: string | null
  canonical_assignee_email: string | null
  evidence: Record<string, unknown>
  created_at?: string | null
  updated_at?: string | null
}

export type MeetingSnippet = {
  id: string
  source_type: string
  text: string
  source_label: string | null
  created_at: string
}

export type ResolvedMeetingWorkspace = {
  space_id: string
  meeting_item_id: string
  conversation_id: string
}

export type MeetingDeliverable = {
  id: string
  title: string
  source: string | null
  custom_data: Record<string, unknown> | null
}

export type MeetingWorkspaceBundle = {
  meeting: {
    id: string
    title: string
    description: string | null
    source?: string | null
    status?: string | null
    custom_data: Record<string, unknown> | null
  }
  workspace: MeetingWorkspaceRecord | null
  recordings: MeetingRecording[]
  actions: MeetingAction[]
  snippets: MeetingSnippet[]
  deliverables: MeetingDeliverable[]
  context_links: Array<Record<string, unknown>>
  continuity: {
    prior_meeting_item_id: string | null
    unresolved_commitments: MeetingAction[]
  }
}

function path(spaceId: string, meetingItemId: string): string {
  return `/api/spaces/${spaceId}/meetings/${meetingItemId}`
}

export function fetchMeetingWorkspace(spaceId: string, meetingItemId: string) {
  return backendGet<MeetingWorkspaceBundle>(path(spaceId, meetingItemId))
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function meetingSource(value: string | null | undefined): CalendarAgendaEvent['source'] {
  return value === 'google_calendar' || value === 'outlook' || value === 'fathom' ? value : 'manual'
}

/** Rebuild the agenda-shaped route payload for a known persisted meeting workspace. */
export async function fetchMeetingWorkspaceEvent(
  spaceId: string,
  meetingItemId: string,
): Promise<CalendarAgendaEvent> {
  const bundle = await fetchMeetingWorkspace(spaceId, meetingItemId)
  const custom = bundle.meeting.custom_data ?? {}
  const start =
    firstText(
      custom.scheduled_start_at,
      custom.scheduled_start,
      custom.call_date,
      custom.recording_start_at,
      bundle.workspace?.live_started_at,
    ) ?? new Date().toISOString()
  const explicitEnd = firstText(custom.scheduled_end_at, custom.scheduled_end, custom.call_end)
  const primaryRecording = bundle.recordings.find((recording) => recording.is_primary)
  const durationMs = (primaryRecording?.duration_seconds ?? 3600) * 1000
  const end = explicitEnd ?? new Date(new Date(start).getTime() + durationMs).toISOString()

  return {
    id: firstText(custom.calendar_event_id) ?? meetingItemId,
    title: bundle.meeting.title,
    start,
    end,
    all_day: false,
    location: firstText(custom.location),
    description: bundle.meeting.description,
    video_url: firstText(custom.video_url, custom.meeting_url, custom.join_url),
    video_label: null,
    html_link: firstText(custom.html_link),
    color_id: null,
    attendees: [],
    source: meetingSource(bundle.meeting.source),
    related: {
      space_id: spaceId,
      call_item_id: meetingItemId,
      title: bundle.meeting.title,
      recording_url: primaryRecording?.recording_url ?? null,
      follow_ups: [],
    },
  }
}

export type MeetingRelatedCall = {
  meeting_item_id: string
  title: string
  call_date: string | null
  call_status: string | null
  recording_url: string | null
  score: number
}

export function fetchMeetingRelatedCalls(spaceId: string, meetingItemId: string) {
  return backendGet<MeetingRelatedCall[]>(`${path(spaceId, meetingItemId)}/related-calls`)
}

export function startMeetingCall(spaceId: string, meetingItemId: string) {
  return backendPost<MeetingWorkspaceRecord>(`${path(spaceId, meetingItemId)}/start`, {})
}

export function endMeetingCall(spaceId: string, meetingItemId: string) {
  return backendPatch<MeetingWorkspaceRecord>(`${path(spaceId, meetingItemId)}/phase`, {
    phase: 'processing',
  })
}

export function resolveScheduledMeeting(
  spaceId: string,
  event: CalendarAgendaEvent,
): Promise<ResolvedMeetingWorkspace> {
  return backendPost(`/api/spaces/${spaceId}/meetings/resolve`, {
    calendar_event_id: event.id,
    // Stable natural key — agenda row ids flip between providers/accounts.
    ical_uid: event.ical_uid ?? null,
    title: event.title,
    start: event.start,
    end: event.end,
    description: event.description ?? null,
    location: event.location ?? null,
    video_url: event.video_url,
    html_link: event.html_link,
    attendees: event.attendees.map((attendee) => ({
      email: attendee.email,
      name: attendee.name,
    })),
    organizer: event.organizer
      ? { email: event.organizer.email, name: event.organizer.name }
      : null,
  })
}

export function materializeScheduledMeetings(
  spaceId: string,
  events: CalendarAgendaEvent[],
): Promise<{ created: number; linked: number; skipped: number }> {
  return backendPost(`/api/spaces/${spaceId}/meetings/materialize`, {
    events: events.map((event) => ({
      calendar_event_id: event.id,
      ical_uid: event.ical_uid ?? null,
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.description ?? null,
      location: event.location ?? null,
      video_url: event.video_url,
      html_link: event.html_link,
      attendees: event.attendees.map((attendee) => ({
        email: attendee.email,
        name: attendee.name,
      })),
      organizer: event.organizer
        ? { email: event.organizer.email, name: event.organizer.name }
        : null,
    })),
  })
}

export function createInstantMeeting(
  spaceId: string,
  input: { title: string; attendeeEmails: string[] },
): Promise<ResolvedMeetingWorkspace> {
  return backendPost(`/api/spaces/${spaceId}/meetings/instant`, {
    title: input.title,
    attendee_emails: input.attendeeEmails,
  })
}

export function updateMeetingActionStatus(
  spaceId: string,
  meetingItemId: string,
  actionId: string,
  status: 'confirmed' | 'resolved',
) {
  return backendPatch<MeetingAction>(`${path(spaceId, meetingItemId)}/actions/${actionId}`, {
    status,
  })
}

/** Toggle a canonical Meetings task, falling back to the legacy action API. */
export async function toggleMeetingActionStatus(
  spaceId: string,
  meetingItemId: string,
  action: MeetingAction,
): Promise<MeetingAction> {
  const status = action.status === 'resolved' ? 'confirmed' : 'resolved'
  if (String(action.evidence?.origin ?? '') !== 'meetings_space_follow_up') {
    return updateMeetingActionStatus(spaceId, meetingItemId, action.id, status)
  }

  const completedAt = status === 'resolved' ? new Date().toISOString() : null
  const updated = await updateSpaceItem(spaceId, action.id, {
    status: status === 'resolved' ? 'done' : 'logged',
    custom_data: {
      completion_origin: status === 'resolved' ? { kind: 'user', completed_at: completedAt } : null,
    },
  })
  return {
    ...action,
    status,
    updated_at: updated.updated_at,
    evidence: {
      ...action.evidence,
      completion_origin: status === 'resolved' ? { kind: 'user', completed_at: completedAt } : null,
    },
  }
}

export function createMeetingAction(
  spaceId: string,
  meetingItemId: string,
  input: { title: string; assigneeName?: string | null },
) {
  return backendPost<MeetingAction>(`${path(spaceId, meetingItemId)}/actions`, {
    title: input.title,
    assignee_name: input.assigneeName ?? null,
  })
}

/** Relocate a meeting action item (a follow_up space item) into another space. */
export function transferMeetingActionToSpace(
  sourceSpaceId: string,
  itemId: string,
  targetSpaceId: string,
) {
  return backendPost<Record<string, unknown>>(
    `/api/spaces/${sourceSpaceId}/items/${itemId}/transfer-to-space`,
    { target_space_id: targetSpaceId, mode: 'move' },
  )
}

export function addMeetingSnippet(
  spaceId: string,
  meetingItemId: string,
  input: { text: string; sourceLabel?: string | null },
) {
  return backendPost<{ snippet: MeetingSnippet }>(`${path(spaceId, meetingItemId)}/snippets`, {
    source_type: 'observation',
    text: input.text,
    source_label: input.sourceLabel ?? null,
  }).then((response) => response.snippet)
}

export function linkMeetingRecording(
  spaceId: string,
  meetingItemId: string,
  meeting: FathomRecordingCandidate,
) {
  return backendPost<{
    success: boolean
    recording_id: string
    primary_recording_id: string
    meeting_item_id: string
  }>('/api/integrations/fathom/attach-to-meeting', {
    space_id: spaceId,
    meeting_item_id: meetingItemId,
    meeting,
  })
}
