'use client'

import { AgendaWeekDaySeparator } from '@/features/home/components/agenda-list-grouping'
import { AgendaEventEntry } from '@/features/home/components/AgendaCardEventEntry'
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
  openPrepForEvent: (ev: CalendarAgendaEvent) => (() => void) | undefined
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
    openPrepForEvent,
  } = props

  return (
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
            onOpenMeeting={() => openAgendaEvent(nextEvent)}
            onOpenPrep={openPrepForEvent(nextEvent)}
            nowTick={nowTick}
            showAccountLabel={showAccountLabel}
          />
          {(range === 'week' || range === 'month') &&
          (groupedVisible.get(tomorrowKey)?.length ?? 0) > 0 ? (
            <AgendaWeekDaySeparator dayKey={tomorrowKey} nowTick={nowTick} timeZone={timezone} />
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
                    <AgendaWeekDaySeparator dayKey={dk} nowTick={nowTick} timeZone={timezone} />
                  ) : null}
                  <ul className="space-y-1">
                    {dayEvts.map((ev) => (
                      <li key={eventKey(ev)}>
                        <AgendaEventEntry
                          ev={ev}
                          isExpanded={false}
                          onSelect={() => setSelectedEventKey(eventKey(ev))}
                          onOpenMeeting={() => openAgendaEvent(ev)}
                          onOpenPrep={openPrepForEvent(ev)}
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
                    <AgendaWeekDaySeparator dayKey={dk} nowTick={nowTick} timeZone={timezone} />
                  ) : null}
                  <ul className="space-y-1">
                    {dayEvts.map((ev) => (
                      <li key={eventKey(ev)}>
                        <AgendaEventEntry
                          ev={ev}
                          isExpanded={eventKey(ev) === selectedEventKey}
                          onSelect={() => setSelectedEventKey(eventKey(ev))}
                          onOpenMeeting={() => openAgendaEvent(ev)}
                          onOpenPrep={openPrepForEvent(ev)}
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
                  onOpenMeeting={() => openAgendaEvent(ev)}
                  onOpenPrep={openPrepForEvent(ev)}
                  nowTick={nowTick}
                  showAccountLabel={showAccountLabel}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}
