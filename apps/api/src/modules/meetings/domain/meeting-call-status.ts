export const MEETING_CALL_STATUSES = [
  'upcoming',
  'live',
  'completed',
  'no_show',
  'rescheduled',
] as const
export type MeetingCallStatus = (typeof MEETING_CALL_STATUSES)[number]

const RESCHEDULE_DELTA_MS = 5 * 60 * 1000

export function isMeetingCallStatus(value: unknown): value is MeetingCallStatus {
  return MEETING_CALL_STATUSES.some((status) => status === value)
}

export function callStatusWhenRecordingLands(): MeetingCallStatus {
  return 'completed'
}

export function callStatusForScheduledMeeting(
  start: string | null | undefined,
  end: string | null | undefined,
  now = new Date(),
): MeetingCallStatus | null {
  const startMs = new Date(String(start ?? '')).getTime()
  if (!Number.isFinite(startMs)) return null
  const nowMs = now.getTime()
  if (startMs > nowMs) return 'upcoming'
  const endMs = new Date(String(end ?? '')).getTime()
  if (Number.isFinite(endMs) && nowMs <= endMs) return 'live'
  return null
}

export function callStatusWhenInviteMoved(current: unknown): MeetingCallStatus | null {
  if (current === 'completed' || current === 'no_show' || current === 'live') return null
  return 'rescheduled'
}

export function inviteTimesMoved(previousStart: string | null, nextStart: string | null): boolean {
  if (!previousStart || !nextStart) return false
  const previousMs = new Date(previousStart).getTime()
  const nextMs = new Date(nextStart).getTime()
  if (!Number.isFinite(previousMs) || !Number.isFinite(nextMs)) return false
  return Math.abs(nextMs - previousMs) > RESCHEDULE_DELTA_MS
}
