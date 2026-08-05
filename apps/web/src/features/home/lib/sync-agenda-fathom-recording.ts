import {
  linkMeetingRecording,
  type FathomRecordingCandidate,
  type MeetingWorkspaceBundle,
} from '@/features/home/services/meeting-workspace-api'
import { listFathomMeetings } from '@/lib/brain'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

/**
 * Copy the agenda's already-linked Fathom recording into meeting_recordings.
 * Uses the same related/video_url identity Home Agenda already resolved — does
 * not invent a second matching algorithm.
 */
export async function syncAgendaFathomRecordingToWorkspace(input: {
  spaceId: string
  meetingItemId: string
  agendaEvent: CalendarAgendaEvent
  bundle: MeetingWorkspaceBundle
}): Promise<boolean> {
  if (input.bundle.recordings.length > 0) return false

  const related = input.agendaEvent.related
  // Agenda may keep source=google_calendar after mergeFathomIntoNearStartCalendars
  // and still carry the Fathom recording on related / video_url — use that link.
  const recordingUrl = agendaFathomRecordingUrl(input.agendaEvent)
  const recordingId = related?.external_recording_id?.trim() || null
  const title = related?.title?.trim() || input.agendaEvent.title.trim() || 'Fathom recording'

  if (recordingId) {
    await linkMeetingRecording(input.spaceId, input.meetingItemId, {
      recording_id: recordingId,
      title,
      url: recordingUrl ?? undefined,
    })
    return true
  }

  if (!recordingUrl) return false

  const listed = await listFathomMeetings()
  const match = listed.items.find((meeting) => meetingMatchesAgendaUrl(meeting, recordingUrl))
  if (!match) return false

  await linkMeetingRecording(
    input.spaceId,
    input.meetingItemId,
    match as unknown as FathomRecordingCandidate,
  )
  return true
}

/** Fathom recording URL already resolved onto the agenda card (related or merged video_url). */
export function agendaFathomRecordingUrl(event: CalendarAgendaEvent): string | null {
  const candidates = [event.related?.recording_url, event.video_url]
  for (const value of candidates) {
    const url = typeof value === 'string' ? value.trim() : ''
    if (url && isFathomRecordingUrl(url)) return url
  }
  return null
}

function isFathomRecordingUrl(url: string): boolean {
  return /fathom\.video\/(?:calls|share)\//i.test(url)
}

function meetingMatchesAgendaUrl(
  meeting: { url?: string | null; share_url?: string | null },
  recordingUrl: string,
): boolean {
  const targets = [meeting.url, meeting.share_url]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  return targets.some((url) => url === recordingUrl || urlsShareCallId(url, recordingUrl))
}

function urlsShareCallId(left: string, right: string): boolean {
  const leftId = fathomCallId(left)
  const rightId = fathomCallId(right)
  return Boolean(leftId && rightId && leftId === rightId)
}

function fathomCallId(url: string): string | null {
  const match = url.match(/fathom\.video\/(?:calls|share)\/([^/?#]+)/i)
  return match?.[1] ?? null
}
