export const MEETING_CALL_STATUSES = ['live', 'completed', 'no_show', 'rescheduled'] as const
export type MeetingCallStatus = (typeof MEETING_CALL_STATUSES)[number]

const RESCHEDULE_DELTA_MS = 5 * 60 * 1000

export function isMeetingCallStatus(value: unknown): value is MeetingCallStatus {
  return MEETING_CALL_STATUSES.some((status) => status === value)
}

export function callStatusWhenRecordingLands(): MeetingCallStatus {
  return 'completed'
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
