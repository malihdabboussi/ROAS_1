const SCHEDULE_START_TOLERANCE_MS = 10 * 60 * 1000
const MIN_TITLE_TOKEN_OVERLAP = 0.5

export type MeetingIdentityAnchor = {
  calendarEventId: string | null
  title: string
  scheduledStart: string | null
  scheduledEnd: string | null
  participantEmails: string[]
}

export type MeetingRecordingCandidate = {
  provider: 'fathom' | 'fireflies' | (string & {})
  externalRecordingId: string
  calendarEventId: string | null
  title: string
  scheduledStart: string | null
  scheduledEnd: string | null
  recordingStart: string | null
  recordingEnd: string | null
  participantEmails: string[]
  transcriptEntries: number
  hasSummary: boolean
  actionItemCount: number
}

export type MeetingRecordingReconciliation = {
  attached: MeetingRecordingCandidate[]
  primary: MeetingRecordingCandidate | null
  supplemental: MeetingRecordingCandidate[]
  unmatched: MeetingRecordingCandidate[]
}

export function recordingDurationSeconds(recording: MeetingRecordingCandidate): number | null {
  const start = timestampMs(recording.recordingStart)
  const end = timestampMs(recording.recordingEnd)
  if (start === null || end === null || end < start) return null
  return Math.floor((end - start) / 1000)
}

export function reconcileMeetingRecordings(
  meeting: MeetingIdentityAnchor,
  recordings: MeetingRecordingCandidate[],
): MeetingRecordingReconciliation {
  const attached: MeetingRecordingCandidate[] = []
  const unmatched: MeetingRecordingCandidate[] = []

  for (const recording of recordings) {
    if (recordingMatchesMeeting(meeting, recording)) attached.push(recording)
    else unmatched.push(recording)
  }

  const primary = selectPrimaryRecording(attached)
  return {
    attached,
    primary,
    supplemental: primary
      ? attached.filter(
          (recording) => recording.externalRecordingId !== primary.externalRecordingId,
        )
      : [],
    unmatched,
  }
}

function recordingMatchesMeeting(
  meeting: MeetingIdentityAnchor,
  recording: MeetingRecordingCandidate,
): boolean {
  const meetingCalendarId = clean(meeting.calendarEventId)
  const recordingCalendarId = clean(recording.calendarEventId)
  if (meetingCalendarId && recordingCalendarId) {
    return meetingCalendarId === recordingCalendarId
  }

  const meetingStart = timestampMs(meeting.scheduledStart)
  const recordingStart = timestampMs(recording.scheduledStart ?? recording.recordingStart)
  if (
    meetingStart === null ||
    recordingStart === null ||
    Math.abs(meetingStart - recordingStart) > SCHEDULE_START_TOLERANCE_MS
  ) {
    return false
  }

  const sharedParticipants = participantOverlap(
    meeting.participantEmails,
    recording.participantEmails,
  )
  const titleOverlap = titleTokenOverlap(meeting.title, recording.title)
  const requiredParticipants = normalizedEmails(meeting.participantEmails).size >= 2 ? 2 : 1

  return sharedParticipants >= requiredParticipants || titleOverlap >= MIN_TITLE_TOKEN_OVERLAP
}

function selectPrimaryRecording(
  recordings: MeetingRecordingCandidate[],
): MeetingRecordingCandidate | null {
  return (
    recordings.slice().sort((left, right) => {
      const durationDiff =
        (recordingDurationSeconds(right) ?? -1) - (recordingDurationSeconds(left) ?? -1)
      if (durationDiff !== 0) return durationDiff
      const transcriptDiff = right.transcriptEntries - left.transcriptEntries
      if (transcriptDiff !== 0) return transcriptDiff
      const summaryDiff = Number(right.hasSummary) - Number(left.hasSummary)
      if (summaryDiff !== 0) return summaryDiff
      const actionDiff = right.actionItemCount - left.actionItemCount
      if (actionDiff !== 0) return actionDiff
      return left.externalRecordingId.localeCompare(right.externalRecordingId)
    })[0] ?? null
  )
}

function participantOverlap(left: string[], right: string[]): number {
  const leftEmails = normalizedEmails(left)
  const rightEmails = normalizedEmails(right)
  let matches = 0
  for (const email of leftEmails) {
    if (rightEmails.has(email)) matches += 1
  }
  return matches
}

function normalizedEmails(emails: string[]): Set<string> {
  return new Set(
    emails.map((email) => email.trim().toLowerCase()).filter((email) => email.includes('@')),
  )
}

function titleTokenOverlap(left: string, right: string): number {
  const leftTokens = titleTokens(left)
  const rightTokens = titleTokens(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0
  let matches = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) matches += 1
  }
  return matches / Math.min(leftTokens.size, rightTokens.size)
}

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  )
}

function timestampMs(value: string | null): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function clean(value: string | null): string {
  return value?.trim() ?? ''
}
