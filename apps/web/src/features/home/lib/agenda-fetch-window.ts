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

/** Calendar weeks are always Monday through Sunday, independent of today's weekday. */
export function startOfAgendaWeek(d: Date): Date {
  const x = startOfDay(d)
  const daysSinceMonday = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - daysSinceMonday)
  return x
}

export function agendaRangeStartDate(d: Date, range: AgendaDateRange): Date {
  return range === 'week' ? startOfAgendaWeek(d) : startOfDay(d)
}

export function agendaRangeEndDate(d: Date, range: AgendaDateRange): Date {
  if (range === 'day') return endOfDay(d)
  if (range === 'week') {
    const end = startOfAgendaWeek(d)
    end.setDate(end.getDate() + 6)
    return endOfDay(end)
  }
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** Fetch a covering month (plus list range) so day/week switches can filter locally. */
export function agendaListFetchWindow(
  day: Date,
  range: AgendaDateRange,
): { fetchStart: Date; fetchEnd: Date; viewStart: Date; viewEnd: Date } {
  const viewStart = agendaRangeStartDate(day, range)
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
