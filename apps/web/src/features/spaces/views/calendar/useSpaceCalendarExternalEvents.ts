import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchCalendarAgenda,
  type CalendarAgendaEvent,
  type CalendarProvider,
} from '@/lib/services/calendar-api'

type VisibleWindow = { start: Date; end: Date } | null

type UseSpaceCalendarExternalEventsInput = {
  visibleWindow: VisibleWindow
  providers: CalendarProvider[]
  timezone: string
  enabled: boolean
}

type UseSpaceCalendarExternalEventsResult = {
  events: CalendarAgendaEvent[]
  connected: { google_calendar: boolean; outlook: boolean }
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const EMPTY_CONNECTED = { google_calendar: false, outlook: false }
const EXTERNAL_CALENDAR_WINDOW_BUFFER_DAYS = 28

export function expandCalendarVisibleWindow(
  visibleWindow: { start: Date; end: Date },
  bufferDays = EXTERNAL_CALENDAR_WINDOW_BUFFER_DAYS,
): { start: Date; end: Date } {
  const start = new Date(visibleWindow.start)
  const end = new Date(visibleWindow.end)
  start.setDate(start.getDate() - bufferDays)
  end.setDate(end.getDate() + bufferDays)
  return { start, end }
}

export function useSpaceCalendarExternalEvents({
  visibleWindow,
  providers,
  timezone,
  enabled,
}: UseSpaceCalendarExternalEventsInput): UseSpaceCalendarExternalEventsResult {
  const [events, setEvents] = useState<CalendarAgendaEvent[]>([])
  const [connected, setConnected] = useState(EMPTY_CONNECTED)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const providerKey = useMemo(() => providers.join(','), [providers])

  const load = useCallback(async () => {
    if (!enabled || !visibleWindow || providers.length === 0) {
      setEvents([])
      setConnected(EMPTY_CONNECTED)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const fetchWindow = expandCalendarVisibleWindow(visibleWindow)
      const response = await fetchCalendarAgenda({
        start: fetchWindow.start.toISOString(),
        end: fetchWindow.end.toISOString(),
        timezone,
        provider: providers.length === 1 ? providers[0] : undefined,
      })
      setEvents(
        response.events.filter((event) => (providers as readonly string[]).includes(event.source)),
      )
      setConnected(response.connected)
      setError(response.success ? null : response.error || 'Failed to load calendar events')
    } catch (err) {
      setEvents([])
      setError(err instanceof Error ? err.message : 'Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [enabled, providers, timezone, visibleWindow])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!enabled || !visibleWindow || providers.length === 0) {
        if (!cancelled) {
          setEvents([])
          setConnected(EMPTY_CONNECTED)
          setLoading(false)
          setError(null)
        }
        return
      }

      setLoading(true)
      setError(null)
      try {
        const fetchWindow = expandCalendarVisibleWindow(visibleWindow)
        const response = await fetchCalendarAgenda({
          start: fetchWindow.start.toISOString(),
          end: fetchWindow.end.toISOString(),
          timezone,
          provider: providers.length === 1 ? providers[0] : undefined,
        })
        if (cancelled) return
        setEvents(response.events.filter((event) => providers.includes(event.source)))
        setConnected(response.connected)
        setError(response.success ? null : response.error || 'Failed to load calendar events')
      } catch (err) {
        if (cancelled) return
        setEvents([])
        setError(err instanceof Error ? err.message : 'Failed to load calendar events')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [enabled, providerKey, providers, timezone, visibleWindow])

  return { events, connected, loading, error, reload: load }
}
