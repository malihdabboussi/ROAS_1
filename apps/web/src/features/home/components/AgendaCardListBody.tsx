'use client'

import { useEffect, useRef } from 'react'
import {
  AgendaWeekDaySeparator,
  dayKeyInTimeZone,
} from '@/features/home/components/agenda-list-grouping'
import { AgendaEventEntry } from '@/features/home/components/AgendaCardEventEntry'
import { splitTodayAgendaEvents } from '@/features/home/lib/agenda-list-view'
import { agendaEventMinimizeKey } from '@/features/home/lib/agenda-minimize'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

function eventKey(ev: CalendarAgendaEvent) {
  return `${ev.account_id ?? ev.source}:${ev.id}`
}

export function AgendaCardListBody(props: {
  visibleEvents: CalendarAgendaEvent[]
  isToday: boolean
  nextEvent: CalendarAgendaEvent | null
  nextEventKey: string | null
  range: 'day' | 'week' | 'month'
  dividerDayKeys: string[]
  todayDayKey: string
  groupedVisible: Map<string, CalendarAgendaEvent[]>
  nowTick: number
  timezone: string
  showAccountLabel: boolean
  minimizedKeys: Set<string>
  openAgendaEvent: (ev: CalendarAgendaEvent) => void
  onMinimizedChange: (ev: CalendarAgendaEvent, minimized: boolean) => void
}) {
  const {
    visibleEvents,
    isToday,
    nextEvent,
    nextEventKey,
    range,
    dividerDayKeys,
    todayDayKey,
    groupedVisible,
    nowTick,
    timezone,
    showAccountLabel,
    minimizedKeys,
    openAgendaEvent,
    onMinimizedChange,
  } = props

  const listRef = useRef<HTMLDivElement>(null)
  const nextAnchorRef = useRef<HTMLDivElement>(null)
  const todayAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isToday || !listRef.current) return
    const anchor = range === 'day' ? nextAnchorRef.current : todayAnchorRef.current
    if (!anchor) return
    // Position the current day at the top while leaving earlier weekdays above
    // it and reachable by scrolling upward.
    const list = listRef.current
    const top = Math.max(0, anchor.offsetTop - 12)
    list.scrollTop = top
  }, [isToday, nextEventKey, range])

  const todayKey = isToday ? dayKeyInTimeZone(new Date(nowTick), timezone) : null
  const todayEvents = todayKey ? (groupedVisible.get(todayKey) ?? []) : []
  const scrollDayKey =
    todayKey && dividerDayKeys.includes(todayKey)
      ? todayKey
      : dividerDayKeys.find(
          (dayKey) => dayKey >= todayDayKey && (groupedVisible.get(dayKey)?.length ?? 0) > 0,
        )
  const { earlier: earlierToday, later: laterToday } =
    isToday && nextEvent
      ? splitTodayAgendaEvents(todayEvents, nowTick, nextEventKey, eventKey)
      : { earlier: [] as CalendarAgendaEvent[], later: [] as CalendarAgendaEvent[] }

  const renderRow = (ev: CalendarAgendaEvent) => {
    const isMinimized = minimizedKeys.has(agendaEventMinimizeKey(ev))
    return (
      <AgendaEventEntry
        ev={ev}
        isExpanded={false}
        isMinimized={isMinimized}
        onOpenMeeting={() => openAgendaEvent(ev)}
        onMinimizedChange={(minimized) => onMinimizedChange(ev, minimized)}
        nowTick={nowTick}
        showAccountLabel={showAccountLabel}
      />
    )
  }

  const renderTodayRows = () => (
    <div className="space-y-1">
      {earlierToday.length > 0 ? (
        <ul className="space-y-1">
          {earlierToday.map((ev) => (
            <li key={eventKey(ev)}>{renderRow(ev)}</li>
          ))}
        </ul>
      ) : null}
      {nextEvent ? (
        <div ref={nextAnchorRef}>
          <AgendaEventEntry
            ev={nextEvent}
            isExpanded
            isNextHero
            onOpenMeeting={() => openAgendaEvent(nextEvent)}
            onMinimizedChange={(minimized) => onMinimizedChange(nextEvent, minimized)}
            nowTick={nowTick}
            showAccountLabel={showAccountLabel}
          />
        </div>
      ) : null}
      {laterToday.length > 0 ? (
        <ul className="space-y-1">
          {laterToday.map((ev) => (
            <li key={eventKey(ev)}>{renderRow(ev)}</li>
          ))}
        </ul>
      ) : null}
    </div>
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

      {visibleEvents.length > 0 ? (
        range === 'week' || range === 'month' ? (
          <div className="space-y-0.5">
            {dividerDayKeys.map((dk) => {
              const dayEvts = groupedVisible.get(dk) ?? []
              const isCurrentDay = isToday && dk === todayDayKey
              if (dayEvts.length === 0 && !isCurrentDay) return null
              const isScrollDay = isToday && dk === scrollDayKey
              return (
                <div key={dk} ref={isScrollDay ? todayAnchorRef : undefined}>
                  <AgendaWeekDaySeparator dayKey={dk} nowTick={nowTick} timeZone={timezone} />
                  {isCurrentDay && nextEvent ? (
                    renderTodayRows()
                  ) : dayEvts.length === 0 ? (
                    <p className="body-3 text-muted-foreground px-3 py-2">No meetings today.</p>
                  ) : (
                    <ul className="space-y-1">
                      {dayEvts.map((ev) => (
                        <li key={eventKey(ev)}>{renderRow(ev)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        ) : isToday && nextEvent ? (
          renderTodayRows()
        ) : (
          <ul className="space-y-1">
            {visibleEvents.map((ev) => (
              <li key={eventKey(ev)}>{renderRow(ev)}</li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}
