'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  dayKeyInTimeZone,
  enumerateDayKeysInNavRange,
  eventsGroupedByDayKey,
} from '@/features/home/components/agenda-list-grouping'
import { AgendaCalendarPanel } from '@/features/home/components/AgendaCalendarPanel'
import {
  AgendaCardDisconnected,
  AgendaCardHeader,
  AgendaCardRangeNav,
} from '@/features/home/components/AgendaCardChrome'
import { AgendaCardListBody } from '@/features/home/components/AgendaCardListBody'
import { HomeInstantMeetingHost } from '@/features/home/components/HomeInstantMeetingHost'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { useAgendaCardData } from '@/features/home/hooks/use-agenda-card-data'
import { dedupeAgendaEvents, pickNextAgendaEvent } from '@/features/home/lib/agenda-list-view'
import {
  agendaEventMinimizeKey,
  readMinimizedAgendaKeys,
  setAgendaEventMinimized,
  writeMinimizedAgendaKeys,
} from '@/features/home/lib/agenda-minimize'
import { openAgendaEventDetail } from '@/features/home/lib/agenda-open-routing'
import {
  fetchPersistedAgendaMinimizedKeys,
  persistAgendaEventMinimized,
} from '@/features/home/services/agenda-minimize.service'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import type { YourTurnItem } from '@/lib/your-turn/types'

function isFathomAgendaEvent(ev: CalendarAgendaEvent): boolean {
  return ev.source === 'fathom'
}

export function AgendaCard({
  onOpenItem,
  onOpenMeeting,
  fullHeight = false,
  presentation = 'card',
}: {
  onOpenItem?: (item: YourTurnItem) => void | Promise<void>
  onOpenMeeting?: (event: CalendarAgendaEvent) => void
  fullHeight?: boolean
  presentation?: 'card' | 'page'
} = {}) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [instantMeetingOpen, setInstantMeetingOpen] = useState(false)
  // Tracks which keys the server already knows, plus in-flight user intent so a
  // late fetch/persist response never overwrites a newer local toggle.
  const serverSyncedMinimizedKeysRef = useRef<Set<string>>(new Set())
  const minimizedOverridesRef = useRef<Map<string, boolean>>(new Map())
  const {
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
    effectiveScope,
    showTeamToggle,
    load,
  } = useAgendaCardData()

  const anyConnected = connected.google_calendar || connected.outlook
  const bothConnected = connected.google_calendar && connected.outlook
  const showAccountLabel = accounts.length > 1 || effectiveScope === 'team'
  const hasFathomEvents = events.some((ev) => isFathomAgendaEvent(ev))
  const showAgendaSurface =
    effectiveScope === 'team'
      ? workspaceConnected || teamAvailable || hasFathomEvents
      : anyConnected || hasFathomEvents

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
    // Team API already collapses the same invite across people. Client fuzzy
    // dedupe would incorrectly merge different teammates' similarly named calls.
    const deduped = effectiveScope === 'team' ? sorted : dedupeAgendaEvents(sorted)
    return deduped
  }, [events, effectiveScope])

  const eventKey = (ev: CalendarAgendaEvent) => `${ev.account_id ?? ev.source}:${ev.id}`
  const todayDayKey = useMemo(
    () => dayKeyInTimeZone(new Date(nowTick), timezone),
    [nowTick, timezone],
  )
  const nextEvent = useMemo(() => {
    if (!isToday) return null
    // Hero + earlier-today scroll are scoped to today's events only.
    const todays = visibleEvents.filter(
      (ev) =>
        dayKeyInTimeZone(new Date(ev.start), timezone) === todayDayKey &&
        !minimizedKeys.has(agendaEventMinimizeKey(ev)),
    )
    return pickNextAgendaEvent(todays, nowTick)
  }, [isToday, visibleEvents, minimizedKeys, nowTick, timezone, todayDayKey])
  const nextEventKey = nextEvent ? eventKey(nextEvent) : null
  const dividerDayKeys = useMemo(
    () =>
      range === 'week' || range === 'month' ? enumerateDayKeysInNavRange(day, range, timezone) : [],
    [day, range, timezone],
  )

  const groupedVisible = useMemo(
    () => eventsGroupedByDayKey(visibleEvents, timezone),
    [visibleEvents, timezone],
  )

  const handleBoardVisibleWindow = useCallback(
    (window: { start: Date; end: Date }) => {
      setBoardFetchWindow(window)
    },
    [setBoardFetchWindow],
  )

  const openCalendarIntegration = useCallback(
    (integrationId: 'google_calendar' | 'outlook') => {
      openWorkspaceSettings('integrations', {
        integrationsFocusIntegrationId: integrationId,
      })
    },
    [openWorkspaceSettings],
  )

  const openWorkspaceIntegration = useCallback(() => {
    openWorkspaceSettings('integrations', {
      integrationsFocusIntegrationId: 'google_workspace',
    })
  }, [openWorkspaceSettings])

  const openAgendaEvent = useCallback(
    (ev: CalendarAgendaEvent) => {
      openAgendaEventDetail(ev, onOpenMeeting, onOpenItem)
    },
    [onOpenItem, onOpenMeeting],
  )

  const handleMinimizedChange = useCallback(
    (ev: CalendarAgendaEvent, minimized: boolean) => {
      const key = agendaEventMinimizeKey(ev)
      minimizedOverridesRef.current.set(key, minimized)
      if (minimized) serverSyncedMinimizedKeysRef.current.add(key)
      else serverSyncedMinimizedKeysRef.current.delete(key)
      setMinimizedKeys(setAgendaEventMinimized(ev, minimized))
      void persistAgendaEventMinimized(ev, minimized).catch(() => {
        if (minimizedOverridesRef.current.get(key) !== minimized) return
        minimizedOverridesRef.current.set(key, !minimized)
        if (minimized) serverSyncedMinimizedKeysRef.current.delete(key)
        else serverSyncedMinimizedKeysRef.current.add(key)
        setMinimizedKeys(setAgendaEventMinimized(ev, !minimized))
        toast.error(
          minimized
            ? HOME_TOAST_ERRORS.AGENDA_MINIMIZE_FAILED.userMessage
            : HOME_TOAST_ERRORS.AGENDA_RESTORE_FAILED.userMessage,
        )
      })
    },
    [setMinimizedKeys],
  )

  useEffect(() => {
    let cancelled = false
    void fetchPersistedAgendaMinimizedKeys()
      .then((persistedKeys) => {
        if (cancelled) return
        const merged = readMinimizedAgendaKeys()
        for (const key of persistedKeys) {
          serverSyncedMinimizedKeysRef.current.add(key)
          if (minimizedOverridesRef.current.get(key) !== false) merged.add(key)
        }
        for (const [key, minimized] of minimizedOverridesRef.current) {
          if (minimized) merged.add(key)
          else merged.delete(key)
        }
        writeMinimizedAgendaKeys(merged)
        setMinimizedKeys(merged)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(HOME_TOAST_ERRORS.AGENDA_SETTINGS_LOAD_FAILED.userMessage)
        }
      })
    return () => {
      cancelled = true
    }
  }, [setMinimizedKeys])

  // Back-fill: keys minimized before server persistence existed live only in
  // localStorage — push them up once so other devices agree.
  useEffect(() => {
    for (const event of events) {
      const key = agendaEventMinimizeKey(event)
      if (!minimizedKeys.has(key) || serverSyncedMinimizedKeysRef.current.has(key)) continue
      serverSyncedMinimizedKeysRef.current.add(key)
      void persistAgendaEventMinimized(event, true).catch(() => {
        serverSyncedMinimizedKeysRef.current.delete(key)
        setMinimizedKeys(setAgendaEventMinimized(event, false))
        toast.error(HOME_TOAST_ERRORS.AGENDA_MINIMIZE_FAILED.userMessage)
      })
    }
  }, [events, minimizedKeys, setMinimizedKeys])

  return (
    <div
      className={`flex w-full flex-col overflow-hidden ${
        presentation === 'card' ? 'section-card card-elevated' : 'bg-background'
      } ${fullHeight ? 'h-full min-h-0' : 'h-[420px]'}`}
    >
      <AgendaCardHeader
        showAgendaSurface={showAgendaSurface || showTeamToggle}
        bothConnected={bothConnected}
        provider={provider}
        setProvider={setProvider}
        agendaScope={effectiveScope}
        setAgendaScope={setAgendaScope}
        showTeamToggle={showTeamToggle}
        view={view}
        setView={setView}
        teamCoverage={teamCoverage}
        onStartInstantMeeting={() => setInstantMeetingOpen(true)}
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
          <AgendaCardDisconnected
            agendaScope={effectiveScope}
            openCalendarIntegration={openCalendarIntegration}
            openWorkspaceIntegration={openWorkspaceIntegration}
          />
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
            range={range}
            dividerDayKeys={dividerDayKeys}
            todayDayKey={todayDayKey}
            groupedVisible={groupedVisible}
            nowTick={nowTick}
            timezone={timezone}
            showAccountLabel={showAccountLabel}
            minimizedKeys={minimizedKeys}
            openAgendaEvent={openAgendaEvent}
            onMinimizedChange={handleMinimizedChange}
          />
        ) : (
          <AgendaCalendarPanel
            events={visibleEvents}
            navigationAnchor={day}
            defaultScope="week"
            timeFormat="12h"
            weekStart={1}
            onVisibleWindowChange={handleBoardVisibleWindow}
          />
        )}
      </div>

      <HomeInstantMeetingHost
        open={instantMeetingOpen}
        onOpenChange={setInstantMeetingOpen}
        onCreated={() => {
          invalidateCachedFetch('calendar-agenda:')
          void load()
        }}
      />
    </div>
  )
}
