'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { agendaBoardFallbackWindow } from '@/features/home/components/AgendaCalendarPanel'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { readMinimizedAgendaKeys } from '@/features/home/lib/agenda-minimize'
import {
  agendaListFetchWindow,
  filterEventsToWindow,
} from '@/features/home/lib/agenda-fetch-window'
import { cachedFetch, peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org'
import {
  fetchCalendarAgenda,
  fetchGoogleWorkspaceStatus,
  type CalendarAgendaAccount,
  type CalendarAgendaEvent,
  type TeamAgendaCoverage,
} from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

const AGENDA_CACHE_TTL_MS = 90_000

export type AgendaView = 'list' | 'board'
export type ProviderFilter = 'all' | 'google_calendar' | 'outlook'
export type DateRange = 'day' | 'week' | 'month'
export type AgendaScope = 'personal' | 'team'

function readStoredAgendaScope(orgId: string | null): AgendaScope {
  if (!orgId || typeof window === 'undefined') return 'personal'
  try {
    const raw = sessionStorage.getItem(`agenda-scope:${orgId}`)
    return raw === 'team' ? 'team' : 'personal'
  } catch {
    return 'personal'
  }
}

export function useAgendaCardData() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const hasMinRole = useOrgStore((s) => s.hasMinRole)
  const canViewTeamAgenda = Boolean(activeOrgId) && hasMinRole('admin')
  const [view, setView] = useState<AgendaView>('list')
  const [day, setDay] = useState(() => new Date())
  const [range, setRange] = useState<DateRange>('week')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [provider, setProvider] = useState<ProviderFilter>('all')
  const [agendaScope, setAgendaScopeState] = useState<AgendaScope>(() =>
    readStoredAgendaScope(activeOrgId),
  )
  const [teamAvailable, setTeamAvailable] = useState(false)
  const [workspaceConnected, setWorkspaceConnected] = useState(false)
  const [events, setEvents] = useState<CalendarAgendaEvent[]>([])
  const [accounts, setAccounts] = useState<CalendarAgendaAccount[]>([])
  const [teamCoverage, setTeamCoverage] = useState<TeamAgendaCoverage | null>(null)
  const [connected, setConnected] = useState<{ google_calendar: boolean; outlook: boolean }>({
    google_calendar: false,
    outlook: false,
  })
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [minimizedKeys, setMinimizedKeys] = useState<Set<string>>(() =>
    readMinimizedAgendaKeys(),
  )
  const [boardFetchWindow, setBoardFetchWindow] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const hasCompletedLoadRef = useRef(false)
  const lastEventsRef = useRef<CalendarAgendaEvent[]>([])
  const loadedScopeRef = useRef<AgendaScope | null>(null)
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC')

  const setAgendaScope = useCallback(
    (next: AgendaScope) => {
      setAgendaScopeState(next)
      // Never carry Mine events into Team (or vice versa) while the next fetch runs.
      if (next !== agendaScope) {
        lastEventsRef.current = []
        loadedScopeRef.current = null
        setEvents([])
        setAccounts([])
        setTeamCoverage(null)
        setLoading(true)
        setInitialized(false)
      }
      if (!activeOrgId) return
      try {
        sessionStorage.setItem(`agenda-scope:${activeOrgId}`, next)
      } catch {
        // ignore
      }
    },
    [activeOrgId, agendaScope],
  )

  useEffect(() => {
    setAgendaScopeState(readStoredAgendaScope(activeOrgId))
  }, [activeOrgId])

  useEffect(() => {
    if (!canViewTeamAgenda || !activeOrgId) {
      setWorkspaceConnected(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const status = await fetchGoogleWorkspaceStatus(activeOrgId)
        if (!cancelled) setWorkspaceConnected(Boolean(status.connected))
      } catch {
        if (!cancelled) setWorkspaceConnected(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canViewTeamAgenda, activeOrgId])

  const load = useCallback(async () => {
    const effectiveScope: AgendaScope =
      agendaScope === 'team' && canViewTeamAgenda ? 'team' : 'personal'
    const scopeChanged = loadedScopeRef.current !== effectiveScope
    const hasWarmEvents =
      !scopeChanged && (lastEventsRef.current.length > 0 || hasCompletedLoadRef.current)
    const blocking = !hasWarmEvents
    if (blocking) setLoading(true)
    if (scopeChanged) {
      lastEventsRef.current = []
      setEvents([])
      setAccounts([])
      setTeamCoverage(null)
    }
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
        effectiveScope === 'team' || provider === 'all'
          ? undefined
          : provider === 'google_calendar'
            ? 'google_calendar'
            : 'outlook'
      // Org must be in the cache key so Team/Mine results never bleed across accounts.
      const cacheKey = `calendar-agenda:${activeOrgId ?? 'personal'}:${effectiveScope}:${start}:${end}:${timezone}:${providerParam ?? 'all'}`
      const peeked = peekCachedFetch<Awaited<ReturnType<typeof fetchCalendarAgenda>>>(cacheKey)
      if (peeked?.success && !scopeChanged) {
        if (effectiveScope === 'personal') setConnected(peeked.connected)
        setAccounts(peeked.accounts ?? [])
        setTeamAvailable(Boolean(peeked.team_available))
        setTeamCoverage(
          effectiveScope === 'team' ? (peeked.team_coverage ?? null) : null,
        )
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
            scope: effectiveScope,
            // Always send active org so Team Agenda / team_available resolve correctly.
            orgId: activeOrgId,
          }),
        { ttlMs: AGENDA_CACHE_TTL_MS },
      )
      if (effectiveScope === 'personal') setConnected(res.connected)
      else if (res.team_available) setConnected(res.connected)
      setAccounts(res.accounts ?? [])
      setTeamAvailable(Boolean(res.team_available))
      setTeamCoverage(effectiveScope === 'team' ? (res.team_coverage ?? null) : null)
      loadedScopeRef.current = effectiveScope
      if (!res.success && res.error) {
        toast.error(HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage)
        lastEventsRef.current = []
        setEvents([])
      } else {
        const fetched = res.events ?? []
        const next = view === 'list' ? filterEventsToWindow(fetched, viewStart, viewEnd) : fetched
        lastEventsRef.current = next
        setEvents(next)
        if (effectiveScope === 'team' && res.error) {
          toast.error(
            sanitizeUserError(res.error, HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage),
          )
        }
      }
    } catch (e) {
      toast.error(sanitizeUserError(e, HOME_TOAST_ERRORS.CALENDAR_LOAD_FAILED.userMessage))
      lastEventsRef.current = []
      setEvents([])
      setTeamCoverage(null)
    } finally {
      if (blocking) setLoading(false)
      setInitialized(true)
      hasCompletedLoadRef.current = true
    }
  }, [
    day,
    timezone,
    provider,
    view,
    range,
    boardFetchWindow,
    agendaScope,
    canViewTeamAgenda,
    activeOrgId,
  ])

  useEffect(() => {
    if (view === 'list') setBoardFetchWindow(null)
  }, [view])

  useEffect(() => {
    if (!initialized) return
    if (!connected.google_calendar && provider === 'google_calendar') setProvider('all')
    if (!connected.outlook && provider === 'outlook') setProvider('all')
  }, [initialized, connected.google_calendar, connected.outlook, provider])

  useEffect(() => {
    if (!canViewTeamAgenda && agendaScope === 'team') setAgendaScope('personal')
  }, [canViewTeamAgenda, agendaScope, setAgendaScope])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const effectiveScope: AgendaScope =
    agendaScope === 'team' && canViewTeamAgenda ? 'team' : 'personal'
  const showTeamToggle = canViewTeamAgenda

  return {
    activeOrgId,
    view,
    setView,
    day,
    setDay,
    range,
    setRange,
    rangeOpen,
    setRangeOpen,
    provider,
    setProvider,
    setAgendaScope,
    teamAvailable,
    workspaceConnected,
    events,
    accounts,
    teamCoverage,
    connected,
    loading,
    initialized,
    nowTick,
    minimizedKeys,
    setMinimizedKeys,
    setBoardFetchWindow,
    timezone,
    load,
    effectiveScope,
    showTeamToggle,
  }
}
