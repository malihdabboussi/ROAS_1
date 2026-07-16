export type AgendaDateRange = 'day' | 'week' | 'month'

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function agendaRangeEndDate(d: Date, range: AgendaDateRange): Date {
  if (range === 'day') return endOfDay(d)
  if (range === 'week') return endOfDay(new Date(d.getTime() + 6 * 86400000))
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** Fetch a covering month (plus list range) so day/week switches can filter locally. */
export function agendaListFetchWindow(
  day: Date,
  range: AgendaDateRange,
): { fetchStart: Date; fetchEnd: Date; viewStart: Date; viewEnd: Date } {
  const viewStart = startOfDay(day)
  const viewEnd = agendaRangeEndDate(day, range)
  const monthStart = new Date(day.getFullYear(), day.getMonth(), 1, 0, 0, 0, 0)
  const monthEnd = new Date(day.getFullYear(), day.getMonth() + 1, 0, 23, 59, 59, 999)
  return {
    fetchStart: new Date(Math.min(monthStart.getTime(), viewStart.getTime())),
    fetchEnd: new Date(Math.max(monthEnd.getTime(), viewEnd.getTime())),
    viewStart,
    viewEnd,
  }
}

export function filterEventsToWindow<T extends { start: string; end: string }>(
  events: T[],
  viewStart: Date,
  viewEnd: Date,
): T[] {
  const startMs = viewStart.getTime()
  const endMs = viewEnd.getTime()
  return events.filter((event) => {
    const eventStart = new Date(event.start).getTime()
    const eventEnd = new Date(event.end).getTime()
    if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) return false
    return eventStart <= endMs && eventEnd >= startMs
  })
}
