export const HOME_MEETING_WORK_RESTORE_FEATURE = 'home_meeting' as const

export function isCalendarAgendaEventLike(value: unknown): value is {
  id: string
  title: string
  start: string
  end: string
  source: string
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.title === 'string' &&
    typeof row.start === 'string' &&
    typeof row.end === 'string' &&
    typeof row.source === 'string'
  )
}
