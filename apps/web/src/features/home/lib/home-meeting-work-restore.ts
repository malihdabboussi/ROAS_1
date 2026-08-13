import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

export const HOME_MEETING_WORK_RESTORE_FEATURE = 'home_meeting' as const

export const HOME_MEETINGS_ROUTE = '/home/meetings'
export const HOME_MEETING_PARAM = 'meeting'
export const HOME_MEETING_SPACE_PARAM = 'space'

/** Canonical href for a remembered meeting surface — the id survives in the URL. */
export function homeMeetingHref(
  event: Pick<CalendarAgendaEvent, 'id'>,
  spaceId?: string | null,
): string {
  const params = new URLSearchParams({ [HOME_MEETING_PARAM]: event.id })
  if (spaceId) params.set(HOME_MEETING_SPACE_PARAM, spaceId)
  return `${HOME_MEETINGS_ROUTE}?${params.toString()}`
}

/** Matches by calendar event id or by the linked Meetings call item id. */
export function agendaEventMatchesMeetingParam(
  event: CalendarAgendaEvent,
  meetingParam: string,
): boolean {
  return event.id === meetingParam || event.related?.call_item_id === meetingParam
}

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
