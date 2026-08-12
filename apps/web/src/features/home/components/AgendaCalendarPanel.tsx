'use client'

import { useCallback, useMemo } from 'react'
import {
  CalendarBoard,
  getCalendarBoardVisibleWindow,
  startOfDay,
  startOfMonth,
  type CalendarEvent,
} from '@/components/calendar'
import type { CalendarRenderContext } from '@/components/calendar/CalendarBoard'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { cn } from '@/lib/utils/cn'

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
const DEFAULT_AGENDA_EVENT_COLOR = {
  border: '#F6BF26',
  bg: 'rgba(246,191,38,0.18)',
  text: '#FFF59D',
}

function agendaEventColors(ev: CalendarAgendaEvent) {
  if (ev.color_id) {
    const c = GCAL_EVENT_COLORS[ev.color_id]
    if (c) return c
  }
  return DEFAULT_AGENDA_EVENT_COLOR
}

function rangeRoundedClass(role: CalendarRenderContext['role']) {
  if (role === 'single') return 'rounded-md'
  if (role === 'start') return 'rounded-l-md rounded-r-none'
  if (role === 'end') return 'rounded-r-md rounded-l-none'
  return 'rounded-none'
}

function formatTimeRange(ev: CalendarAgendaEvent): string {
  const s = new Date(ev.start)
  const e = new Date(ev.end)
  if (ev.all_day) return 'All day'
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${s.toLocaleTimeString('en-US', opts)} – ${e.toLocaleTimeString('en-US', opts)}`
}

function formatHoverTimeLabel(event: CalendarEvent<CalendarAgendaEvent>): string {
  const raw = event.raw
  const start = new Date(event.start)
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (!raw.all_day && (!event.end || new Date(event.end).getTime() <= start.getTime())) {
    return formatTime(start)
  }
  if (raw.all_day) return 'All day'
  const end = new Date(event.end!)
  return `${formatTime(start)} – ${formatTime(end)}`
}

function agendaToCalendarEvent(ev: CalendarAgendaEvent): CalendarEvent<CalendarAgendaEvent> {
  return {
    id: ev.id,
    sourceId: ev.source,
    start: ev.start,
    end: ev.end,
    allDay: ev.all_day,
    title: ev.title,
    draggable: false,
    raw: ev,
  }
}

const MONTH_BAR_H = 18

function AgendaMonthBar({
  event,
  ctx,
}: {
  event: CalendarEvent<CalendarAgendaEvent>
  ctx: CalendarRenderContext
}) {
  const raw = event.raw
  const c = agendaEventColors(raw)
  const showLabel = ctx.role === 'single' || ctx.role === 'start'

  return (
    <div
      className={cn(
        'flex min-w-0 items-stretch gap-1 overflow-hidden border-l-[3px] px-1.5',
        rangeRoundedClass(ctx.role),
      )}
      style={{
        borderColor: c.border,
        background: c.bg,
        height: MONTH_BAR_H,
      }}
      title={`${event.title} · ${formatTimeRange(raw)}`}
    >
      {showLabel ? (
        <>
          <span
            className="typo-caption min-w-0 flex-1 truncate leading-none text-[var(--color-foreground)]"
            style={{ color: ctx.compact ? undefined : c.text }}
          >
            {ctx.compact && event.title.length > 14 ? `${event.title.slice(0, 14)}…` : event.title}
          </span>
        </>
      ) : null}
    </div>
  )
}

function AgendaHourBlock({
  event,
  ctx,
}: {
  event: CalendarEvent<CalendarAgendaEvent>
  ctx: CalendarRenderContext
}) {
  const raw = event.raw
  const c = agendaEventColors(raw)

  return (
    <div
      className={cn(
        'border-border flex h-full min-w-0 flex-col gap-0.5 border px-1.5 py-1',
        rangeRoundedClass(ctx.role),
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: c.border,
        background: c.bg,
        minHeight: 22,
      }}
      title={`${event.title} · ${formatTimeRange(raw)}`}
    >
      {(ctx.role === 'start' || ctx.role === 'single') && (
        <span
          className="typo-caption min-w-0 flex-1 truncate leading-tight"
          style={{ color: c.text }}
        >
          {event.title}
        </span>
      )}
      {(ctx.role === 'start' || ctx.role === 'single') && !raw.all_day ? (
        <span className="typo-caption leading-none text-[var(--color-muted-foreground)]">
          {formatTimeRange(raw)}
        </span>
      ) : null}
    </div>
  )
}

function AgendaMonthHoverBody({ events }: { events: CalendarEvent<CalendarAgendaEvent>[] }) {
  return (
    <div className="gap-spacing-1 px-spacing-2 flex flex-col">
      {events.map((event) => {
        const raw = event.raw as CalendarAgendaEvent
        return (
          <div
            key={event.id}
            className="hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex min-w-0 items-start gap-2 rounded-md"
          >
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: agendaEventColors(raw).border }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="body-3 text-foreground truncate">{event.title}</div>
              <div className="typo-caption text-muted-foreground">
                {formatHoverTimeLabel(event)}
              </div>
              {raw.video_url ? (
                <a
                  href={raw.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="typo-caption text-primary mt-0.5 inline-flex items-center gap-1 hover:underline"
                >
                  Meeting link
                </a>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface AgendaCalendarPanelProps {
  events: CalendarAgendaEvent[]
  navigationAnchor: Date
  /** Initial tab; user can switch Day / Week / Month inside CalendarBoard */
  defaultScope?: 'day' | 'week' | 'month'
  timeFormat?: '12h' | '24h'
  weekStart?: 0 | 1
  onVisibleWindowChange: (window: { start: Date; end: Date }) => void
}

export function AgendaCalendarPanel({
  events: agendaEvents,
  navigationAnchor,
  defaultScope = 'week',
  timeFormat = '12h',
  weekStart = 1,
  onVisibleWindowChange,
}: AgendaCalendarPanelProps) {
  const calendarEvents = useMemo(() => agendaEvents.map(agendaToCalendarEvent), [agendaEvents])

  const renderMonthDayHoverCard = useCallback(
    ({ events }: { day: Date; events: CalendarEvent[] }) => (
      <AgendaMonthHoverBody events={events as CalendarEvent<CalendarAgendaEvent>[]} />
    ),
    [],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-1 sm:px-3">
      <CalendarBoard
        events={calendarEvents}
        defaultScope={defaultScope}
        weekStart={weekStart}
        timeFormat={timeFormat}
        readOnly
        navigationAnchor={navigationAnchor}
        onVisibleWindowChange={onVisibleWindowChange}
        renderMonthDayHoverCard={renderMonthDayHoverCard}
        renderMonthEvent={(event, ctx) => (
          <AgendaMonthBar event={event as CalendarEvent<CalendarAgendaEvent>} ctx={ctx} />
        )}
        renderHourEvent={(event, ctx) => (
          <AgendaHourBlock event={event as CalendarEvent<CalendarAgendaEvent>} ctx={ctx} />
        )}
        renderDayEvent={(event, ctx) => (
          <AgendaHourBlock event={event as CalendarEvent<CalendarAgendaEvent>} ctx={ctx} />
        )}
      />
    </div>
  )
}

export function agendaBoardFallbackWindow(
  anchor: Date,
  weekStart: 0 | 1 = 1,
): { start: Date; end: Date } {
  const d = startOfDay(anchor)
  return getCalendarBoardVisibleWindow('week', d, startOfMonth(d), weekStart)
}
