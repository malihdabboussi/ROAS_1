'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
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
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import { useAgendaCardData } from '@/features/home/hooks/use-agenda-card-data'
import { useAgendaPrepActions } from '@/features/home/hooks/use-agenda-prep-actions'
import { agendaEventDismissKey, dismissAgendaEvent } from '@/features/home/lib/agenda-dismiss'
import {
  dedupeAgendaEvents,
  pickNextAgendaEvent,
  tomorrowDayKey,
} from '@/features/home/lib/agenda-list-view'
import { minimalSpaceYourTurnItem } from '@/features/home/lib/home-your-turn-item'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import type { YourTurnItem } from '@/lib/your-turn/types'

function isFathomAgendaEvent(ev: CalendarAgendaEvent): boolean {
  return ev.source === 'fathom'
}

export function AgendaCard({
  onOpenItem,
  onOpenMeeting,
}: {
  onOpenItem?: (item: YourTurnItem) => void | Promise<void>
  onOpenMeeting?: (event: CalendarAgendaEvent) => void
} = {}) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
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
    connected,
    loading,
    initialized,
    nowTick,
    dismissedKeys,
    setDismissedKeys,
    setBoardFetchWindow,
    timezone,
    load,
    effectiveScope,
    showTeamToggle,
    activeOrgId,
  } = useAgendaCardData()

  const anyConnected = connected.google_calendar || connected.outlook
  const bothConnected = connected.google_calendar && connected.outlook
  const showAccountLabel =
    accounts.length > 1 || events.some((ev) => isFathomAgendaEvent(ev)) || effectiveScope === 'team'
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
    return deduped.filter((ev) => !dismissedKeys.has(agendaEventDismissKey(ev)))
  }, [events, dismissedKeys, effectiveScope])

  const eventKey = (ev: CalendarAgendaEvent) => `${ev.account_id ?? ev.source}:${ev.id}`
  const todayDayKey = useMemo(
    () => dayKeyInTimeZone(new Date(nowTick), timezone),
    [nowTick, timezone],
  )
  const nextEvent = useMemo(() => {
    if (!isToday) return null
    // Hero + earlier-today scroll are scoped to today's events only.
    const todays = visibleEvents.filter(
      (ev) => dayKeyInTimeZone(new Date(ev.start), timezone) === todayDayKey,
    )
    return pickNextAgendaEvent(todays, nowTick)
  }, [isToday, visibleEvents, nowTick, timezone, todayDayKey])
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

  const openWorkspaceIntegration = useCallback(() => {
    openWorkspaceSettings('integrations', {
      integrationsFocusIntegrationId: 'google_workspace',
    })
  }, [openWorkspaceSettings])

  const { prepRunning, runPrepToday } = useAgendaPrepActions({
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

  const [dismissPending, setDismissPending] = useState<CalendarAgendaEvent | null>(null)

  const handleDismissEvent = useCallback((ev: CalendarAgendaEvent) => {
    setDismissPending(ev)
  }, [])

  const confirmDismissEvent = useCallback(() => {
    if (!dismissPending) return
    setDismissedKeys(dismissAgendaEvent(dismissPending))
    setDismissPending(null)
  }, [dismissPending])

  return (
    <div className="section-card card-elevated flex h-[420px] flex-col overflow-hidden">
      <AgendaCardHeader
        showAgendaSurface={showAgendaSurface || showTeamToggle}
        accounts={accounts}
        anyConnected={anyConnected}
        bothConnected={bothConnected}
        provider={provider}
        setProvider={setProvider}
        agendaScope={effectiveScope}
        setAgendaScope={setAgendaScope}
        showTeamToggle={showTeamToggle}
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
            onDismissEvent={handleDismissEvent}
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

      <ConfirmDialog
        open={Boolean(dismissPending)}
        title={HOME_AGENDA_MESSAGES.CONFIRM_DISMISS_TITLE.message}
        description={HOME_AGENDA_MESSAGES.CONFIRM_DISMISS_DESCRIPTION.message}
        confirmText={HOME_AGENDA_MESSAGES.CONFIRM_DISMISS_CONFIRM.message}
        confirmTone="primary"
        onConfirm={confirmDismissEvent}
        onOpenChange={(open) => {
          if (!open) setDismissPending(null)
        }}
      />
    </div>
  )
}
