import type {
  CalendarAgendaEvent,
  CalendarAgendaRelatedFollowUp,
} from '@/lib/services/calendar-api'

export function formatMeetingTimeRange(ev: CalendarAgendaEvent): string {
  const s = new Date(ev.start)
  const e = new Date(ev.end)
  if (ev.all_day) return 'All day'
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return `${s.toLocaleString('en-US', opts)} – ${e.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function isHttpUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

export function recordingLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('fathom')) return 'Open Fathom recording'
    return `Open recording (${host})`
  } catch {
    return 'Open recording'
  }
}

export function joinLinkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Join meeting'
  }
}

export function isYoursFollowUp(
  followUp: CalendarAgendaRelatedFollowUp,
  currentUserId: string | null,
): boolean {
  if (!currentUserId) return false
  return followUp.assignee_type === 'human' && followUp.assignee_id === currentUserId
}

export function attendeeStatusLabel(
  status: CalendarAgendaEvent['attendees'][number]['status'],
): string | null {
  if (status === 'accepted') return 'Yes'
  if (status === 'declined') return 'No'
  if (status === 'tentative') return 'Maybe'
  if (status === 'needsAction') return 'Pending'
  return null
}

export function resolveMeetingJoinUrl(ev: CalendarAgendaEvent): string | null {
  if (isHttpUrl(ev.video_url) && ev.source !== 'fathom') return ev.video_url.trim()
  if (isHttpUrl(ev.location)) return ev.location.trim()
  return null
}

export function prepOpenLabel(status: NonNullable<CalendarAgendaEvent['prep']>['status']): string {
  if (status === 'ready') return 'Open prep doc'
  if (status === 'failed') return 'Retry prep doc'
  return 'Prep generating…'
}
