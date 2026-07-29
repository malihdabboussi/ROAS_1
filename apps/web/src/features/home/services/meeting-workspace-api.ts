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
  recording_url: string | null
  duration_seconds: number | null
  is_primary: boolean
  provider_summary: string | null
  transcript_doc_item_id: string | null
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

export type MeetingSnippetResult = {
  snippet: MeetingSnippet
  conversation_id: string
  message_id: string
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

export function addMeetingSnippet(
  spaceId: string,
  meetingItemId: string,
  text: string,
  sourceType: 'observation' | 'call_quote',
) {
  return backendPost<MeetingSnippetResult>(`${path(spaceId, meetingItemId)}/snippets`, {
    source_type: sourceType,
    text,
    source_label: sourceType === 'call_quote' ? 'Call snippet' : 'Live note',
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
