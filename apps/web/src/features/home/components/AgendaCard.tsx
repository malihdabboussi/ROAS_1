'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutList,
} from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useAgendaPrepActions } from '@/features/home/hooks/use-agenda-prep-actions'
import { useOrgStore } from '@/features/org/store/use-org-store'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import {
  agendaBoardFallbackWindow,
  AgendaCalendarPanel,
} from '@/features/home/components/AgendaCalendarPanel'
import { AgendaEmptyIllustration } from '@/features/home/components/AgendaEmptyIllustration'
import { AgendaEventEntry } from '@/features/home/components/AgendaCardEventEntry'
import {
  AgendaWeekDaySeparator,
  dayKeyInTimeZone,
  enumerateDayKeysInNavRange,
  eventsGroupedByDayKey,
} from '@/features/home/components/agenda-list-grouping'
import { agendaListFetchWindow, filterEventsToWindow } from '@/features/home/lib/agenda-fetch-window'
import {
  dedupeAgendaEvents,
  pickNextAgendaEvent,
  tomorrowDayKey,
} from '@/features/home/lib/agenda-list-view'
import { askAboutAgendaInChat } from '@/features/home/lib/ask-agenda-in-chat'
import { useWorkspaceSettingsModal } from '@/features/settings'
import { cachedFetch, peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import {
  fetchCalendarAgenda,
  type CalendarAgendaAccount,
  type CalendarAgendaEvent,
} from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { HOME_TOAST_ERRORS } from '../config/home-toast-errors.config'

const AGENDA_CACHE_TTL_MS = 90_000

type AgendaView = 'list' | 'board'
type ProviderFilter = 'all' | 'google_calendar' | 'outlook'
type DateRange = 'day' | 'week' | 'month'

const CALENDAR_PROVIDER_CONNECT: {
  integrationId: 'google_calendar' | 'outlook'
  label: string
}[] = [
  {
    integrationId: 'google_calendar',
    label: 'Connect Google Calendar',
  },
  {
    integrationId: 'outlook',
    label: 'Connect Microsoft Outlook',
  },
]

function formatNavDate(d: Date, range: DateRange): string {
  if (range === 'day')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (range === 'week') {
    const end = new Date(d.getTime() + 6 * 86400000)
    const sameMonth = d.getMonth() === end.getMonth()
    if (sameMonth)
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.getDate()}`
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function stepDate(d: Date, range: DateRange, direction: 1 | -1): Date {
  if (range === 'day') return new Date(d.getTime() + direction * 86400000)
  if (range === 'week') return new Date(d.getTime() + direction * 7 * 86400000)
  const m = new Date(d)
  m.setMonth(m.getMonth() + direction)
  return m
}

function rangeDetail(d: Date, r: DateRange): string {
  if (r === 'day')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (r === 'week') {
    const end = new Date(d.getTime() + 6 * 86400000)
    const sameMonth = d.getMonth() === end.getMonth()
    if (sameMonth)
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.getDate()}`
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

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
        const next =
          view === 'list' ? filterEventsToWindow(fetched, viewStart, viewEnd) : fetched
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
  const showAccountLabel = accounts.length > 1

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

  /** When browsing "today", today's rows sit at the top without their own divider; first pill is Tomorrow. */
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

  return (
    <div className="section-card card-elevated flex h-[420px] flex-col overflow-hidden">
      <div className="agenda-card-header">
        <div className="flex items-center gap-2">
          <CalendarClock className="text-icon h-4 w-4 shrink-0" />
          <span className="agenda-card-title">Agenda</span>
          {anyConnected ? (
            <button
              type="button"
              onClick={() => askAboutAgendaInChat(accounts)}
              className="rounded-md p-1 transition-opacity hover:opacity-90"
              aria-label="Ask Vibey about your agenda"
              title="Ask Vibey"
            >
              <img
                src="/Logos/roas/icon-black.png"
                alt=""
                className="h-5 w-5 dark:hidden"
              />
              <img
                src="/Logos/roas/icon-white.png"
                alt=""
                className="hidden h-5 w-5 dark:block"
              />
            </button>
          ) : null}
        </div>
        {anyConnected && (
          <div className="flex flex-wrap items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => void runPrepToday()}
              disabled={prepRunning}
              className="button-glass-secondary rounded-spacing-2 typo-caption inline-flex items-center gap-1 px-2 py-1 font-medium disabled:opacity-50"
              title="Generate pre-call prep docs for today’s meetings"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {prepRunning ? 'Prepping…' : 'Prep today'}
            </button>
            {bothConnected && (
              <div className="bg-muted/50 mr-1 flex rounded-lg p-0.5">
                {(['all', 'google_calendar', 'outlook'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`typo-caption rounded-md px-2 py-1 ${
                      provider === p
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p === 'all' ? 'All' : p === 'google_calendar' ? 'Google' : 'Outlook'}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-md p-1.5 ${view === 'list' ? 'btn-icon-glass--active' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={`rounded-md p-1.5 ${view === 'board' ? 'btn-icon-glass--active' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Calendar views"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {anyConnected && view === 'list' && (
        <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-2 sm:px-5">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
            aria-label={`Previous ${range}`}
            onClick={() => setDay((d) => stepDate(d, range, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative" data-range-dropdown>
            <button
              type="button"
              className="body-3 text-foreground flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors hover:bg-[var(--color-hover-subtle)]"
              onClick={() => setRangeOpen((v) => !v)}
            >
              {formatNavDate(day, range)}
              <ChevronDown className="text-muted-foreground h-3 w-3" />
            </button>
            {rangeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
                <div className="dropdown-menu-solid absolute left-1/2 top-full mt-1 min-w-[220px] -translate-x-1/2 py-1">
                  {(['day', 'week', 'month'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors ${
                        range === r ? 'text-foreground font-semibold' : 'text-foreground'
                      }`}
                      onClick={() => {
                        setRange(r)
                        setRangeOpen(false)
                      }}
                    >
                      <span className="capitalize">{r}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {rangeDetail(day, r)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
            aria-label={`Next ${range}`}
            onClick={() => setDay((d) => stepDate(d, range, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!initialized ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : !anyConnected ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:px-6">
            <AgendaEmptyIllustration />
            <div className="max-w-md text-center">
              <p className="body-3 font-semibold text-[var(--foreground)]">
                Calendar not connected yet
              </p>
              <p className="body-3 mt-2 leading-relaxed text-[var(--color-muted-foreground)]">
                Tap a provider to open its integration and connect.
              </p>
            </div>
            <div className="gap-spacing-3 flex flex-wrap items-center justify-center">
              {CALENDAR_PROVIDER_CONNECT.map(({ integrationId, label }) => {
                const src = getIntegrationLogoPath(integrationId)
                return (
                  <button
                    key={integrationId}
                    type="button"
                    onClick={() => openCalendarIntegration(integrationId)}
                    className="rounded-spacing-2 relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-white p-1.5 transition-opacity hover:opacity-90"
                    aria-label={label}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        className="block h-7 w-7 object-contain object-center"
                      />
                    ) : (
                      <span className="typo-caption text-muted-foreground font-medium">
                        {(integrationId === 'google_calendar'
                          ? 'Google Calendar'
                          : 'Microsoft Outlook'
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : view === 'list' ? (
          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {visibleEvents.length === 0 && isToday ? (
              <p className="body-3 text-muted-foreground">No more events today.</p>
            ) : null}
            {visibleEvents.length > 0 && isToday && nextEvent ? (
              <div className="space-y-1">
                <AgendaEventEntry
                  ev={nextEvent}
                  isExpanded
                  isNextHero
                  onSelect={() => setSelectedEventKey(nextEventKey)}
                  onOpenMeeting={onOpenMeeting ? () => onOpenMeeting(nextEvent) : undefined}
                  onOpenPrep={() => handlePrepClick(nextEvent)}
                  nowTick={nowTick}
                  showAccountLabel={showAccountLabel}
                />
                {(range === 'week' || range === 'month') &&
                (groupedVisible.get(tomorrowKey)?.length ?? 0) > 0 ? (
                  <AgendaWeekDaySeparator
                    dayKey={tomorrowKey}
                    nowTick={nowTick}
                    timeZone={timezone}
                  />
                ) : null}
                <div className="space-y-1">
                  {dividerDayKeys.map((dk) => {
                    if (skipDividerDayKey !== null && dk === skipDividerDayKey) return null
                    const dayEvts = (groupedVisible.get(dk) ?? []).filter(
                      (ev) => eventKey(ev) !== nextEventKey,
                    )
                    if (!dayEvts.length) return null
                    return (
                      <div key={dk}>
                        {dk !== tomorrowKey ? (
                          <AgendaWeekDaySeparator
                            dayKey={dk}
                            nowTick={nowTick}
                            timeZone={timezone}
                          />
                        ) : null}
                        <ul className="space-y-1">
                          {dayEvts.map((ev) => (
                            <li key={eventKey(ev)}>
                              <AgendaEventEntry
                                ev={ev}
                                isExpanded={false}
                                onSelect={() => setSelectedEventKey(eventKey(ev))}
                                onOpenMeeting={
                                  onOpenMeeting ? () => onOpenMeeting(ev) : undefined
                                }
                                onOpenPrep={() => handlePrepClick(ev)}
                                nowTick={nowTick}
                                showAccountLabel={showAccountLabel}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
            {visibleEvents.length > 0 && !(isToday && nextEvent) ? (
              range === 'week' || range === 'month' ? (
                <div className="space-y-0.5">
                  {dividerDayKeys.map((dk) => {
                    const dayEvts = groupedVisible.get(dk)
                    if (!dayEvts?.length) return null
                    const omitDivider = skipDividerDayKey !== null && dk === skipDividerDayKey
                    return (
                      <div key={dk}>
                        {!omitDivider ? (
                          <AgendaWeekDaySeparator
                            dayKey={dk}
                            nowTick={nowTick}
                            timeZone={timezone}
                          />
                        ) : null}
                        <ul className="space-y-1">
                          {dayEvts.map((ev) => (
                            <li key={eventKey(ev)}>
                              <AgendaEventEntry
                                ev={ev}
                                isExpanded={eventKey(ev) === selectedEventKey}
                                onSelect={() => setSelectedEventKey(eventKey(ev))}
                                onOpenMeeting={
                                  onOpenMeeting ? () => onOpenMeeting(ev) : undefined
                                }
                                onOpenPrep={() => handlePrepClick(ev)}
                                nowTick={nowTick}
                                showAccountLabel={showAccountLabel}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <ul className="space-y-1">
                  {visibleEvents.map((ev) => (
                    <li key={eventKey(ev)}>
                      <AgendaEventEntry
                        ev={ev}
                        isExpanded={eventKey(ev) === selectedEventKey}
                        onSelect={() => setSelectedEventKey(eventKey(ev))}
                        onOpenMeeting={
                          onOpenMeeting ? () => onOpenMeeting(ev) : undefined
                        }
                        onOpenPrep={() => handlePrepClick(ev)}
                        nowTick={nowTick}
                        showAccountLabel={showAccountLabel}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
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
