'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  dayKeyInTimeZone,
  enumerateDayKeysInNavRange,
  eventsGroupedByDayKey,
} from '@/features/home/components/agenda-list-grouping'
import {
  agendaBoardFallbackWindow,
  AgendaCalendarPanel,
} from '@/features/home/components/AgendaCalendarPanel'
import {
  AgendaCardDisconnected,
  AgendaCardHeader,
  AgendaCardRangeNav,
} from '@/features/home/components/AgendaCardChrome'
import { AgendaCardListBody } from '@/features/home/components/AgendaCardListBody'
import { useAgendaPrepActions } from '@/features/home/hooks/use-agenda-prep-actions'
import {
  agendaListFetchWindow,
  filterEventsToWindow,
} from '@/features/home/lib/agenda-fetch-window'
import {
  dedupeAgendaEvents,
  pickNextAgendaEvent,
  tomorrowDayKey,
} from '@/features/home/lib/agenda-list-view'
import { minimalSpaceYourTurnItem } from '@/features/home/lib/home-your-turn-item'
import { cachedFetch, peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org'
import {
  fetchCalendarAgenda,
  type CalendarAgendaAccount,
  type CalendarAgendaEvent,
} from '@/lib/services/calendar-api'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { YourTurnItem } from '@/lib/your-turn/types'
import { HOME_TOAST_ERRORS } from '../config/home-toast-errors.config'

const AGENDA_CACHE_TTL_MS = 90_000

function isFathomAgendaEvent(ev: CalendarAgendaEvent): boolean {
  return ev.source === 'fathom'
}

type AgendaView = 'list' | 'board'
type ProviderFilter = 'all' | 'google_calendar' | 'outlook'
type DateRange = 'day' | 'week' | 'month'

export function AgendaCard({
  onOpenItem,
  onOpenMeeting,
}: {
  onOpenItem?: (item: YourTurnItem) => void | Promise<void>
  onOpenMeeting?: (event: CalendarAgendaEvent) => void
} = {}) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [view, setView] = useState<AgendaView>('list')
  const [day, setDay] = useState(() => new Date())
  const [range, setRange] = useState<DateRange>('week')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [provider, setProvider] = useState<ProviderFilter>('all')
  const [events, setEvents] = useState<CalendarAgendaEvent[]>([])
  const [accounts, setAccounts] = useState<CalendarAgendaAccount[]>([])
  const [connected, setConnected] = useState<{ google_calendar: boolean; outlook: boolean }>({
    google_calendar: false,
    outlook: false,
  })
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [boardFetchWindow, setBoardFetchWindow] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const hasCompletedLoadRef = useRef(false)
  const lastEventsRef = useRef<CalendarAgendaEvent[]>([])
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC')

  const load = useCallback(async () => {
    const hasWarmEvents = lastEventsRef.current.length > 0 || hasCompletedLoadRef.current
    const blocking = !hasWarmEvents
    if (blocking) setLoading(true)
    try {
      let fetchStart: Date
      let fetchEnd: Date
      let viewStart: Date
      let viewEnd: Date
      if (view === 'list') {
        const window = agendaListFetchWindow(day, range)
        fetchStart = window.fetchStart
        fetchEnd = window.fetchEnd
        viewStart = window.viewStart
        viewEnd = window.viewEnd
      } else {
        const w = boardFetchWindow ?? agendaBoardFallbackWindow(day, 1)
        fetchStart = w.start
        fetchEnd = w.end
        viewStart = w.start
        viewEnd = w.end
      }
      const start = fetchStart.toISOString()
      const end = fetchEnd.toISOString()
      const providerParam =
        provider === 'all'
          ? undefined
          : provider === 'google_calendar'
            ? 'google_calendar'
            : 'outlook'
      const cacheKey = `calendar-agenda:${start}:${end}:${timezone}:${providerParam ?? 'all'}`
      const peeked = peekCachedFetch<Awaited<ReturnType<typeof fetchCalendarAgenda>>>(cacheKey)
      if (peeked?.success) {
        setConnected(peeked.connected)
        setAccounts(peeked.accounts ?? [])
        const warmed =
          view === 'list'
            ? filterEventsToWindow(peeked.events ?? [], viewStart, viewEnd)
            : (peeked.events ?? [])
        lastEventsRef.current = warmed
        setEvents(warmed)
        setInitialized(true)
        hasCompletedLoadRef.current = true
        setLoading(false)
      }
      const res = await cachedFetch(
        cacheKey,
        () =>
          fetchCalendarAgenda({
            start,
            end,
            timezone,
            provider: providerParam,
          }),
        { ttlMs: AGENDA_CACHE_TTL_MS },
      )
      setConnected(res.connected)
      setAccounts(res.accounts ?? [])
      if (!res.success && res.error) {
        toast.error(HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage)
        if (!hasWarmEvents) setEvents([])
      } else {
        const fetched = res.events ?? []
        const next = view === 'list' ? filterEventsToWindow(fetched, viewStart, viewEnd) : fetched
        lastEventsRef.current = next
        setEvents(next)
      }
    } catch (e) {
      toast.error(sanitizeUserError(e, HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage))
      if (!hasWarmEvents) setEvents([])
    } finally {
      if (blocking) setLoading(false)
      setInitialized(true)
      hasCompletedLoadRef.current = true
    }
  }, [day, timezone, provider, view, range, boardFetchWindow])

  useEffect(() => {
    if (view === 'list') setBoardFetchWindow(null)
  }, [view])

  useEffect(() => {
    if (!initialized) return
    if (!connected.google_calendar && provider === 'google_calendar') setProvider('all')
    if (!connected.outlook && provider === 'outlook') setProvider('all')
  }, [initialized, connected.google_calendar, connected.outlook, provider])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const anyConnected = connected.google_calendar || connected.outlook
  const bothConnected = connected.google_calendar && connected.outlook
  const showAccountLabel = accounts.length > 1 || events.some((ev) => isFathomAgendaEvent(ev))
  const hasFathomEvents = events.some((ev) => isFathomAgendaEvent(ev))
  const showAgendaSurface = anyConnected || hasFathomEvents

  const isToday = useMemo(() => {
    const now = new Date()
    return (
      day.getFullYear() === now.getFullYear() &&
      day.getMonth() === now.getMonth() &&
      day.getDate() === now.getDate()
    )
  }, [day])

  const visibleEvents = useMemo(() => {
    const sorted = dedupeAgendaEvents(
      [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    )
    if (!isToday) return sorted
    return sorted.filter((ev) => new Date(ev.end).getTime() > nowTick)
  }, [events, isToday, nowTick])

  const eventKey = (ev: CalendarAgendaEvent) => `${ev.account_id ?? ev.source}:${ev.id}`
  const nextEvent = useMemo(
    () => (isToday ? pickNextAgendaEvent(visibleEvents, nowTick) : null),
    [isToday, visibleEvents, nowTick],
  )
  const nextEventKey = nextEvent ? eventKey(nextEvent) : null
  const tomorrowKey = useMemo(() => tomorrowDayKey(nowTick, timezone), [nowTick, timezone])
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null)

  useEffect(() => {
    setSelectedEventKey((curr) => {
      if (curr && visibleEvents.some((ev) => eventKey(ev) === curr)) return curr
      return nextEventKey ?? (visibleEvents[0] ? eventKey(visibleEvents[0]) : null)
    })
  }, [visibleEvents, nextEventKey])

  const dividerDayKeys = useMemo(
    () =>
      range === 'week' || range === 'month' ? enumerateDayKeysInNavRange(day, range, timezone) : [],
    [day, range, timezone],
  )

  const groupedVisible = useMemo(
    () => eventsGroupedByDayKey(visibleEvents, timezone),
    [visibleEvents, timezone],
  )

  const skipDividerDayKey = useMemo(
    () =>
      isToday && (range === 'week' || range === 'month')
        ? dayKeyInTimeZone(new Date(nowTick), timezone)
        : null,
    [isToday, range, nowTick, timezone],
  )

  const handleBoardVisibleWindow = useCallback((window: { start: Date; end: Date }) => {
    setBoardFetchWindow(window)
  }, [])

  const openCalendarIntegration = useCallback(
    (integrationId: 'google_calendar' | 'outlook') => {
      openWorkspaceSettings('integrations', {
        integrationsFocusIntegrationId: integrationId,
      })
    },
    [openWorkspaceSettings],
  )

  const { prepRunning, handlePrepClick, runPrepToday } = useAgendaPrepActions({
    timezone,
    activeOrgId,
    onOpenItem,
    reloadAgenda: load,
  })

  const openAgendaEvent = useCallback(
    (ev: CalendarAgendaEvent) => {
      if (isFathomAgendaEvent(ev) && ev.related) {
        if (!onOpenItem) return
        void onOpenItem(
          minimalSpaceYourTurnItem(
            ev.related.space_id,
            ev.related.call_item_id,
            ev.related.title || ev.title,
            null,
          ),
        )
        return
      }
      onOpenMeeting?.(ev)
    },
    [onOpenItem, onOpenMeeting],
  )

  const openPrepForEvent = useCallback(
    (ev: CalendarAgendaEvent) => {
      if (isFathomAgendaEvent(ev)) return undefined
      return () => handlePrepClick(ev)
    },
    [handlePrepClick],
  )

  return (
    <div className="section-card card-elevated flex h-[420px] flex-col overflow-hidden">
      <AgendaCardHeader
        showAgendaSurface={showAgendaSurface}
        accounts={accounts}
        anyConnected={anyConnected}
        bothConnected={bothConnected}
        provider={provider}
        setProvider={setProvider}
        view={view}
        setView={setView}
        prepRunning={prepRunning}
        runPrepToday={runPrepToday}
      />

      {showAgendaSurface && view === 'list' ? (
        <AgendaCardRangeNav
          day={day}
          range={range}
          rangeOpen={rangeOpen}
          setRangeOpen={setRangeOpen}
          setDay={setDay}
          setRange={setRange}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!initialized ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : !showAgendaSurface ? (
          <AgendaCardDisconnected openCalendarIntegration={openCalendarIntegration} />
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : view === 'list' ? (
          <AgendaCardListBody
            visibleEvents={visibleEvents}
            isToday={isToday}
            nextEvent={nextEvent}
            nextEventKey={nextEventKey}
            selectedEventKey={selectedEventKey}
            setSelectedEventKey={setSelectedEventKey}
            range={range}
            tomorrowKey={tomorrowKey}
            dividerDayKeys={dividerDayKeys}
            skipDividerDayKey={skipDividerDayKey}
            groupedVisible={groupedVisible}
            nowTick={nowTick}
            timezone={timezone}
            showAccountLabel={showAccountLabel}
            openAgendaEvent={openAgendaEvent}
            openPrepForEvent={openPrepForEvent}
          />
        ) : (
          <AgendaCalendarPanel
            events={events}
            navigationAnchor={day}
            defaultScope="week"
            timeFormat="12h"
            weekStart={1}
            onVisibleWindowChange={handleBoardVisibleWindow}
          />
        )}
      </div>
    </div>
  )
}
