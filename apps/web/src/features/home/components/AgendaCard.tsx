'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  agendaBoardFallbackWindow,
  AgendaCalendarPanel,
} from '@/features/home/components/AgendaCalendarPanel'
import { AgendaEmptyIllustration } from '@/features/home/components/AgendaEmptyIllustration'
import { useWorkspaceSettingsModal } from '@/features/settings'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import {
  fetchCalendarAgenda,
  type CalendarAgendaEvent,
  type CalendarAttendee,
} from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { HOME_TOAST_ERRORS } from '../config/home-toast-errors.config'

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

const GCAL_EVENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  '1': { border: '#7986CB', bg: 'rgba(121,134,203,0.25)', text: '#C5CAE9' },
  '2': { border: '#33B679', bg: 'rgba(51,182,121,0.25)', text: '#A5D6A7' },
  '3': { border: '#8E24AA', bg: 'rgba(142,36,170,0.25)', text: '#CE93D8' },
  '4': { border: '#E67C73', bg: 'rgba(230,124,115,0.25)', text: '#EF9A9A' },
  '5': { border: '#F6BF26', bg: 'rgba(246,191,38,0.25)', text: '#FFF59D' },
  '6': { border: '#F4511E', bg: 'rgba(244,81,30,0.25)', text: '#FFAB91' },
  '7': { border: '#039BE5', bg: 'rgba(3,155,229,0.25)', text: '#81D4FA' },
  '8': { border: '#616161', bg: 'rgba(97,97,97,0.25)', text: '#BDBDBD' },
  '9': { border: '#3F51B5', bg: 'rgba(63,81,181,0.25)', text: '#9FA8DA' },
  '10': { border: '#0B8043', bg: 'rgba(11,128,67,0.25)', text: '#A5D6A7' },
  '11': { border: '#D50000', bg: 'rgba(213,0,0,0.25)', text: '#EF9A9A' },
}
const DEFAULT_EVENT_COLOR = { border: '#F6BF26', bg: 'rgba(246,191,38,0.18)', text: '#FFF59D' }

function eventColor(ev: CalendarAgendaEvent): (typeof GCAL_EVENT_COLORS)[string] {
  if (ev.color_id) {
    const c = GCAL_EVENT_COLORS[ev.color_id]
    if (c) return c
  }
  return DEFAULT_EVENT_COLOR
}

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

function rangeEndDate(d: Date, range: DateRange): Date {
  if (range === 'day') return endOfDay(d)
  if (range === 'week') return endOfDay(new Date(d.getTime() + 6 * 86400000))
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return next
}

function stepDate(d: Date, range: DateRange, direction: 1 | -1): Date {
  if (range === 'day') return new Date(d.getTime() + direction * 86400000)
  if (range === 'week') return new Date(d.getTime() + direction * 7 * 86400000)
  const m = new Date(d)
  m.setMonth(m.getMonth() + direction)
  return m
}

function formatTimeRange(ev: CalendarAgendaEvent): string {
  const s = new Date(ev.start)
  const e = new Date(ev.end)
  if (ev.all_day) return 'All day'
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${s.toLocaleTimeString('en-US', opts)} – ${e.toLocaleTimeString('en-US', opts)}`
}

function minutesBetween(a: number, b: number): number {
  return Math.max(0, Math.round((b - a) / 60000))
}

function formatCountdown(now: number, ev: CalendarAgendaEvent): string | null {
  const s = new Date(ev.start).getTime()
  const e = new Date(ev.end).getTime()
  if (s <= now && e >= now) {
    const left = minutesBetween(now, e)
    if (left > 60) return `${Math.floor(left / 60)}h ${left % 60}m left`
    return `${left}m left`
  }
  if (s > now) {
    const until = minutesBetween(now, s)
    if (until > 60) return `in ${Math.floor(until / 60)}h ${until % 60}m`
    return `in ${until}m`
  }
  return null
}

function attendeeRsvpSummary(attendees: CalendarAttendee[]): string | null {
  if (attendees.length === 0) return null
  const accepted = attendees.filter((a) => a.status === 'accepted').length
  const declined = attendees.filter((a) => a.status === 'declined').length
  const parts: string[] = []
  if (accepted > 0) parts.push(`${accepted} Yes`)
  if (declined > 0) parts.push(`${declined} No`)
  const pending = attendees.length - accepted - declined
  if (pending > 0) parts.push(`${pending} Pending`)
  return parts.join(' · ')
}

function attendeeInitials(a: CalendarAttendee): string {
  if (a.name) {
    const parts = a.name.trim().split(/\s+/)
    return parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : (parts[0]?.[0] ?? '?').toUpperCase()
  }
  return (a.email[0] ?? '?').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-pink-600',
]

function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]!
}

function videoButtonLabel(ev: CalendarAgendaEvent): string {
  if (ev.video_label) return `Join ${ev.video_label} meeting`
  return 'Join meeting'
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

function dayKeyInTimeZone(dt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt)
}

function utcMidnightMsFromDayKey(dayKey: string): number {
  const parts = dayKey.split('-').map(Number)
  const y = parts[0]!
  const mo = parts[1]!
  const d = parts[2]!
  return Date.UTC(y, mo - 1, d)
}

/** One line: "Tomorrow" / "Yesterday" / "Thursday 14 May" (never the word "Today"). */
function agendaListDayDividerLabel(dayKey: string, nowTick: number, timeZone: string): string {
  const todayKey = dayKeyInTimeZone(new Date(nowTick), timeZone)
  const delta = Math.round(
    (utcMidnightMsFromDayKey(dayKey) - utcMidnightMsFromDayKey(todayKey)) / 86_400_000,
  )
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  const parts = dayKey.split('-').map(Number)
  const y = parts[0]!
  const mo = parts[1]!
  const d = parts[2]!
  const utc = new Date(Date.UTC(y, mo - 1, d, 12))
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(utc)
    .replace(/,/g, '')
    .trim()
}

/** Anchor uses local navigator dates (`day` state); bucket keys honor `timezone`. */
function enumerateDayKeysInNavRange(anchor: Date, range: DateRange, timeZone: string): string[] {
  const keys: string[] = []
  let cur = startOfDay(anchor)
  const last = rangeEndDate(anchor, range)
  const endStart = startOfDay(last)
  while (cur.getTime() <= endStart.getTime()) {
    keys.push(dayKeyInTimeZone(cur, timeZone))
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

function eventsGroupedByDayKey(
  list: CalendarAgendaEvent[],
  timeZone: string,
): Map<string, CalendarAgendaEvent[]> {
  const m = new Map<string, CalendarAgendaEvent[]>()
  for (const ev of list) {
    const k = dayKeyInTimeZone(new Date(ev.start), timeZone)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(ev)
  }
  for (const [, arr] of m) {
    arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }
  return m
}

function AgendaWeekDaySeparator({
  dayKey,
  nowTick,
  timeZone,
}: {
  dayKey: string
  nowTick: number
  timeZone: string
}) {
  const label = agendaListDayDividerLabel(dayKey, nowTick, timeZone)

  return (
    <div className="relative flex items-center justify-center py-2.5">
      <div className="border-border absolute inset-x-0 top-1/2 border-t" />
      <div className="border-border text-foreground relative z-[1] max-w-[min(100%,20rem)] rounded-full border bg-[var(--color-card)] px-4 py-1.5 text-center text-xs font-semibold leading-none shadow-sm">
        {label}
      </div>
    </div>
  )
}

const ENTRY_TRANSITION = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const

function AgendaEventEntry({
  ev,
  isExpanded,
  onSelect,
  nowTick,
}: {
  ev: CalendarAgendaEvent
  isExpanded: boolean
  onSelect: () => void
  nowTick: number
}) {
  const color = eventColor(ev)

  return (
    <motion.div
      layout
      transition={ENTRY_TRANSITION}
      onClick={!isExpanded ? onSelect : undefined}
      className={
        isExpanded
          ? 'card-glass rounded-xl border-l-[4px] p-4'
          : 'hover:bg-hover-subtle cursor-pointer rounded-lg px-2 py-2 transition-colors'
      }
      style={isExpanded ? { borderLeftColor: color.border } : undefined}
      role={!isExpanded ? 'button' : undefined}
      tabIndex={!isExpanded ? 0 : undefined}
      onKeyDown={
        !isExpanded
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
    >
      {isExpanded ? (
        <motion.div layout="position" transition={ENTRY_TRANSITION}>
          <p className="body-2 text-foreground font-semibold">{ev.title}</p>
          <p className="typo-caption text-muted-foreground mt-1">
            {formatCountdown(nowTick, ev) ? `${formatCountdown(nowTick, ev)} · ` : ''}
            {formatTimeRange(ev)}
          </p>

          {ev.attendees.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {ev.attendees.slice(0, 5).map((a, i) => (
                  <div
                    key={a.email}
                    className={`${avatarColor(i)} flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-background)] text-[9px] font-bold text-white`}
                    title={a.name ?? a.email}
                  >
                    {attendeeInitials(a)}
                  </div>
                ))}
                {ev.attendees.length > 5 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-background)] bg-[var(--color-muted)] text-[9px] font-bold text-[var(--color-muted-foreground)]">
                    +{ev.attendees.length - 5}
                  </div>
                )}
              </div>
              {attendeeRsvpSummary(ev.attendees) && (
                <span className="typo-caption text-muted-foreground">
                  {attendeeRsvpSummary(ev.attendees)}
                </span>
              )}
            </div>
          )}

          {ev.video_url ? (
            <a
              href={ev.video_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 py-2 text-[13px] font-semibold text-emerald-400 backdrop-blur-sm transition-colors hover:bg-emerald-500/25"
            >
              <Video className="h-4 w-4" />
              {videoButtonLabel(ev)}
            </a>
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          layout="position"
          transition={ENTRY_TRANSITION}
          className="flex items-center gap-2"
        >
          <span
            className="h-6 w-1 shrink-0 rounded-full"
            style={{ background: color.border }}
            aria-hidden
          />
          <span className="typo-caption text-muted-foreground w-14 shrink-0">
            {ev.all_day
              ? 'All day'
              : new Date(ev.start).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </span>
          <span className="body-3 min-w-0 flex-1 truncate font-medium">{ev.title}</span>
          {ev.video_url ? <Video className="text-muted-foreground h-3.5 w-3.5 shrink-0" /> : null}
        </motion.div>
      )}
    </motion.div>
  )
}

export function AgendaCard() {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [view, setView] = useState<AgendaView>('list')
  const [day, setDay] = useState(() => new Date())
  const [range, setRange] = useState<DateRange>('week')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [provider, setProvider] = useState<ProviderFilter>('all')
  const [events, setEvents] = useState<CalendarAgendaEvent[]>([])
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

  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC')

  const load = useCallback(async () => {
    const blocking = !hasCompletedLoadRef.current
    if (blocking) setLoading(true)
    try {
      let startAt: Date
      let endAt: Date
      if (view === 'list') {
        startAt = startOfDay(day)
        endAt = rangeEndDate(day, range)
      } else {
        const w = boardFetchWindow ?? agendaBoardFallbackWindow(day, 1)
        startAt = w.start
        endAt = w.end
      }
      const start = startAt.toISOString()
      const end = endAt.toISOString()
      const res = await fetchCalendarAgenda({
        start,
        end,
        timezone,
        provider:
          provider === 'all'
            ? undefined
            : provider === 'google_calendar'
              ? 'google_calendar'
              : 'outlook',
      })
      setConnected(res.connected)
      if (!res.success && res.error) {
        toast.error(HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage)
        setEvents([])
      } else {
        setEvents(res.events ?? [])
      }
    } catch (e) {
      toast.error(sanitizeUserError(e, HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage))
      setEvents([])
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

  const isToday = useMemo(() => {
    const now = new Date()
    return (
      day.getFullYear() === now.getFullYear() &&
      day.getMonth() === now.getMonth() &&
      day.getDate() === now.getDate()
    )
  }, [day])

  const visibleEvents = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    )
    if (!isToday) return sorted
    return sorted.filter((ev) => new Date(ev.end).getTime() > nowTick)
  }, [events, isToday, nowTick])

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedEventId((curr) => {
      if (curr && visibleEvents.some((ev) => ev.id === curr)) return curr
      return visibleEvents[0]?.id ?? null
    })
  }, [visibleEvents])

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

  return (
    <div className="section-card card-elevated flex h-[420px] flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="body-2 text-foreground font-medium">Agenda</span>
        </div>
        {anyConnected && (
          <div className="flex flex-wrap items-center justify-end gap-1">
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {visibleEvents.length === 0 && isToday ? (
              <p className="body-3 text-muted-foreground">No more events today.</p>
            ) : null}
            {visibleEvents.length > 0 &&
              (range === 'week' || range === 'month' ? (
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
                            <li key={ev.id}>
                              <AgendaEventEntry
                                ev={ev}
                                isExpanded={ev.id === selectedEventId}
                                onSelect={() => setSelectedEventId(ev.id)}
                                nowTick={nowTick}
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
                    <li key={ev.id}>
                      <AgendaEventEntry
                        ev={ev}
                        isExpanded={ev.id === selectedEventId}
                        onSelect={() => setSelectedEventId(ev.id)}
                        nowTick={nowTick}
                      />
                    </li>
                  ))}
                </ul>
              ))}
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
