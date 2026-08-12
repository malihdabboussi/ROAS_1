import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

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
  canonical_assignee_name: string | null
  canonical_assignee_email: string | null
  evidence: Record<string, unknown>
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
  return backendPost<MeetingSnippet>(`${path(spaceId, meetingItemId)}/snippets`, {
    source_type: 'observation',
    text: input.text,
    source_label: input.sourceLabel ?? null,
  })
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
