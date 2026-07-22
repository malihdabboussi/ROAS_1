'use client'

import { useEffect, useRef } from 'react'
import {
  AgendaWeekDaySeparator,
  dayKeyInTimeZone,
} from '@/features/home/components/agenda-list-grouping'
import { AgendaEventEntry } from '@/features/home/components/AgendaCardEventEntry'
import { splitTodayAgendaEvents } from '@/features/home/lib/agenda-list-view'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

function eventKey(ev: CalendarAgendaEvent) {
  return `${ev.account_id ?? ev.source}:${ev.id}`
}

export function AgendaCardListBody(props: {
  visibleEvents: CalendarAgendaEvent[]
  isToday: boolean
  nextEvent: CalendarAgendaEvent | null
  nextEventKey: string | null
  selectedEventKey: string | null
  setSelectedEventKey: (key: string | null) => void
  range: 'day' | 'week' | 'month'
  tomorrowKey: string
  dividerDayKeys: string[]
  skipDividerDayKey: string | null
  groupedVisible: Map<string, CalendarAgendaEvent[]>
  nowTick: number
  timezone: string
  showAccountLabel: boolean
  openAgendaEvent: (ev: CalendarAgendaEvent) => void
  onDismissEvent: (ev: CalendarAgendaEvent) => void
}) {
  const {
    visibleEvents,
    isToday,
    nextEvent,
    nextEventKey,
    selectedEventKey,
    setSelectedEventKey,
    range,
    tomorrowKey,
    dividerDayKeys,
    skipDividerDayKey,
    groupedVisible,
    nowTick,
    timezone,
    showAccountLabel,
    openAgendaEvent,
    onDismissEvent,
  } = props

  const listRef = useRef<HTMLDivElement>(null)
  const nextAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isToday || !nextEvent || !listRef.current || !nextAnchorRef.current) return
    // Scroll only the agenda list so earlier-today rows stay above and reachable.
    const list = listRef.current
    const anchor = nextAnchorRef.current
    const top = Math.max(0, anchor.offsetTop - 12)
    list.scrollTop = top
  }, [isToday, nextEventKey])

  const todayKey =
    skipDividerDayKey ?? (isToday ? dayKeyInTimeZone(new Date(nowTick), timezone) : null)
  const todayEvents = todayKey ? (groupedVisible.get(todayKey) ?? []) : []
  const { earlier: earlierToday, later: laterToday } =
    isToday && nextEvent
      ? splitTodayAgendaEvents(todayEvents, nowTick, nextEventKey, eventKey)
      : { earlier: [] as CalendarAgendaEvent[], later: [] as CalendarAgendaEvent[] }

  const renderRow = (ev: CalendarAgendaEvent, expanded: boolean) => (
    <AgendaEventEntry
      ev={ev}
      isExpanded={expanded}
      onSelect={() => setSelectedEventKey(eventKey(ev))}
      onOpenMeeting={() => openAgendaEvent(ev)}
      onDismiss={() => onDismissEvent(ev)}
      nowTick={nowTick}
      showAccountLabel={showAccountLabel}
    />
  )

  return (
    <div
      ref={listRef}
      className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
    >
      {visibleEvents.length === 0 ? (
        <p className="body-3 text-muted-foreground">
          {isToday ? 'No events in this range.' : 'No events.'}
          {showAccountLabel
            ? ' Team Agenda includes your calendar plus confirmed People → Calendars identities.'
            : ''}
        </p>
      ) : null}

      {visibleEvents.length > 0 && isToday && nextEvent ? (
        <div className="space-y-1">
          {earlierToday.length > 0 ? (
            <div className="space-y-1">
              <p className="typo-caption text-muted-foreground px-1">Earlier today</p>
              <ul className="space-y-1">
                {earlierToday.map((ev) => (
                  <li key={eventKey(ev)}>{renderRow(ev, eventKey(ev) === selectedEventKey)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div ref={nextAnchorRef}>
            <AgendaEventEntry
              ev={nextEvent}
              isExpanded
              isNextHero
              onSelect={() => setSelectedEventKey(nextEventKey)}
              onOpenMeeting={() => openAgendaEvent(nextEvent)}
              onDismiss={() => onDismissEvent(nextEvent)}
              nowTick={nowTick}
              showAccountLabel={showAccountLabel}
            />
          </div>

          {laterToday.length > 0 ? (
            <ul className="space-y-1">
              {laterToday.map((ev) => (
                <li key={eventKey(ev)}>{renderRow(ev, eventKey(ev) === selectedEventKey)}</li>
              ))}
            </ul>
          ) : null}

          {(range === 'week' || range === 'month') &&
          (groupedVisible.get(tomorrowKey)?.length ?? 0) > 0 ? (
            <AgendaWeekDaySeparator dayKey={tomorrowKey} nowTick={nowTick} timeZone={timezone} />
          ) : null}

          <div className="space-y-1">
            {dividerDayKeys.map((dk) => {
              if (skipDividerDayKey !== null && dk === skipDividerDayKey) return null
              const dayEvts = groupedVisible.get(dk) ?? []
              if (!dayEvts.length) return null
              return (
                <div key={dk}>
                  {dk !== tomorrowKey ? (
                    <AgendaWeekDaySeparator dayKey={dk} nowTick={nowTick} timeZone={timezone} />
                  ) : null}
                  <ul className="space-y-1">
                    {dayEvts.map((ev) => (
                      <li key={eventKey(ev)}>{renderRow(ev, eventKey(ev) === selectedEventKey)}</li>
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
                    <AgendaWeekDaySeparator dayKey={dk} nowTick={nowTick} timeZone={timezone} />
                  ) : null}
                  <ul className="space-y-1">
                    {dayEvts.map((ev) => (
                      <li key={eventKey(ev)}>{renderRow(ev, eventKey(ev) === selectedEventKey)}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <ul className="space-y-1">
            {visibleEvents.map((ev) => (
              <li key={eventKey(ev)}>{renderRow(ev, eventKey(ev) === selectedEventKey)}</li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}
