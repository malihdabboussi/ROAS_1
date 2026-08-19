'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import {
  CALENDAR_HOURS,
  dayKey,
  endOfDay,
  formatHour,
  getCalendarBoardVisibleWindow,
  getHeaderLabel,
  getMonthDays,
  getWeekDays,
  minutesFromMidnight,
  parseCalendarDate,
  sameDay,
  startOfDay,
  startOfMonth,
} from './calendar-utils'
import type {
  CalendarDragPayload,
  CalendarDropTarget,
  CalendarEvent,
  CalendarScope,
  CalendarTimeFormat,
} from './types'

const COMPACT_CELL_THRESHOLD = 80
const SPLIT_BOTTOM_MIN_HEIGHT = 140
const SPLIT_DIVIDER_HEIGHT = 8
const CALENDAR_MIN_HEIGHT_BY_SCOPE: Record<CalendarScope, number> = {
  month: 200,
  week: 200,
  day: 200,
}
const MONTH_MAX_LANES = 3
const MONTH_LANE_HEIGHT = 18
const MONTH_LANE_GAP = 2
const STRIP_MAX_LANES = 2
const STRIP_LANE_HEIGHT = 20
const STRIP_LANE_GAP = 2
const HOUR_HEIGHT_WEEK = 48
const HOUR_HEIGHT_DAY = 56
const POINT_BLOCK_MINUTES = 30
const TIME_RESIZE_STEP_MINUTES = 15
const TIME_RESIZE_MIN_MINUTES = 15
const MONTH_HOVER_CLOSE_DELAY_MS = 350
const MONTH_HOVER_CARD_GAP_PX = 2
const MONTH_HOVER_CARD_WIDTH_PX = 280
const MONTH_HOVER_CARD_MAX_HEIGHT_PX = 256
const MONTH_HOVER_VIEWPORT_MARGIN_PX = 8

export type CalendarEventRole = 'start' | 'middle' | 'end' | 'single'

interface MonthLane {
  event: CalendarEvent
  role: CalendarEventRole
}

interface DayBlock {
  event: CalendarEvent
  topPx: number
  heightPx: number
  role: CalendarEventRole
  lane: number
  laneCount: number
  colSpan: number
}

interface TimeResizeState {
  eventId: string
  startY: number
  startMs: number
  initialEndMs: number
  previewEndMs: number
  maxEndMs: number
  hourHeight: number
}

function isAllDayCalendarEvent(event: CalendarEvent): boolean {
  if (event.allDay === true) return true
  const raw = event.raw as { all_day?: unknown } | null
  return raw?.all_day === true
}

function parseCalendarDayStart(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const parsed = parseCalendarDate(value)
  return parsed ? startOfDay(parsed) : null
}

function getAllDayRange(event: CalendarEvent): { start: Date; end: Date } | null {
  const start = parseCalendarDayStart(event.start)
  if (!start) return null
  const endStart = parseCalendarDayStart(event.end)
  if (!endStart || endStart.getTime() <= start.getTime()) {
    return { start, end: endOfDay(start) }
  }
  const inclusiveEnd = new Date(endStart)
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1)
  if (inclusiveEnd.getTime() < start.getTime()) {
    return { start, end: endOfDay(start) }
  }
  return { start, end: endOfDay(inclusiveEnd) }
}

function getEventRange(event: CalendarEvent): { start: Date; end: Date } | null {
  if (isAllDayCalendarEvent(event)) return getAllDayRange(event)
  const start = parseCalendarDate(event.start)
  if (!start) return null
  const end = event.end ? parseCalendarDate(event.end) : null
  return { start, end: end && end.getTime() >= start.getTime() ? end : start }
}

function formatResizeTime(ms: number): string {
  const date = new Date(ms)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatCalendarHour(hour: number, timeFormat: CalendarTimeFormat): string {
  if (timeFormat === '24h') return `${String(hour).padStart(2, '0')}:00`
  return formatHour(hour)
}

function snappedResizeEndMs(
  initialEndMs: number,
  deltaY: number,
  hourHeight: number,
  startMs: number,
  maxEndMs: number,
): number {
  const pxPerMinute = hourHeight / 60
  const deltaMinutes =
    Math.round(deltaY / pxPerMinute / TIME_RESIZE_STEP_MINUTES) * TIME_RESIZE_STEP_MINUTES
  const minEndMs = startMs + TIME_RESIZE_MIN_MINUTES * 60_000
  return Math.min(maxEndMs, Math.max(minEndMs, initialEndMs + deltaMinutes * 60_000))
}

/**
 * Strip events render in the all-day banner above the hour grid:
 *   - any event that spans more than one calendar day
 *   - any same-day event whose start AND end have no time set (both midnight)
 * Everything else (timed point events, same-day timed ranges) stays in the hour grid.
 */
function isStripEvent(event: CalendarEvent): boolean {
  if (isAllDayCalendarEvent(event)) return getEventRange(event) != null
  const range = getEventRange(event)
  if (!range) return false
  const { start, end } = range
  if (end.getTime() <= start.getTime()) return false
  if (!sameDay(start, end)) return true
  const startMidnight =
    start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0
  const endMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0
  return startMidnight && endMidnight
}

/**
 * Lane-pack events across a contiguous list of days. Used by both:
 *   - the month grid (one call per visible week)
 *   - the all-day strip (one call for the whole week or single day)
 */
function buildLaneLayout(
  events: CalendarEvent[],
  days: Date[],
  maxLanes: number,
): {
  lanesByDay: Map<string, Map<number, MonthLane>>
  overflowByDay: Map<string, number>
} {
  const lanesByDay = new Map<string, Map<number, MonthLane>>()
  const overflowByDay = new Map<string, number>()
  for (const day of days) {
    lanesByDay.set(dayKey(day), new Map())
    overflowByDay.set(dayKey(day), 0)
  }
  if (days.length === 0) return { lanesByDay, overflowByDay }

  const rangeStart = startOfDay(days[0]!).getTime()
  const rangeEnd = endOfDay(days[days.length - 1]!).getTime()

  const visible = events
    .map((event) => ({ event, range: getEventRange(event) }))
    .filter(
      (e): e is { event: CalendarEvent; range: { start: Date; end: Date } } =>
        e.range != null &&
        e.range.end.getTime() >= rangeStart &&
        e.range.start.getTime() <= rangeEnd,
    )

  visible.sort((a, b) => {
    const as = a.range.start.getTime()
    const bs = b.range.start.getTime()
    if (as !== bs) return as - bs
    return (
      b.range.end.getTime() -
      b.range.start.getTime() -
      (a.range.end.getTime() - a.range.start.getTime())
    )
  })

  const occupancy: Set<number>[] = days.map(() => new Set<number>())

  for (const { event, range } of visible) {
    const eStart = range.start.getTime()
    const eEnd = range.end.getTime()

    let firstIdx = -1
    let lastIdx = -1
    for (let i = 0; i < days.length; i++) {
      const dayStart = startOfDay(days[i]!).getTime()
      const dayEnd = endOfDay(days[i]!).getTime()
      if (eEnd >= dayStart && eStart <= dayEnd) {
        if (firstIdx === -1) firstIdx = i
        lastIdx = i
      }
    }
    if (firstIdx === -1) continue

    let lane = 0
    while (true) {
      let conflict = false
      for (let i = firstIdx; i <= lastIdx; i++) {
        if (occupancy[i]!.has(lane)) {
          conflict = true
          break
        }
      }
      if (!conflict) break
      lane++
    }

    const isMultiDay = firstIdx !== lastIdx
    for (let i = firstIdx; i <= lastIdx; i++) {
      occupancy[i]!.add(lane)
      const day = days[i]!
      const k = dayKey(day)
      if (lane < maxLanes) {
        const role: CalendarEventRole = !isMultiDay
          ? 'single'
          : i === firstIdx
            ? 'start'
            : i === lastIdx
              ? 'end'
              : 'middle'
        lanesByDay.get(k)!.set(lane, { event, role })
      } else {
        overflowByDay.set(k, (overflowByDay.get(k) ?? 0) + 1)
      }
    }
  }

  return { lanesByDay, overflowByDay }
}

function stripStats(layout: {
  lanesByDay: Map<string, Map<number, MonthLane>>
  overflowByDay: Map<string, number>
}): { visibleLanes: number; hasOverflow: boolean } {
  let max = -1
  for (const lanes of layout.lanesByDay.values()) {
    for (const lane of lanes.keys()) max = Math.max(max, lane)
  }
  let hasOverflow = false
  for (const v of layout.overflowByDay.values()) {
    if (v > 0) {
      hasOverflow = true
      break
    }
  }
  return { visibleLanes: Math.min(max + 1, STRIP_MAX_LANES), hasOverflow }
}

function buildMonthLayout(
  events: CalendarEvent[],
  monthDays: Date[],
): {
  lanesByDay: Map<string, Map<number, MonthLane>>
  overflowByDay: Map<string, number>
} {
  const lanesByDay = new Map<string, Map<number, MonthLane>>()
  const overflowByDay = new Map<string, number>()
  for (const day of monthDays) {
    lanesByDay.set(dayKey(day), new Map())
    overflowByDay.set(dayKey(day), 0)
  }

  for (let weekStartIdx = 0; weekStartIdx < monthDays.length; weekStartIdx += 7) {
    const week = monthDays.slice(weekStartIdx, weekStartIdx + 7)
    if (week.length === 0) continue
    const weekLayout = buildLaneLayout(events, week, MONTH_MAX_LANES)
    for (const day of week) {
      const k = dayKey(day)
      const lanes = weekLayout.lanesByDay.get(k)
      if (lanes) lanesByDay.set(k, lanes)
      overflowByDay.set(k, weekLayout.overflowByDay.get(k) ?? 0)
    }
  }

  return { lanesByDay, overflowByDay }
}

function buildDayBlocks(events: CalendarEvent[], day: Date, hourHeight: number): DayBlock[] {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = endOfDay(day).getTime()
  const minPerPx = hourHeight / 60

  type Pending = {
    event: CalendarEvent
    topPx: number
    heightPx: number
    role: CalendarEventRole
    sliceStart: number
    sliceEnd: number
    lane: number
    laneCount: number
    colSpan: number
  }

  const pending: Pending[] = []

  for (const event of events) {
    const range = getEventRange(event)
    if (!range) continue
    const eStart = range.start.getTime()
    const eEnd = range.end.getTime()
    if (eEnd < dayStart || eStart > dayEnd) continue

    const sliceStart = Math.max(eStart, dayStart)
    const isRange = eEnd > eStart
    let sliceEnd: number
    if (isRange) {
      sliceEnd = Math.min(eEnd, dayEnd)
    } else {
      sliceEnd = sliceStart + POINT_BLOCK_MINUTES * 60_000
    }

    const startMinutes = sliceStart === dayStart ? 0 : minutesFromMidnight(new Date(sliceStart))
    const endMinutes = sliceEnd >= dayEnd ? 24 * 60 : minutesFromMidnight(new Date(sliceEnd))
    const heightMinutes = Math.max(20 / minPerPx, endMinutes - startMinutes)

    let role: CalendarEventRole = 'single'
    if (isRange) {
      const startsToday = eStart >= dayStart
      const endsToday = eEnd <= dayEnd
      role =
        startsToday && endsToday ? 'single' : startsToday ? 'start' : endsToday ? 'end' : 'middle'
    }

    pending.push({
      event,
      topPx: startMinutes * minPerPx,
      heightPx: heightMinutes * minPerPx,
      role,
      sliceStart,
      sliceEnd,
      lane: 0,
      laneCount: 1,
      colSpan: 1,
    })
  }

  pending.sort((a, b) => a.sliceStart - b.sliceStart || a.sliceEnd - b.sliceEnd)

  const clusters: Pending[][] = []
  let active: Pending[] = []
  let cluster: Pending[] = []

  for (const item of pending) {
    active = active.filter((a) => a.sliceEnd > item.sliceStart)
    if (active.length === 0 && cluster.length > 0) {
      clusters.push(cluster)
      cluster = []
    }
    const usedLanes = new Set(active.map((a) => a.lane))
    let lane = 0
    while (usedLanes.has(lane)) lane++
    item.lane = lane
    active.push(item)
    cluster.push(item)
  }
  if (cluster.length > 0) clusters.push(cluster)

  for (const group of clusters) {
    const laneCount = group.reduce((max, p) => Math.max(max, p.lane), 0) + 1
    for (const p of group) {
      p.laneCount = laneCount
      let endLane = p.lane + 1
      while (endLane < laneCount) {
        const conflict = group.some(
          (q) =>
            q !== p && q.lane === endLane && q.sliceStart < p.sliceEnd && q.sliceEnd > p.sliceStart,
        )
        if (conflict) break
        endLane++
      }
      p.colSpan = endLane - p.lane
    }
  }

  return pending
    .map<DayBlock>((p) => ({
      event: p.event,
      topPx: p.topPx,
      heightPx: p.heightPx,
      role: p.role,
      lane: p.lane,
      laneCount: p.laneCount,
      colSpan: p.colSpan,
    }))
    .sort((a, b) => a.topPx - b.topPx)
}

function initialScrollTopForDays(
  events: CalendarEvent[],
  days: Date[],
  hourHeight: number,
): number {
  if (days.length === 0) return 0
  const rangeStart = startOfDay(days[0]!).getTime()
  const rangeEnd = endOfDay(days[days.length - 1]!).getTime()
  let earliestMinute: number | null = null

  for (const event of events) {
    const range = getEventRange(event)
    if (!range) continue
    const eventStart = range.start.getTime()
    const eventEnd = range.end.getTime()
    if (eventEnd < rangeStart || eventStart > rangeEnd) continue
    const sliceStart = Math.max(eventStart, rangeStart)
    const minute = minutesFromMidnight(new Date(sliceStart))
    earliestMinute = earliestMinute == null ? minute : Math.min(earliestMinute, minute)
  }

  if (earliestMinute == null) {
    const now = new Date()
    if (days.some((day) => sameDay(day, now))) {
      earliestMinute = minutesFromMidnight(now)
    }
  }

  if (earliestMinute == null) return 0
  return Math.max(0, (earliestMinute - 60) * (hourHeight / 60))
}

function dayCellClass(isSelected: boolean, isToday: boolean, isCurrentMonth: boolean): string {
  const base =
    'border-border h-full min-h-[100px] overflow-hidden rounded-lg border p-1.5 text-left transition-colors relative'
  let variant = 'surface-card hover:bg-hover-subtle'
  if (isSelected) variant = 'chip-glass-blue'
  else if (isToday) variant = 'chip-glass-green'
  return `${base} ${variant} ${!isCurrentMonth ? 'opacity-50' : ''}`
}

function targetFromDropId(id: string): CalendarDropTarget | null {
  if (id.startsWith('month-day:')) {
    const [, day] = id.split(':')
    return day ? { type: 'month-day', day } : null
  }
  if (id.startsWith('week-hour:')) {
    const [, day, hourRaw] = id.split(':')
    const hour = Number(hourRaw)
    return day && !Number.isNaN(hour) ? { type: 'week-hour', day, hour } : null
  }
  if (id.startsWith('day-hour:')) {
    const [, day, hourRaw] = id.split(':')
    const hour = Number(hourRaw)
    return day && !Number.isNaN(hour) ? { type: 'day-hour', day, hour } : null
  }
  return { type: 'custom', id }
}

function getMonthHoverCardStyle(
  rect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
): CSSProperties {
  const cardWidth = Math.min(
    MONTH_HOVER_CARD_WIDTH_PX,
    Math.max(0, viewportWidth - MONTH_HOVER_VIEWPORT_MARGIN_PX * 2),
  )
  const left = Math.max(
    MONTH_HOVER_VIEWPORT_MARGIN_PX,
    Math.min(
      viewportWidth - cardWidth - MONTH_HOVER_VIEWPORT_MARGIN_PX,
      rect.left + rect.width / 2 - cardWidth / 2,
    ),
  )
  const availableAbove = Math.max(
    0,
    rect.top - MONTH_HOVER_CARD_GAP_PX - MONTH_HOVER_VIEWPORT_MARGIN_PX,
  )
  const availableBelow = Math.max(
    0,
    viewportHeight - rect.bottom - MONTH_HOVER_CARD_GAP_PX - MONTH_HOVER_VIEWPORT_MARGIN_PX,
  )
  const openBelow =
    availableBelow > availableAbove && availableAbove < MONTH_HOVER_CARD_MAX_HEIGHT_PX
  const availableHeight = openBelow ? availableBelow : availableAbove
  const maxHeight = Math.min(MONTH_HOVER_CARD_MAX_HEIGHT_PX, availableHeight)
  return {
    left,
    top: openBelow ? rect.bottom + MONTH_HOVER_CARD_GAP_PX : rect.top - MONTH_HOVER_CARD_GAP_PX,
    width: cardWidth,
    maxHeight,
    transform: openBelow ? undefined : 'translateY(-100%)',
  }
}

export function DraggableCalendarItem({
  event,
  id,
  children,
  disabled,
}: {
  event: CalendarEvent
  id?: string
  children: ReactNode
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id ?? event.id,
    data: { eventId: event.id },
    disabled: disabled || event.draggable === false,
  })
  const style = { transform: CSS.Translate.toString(transform) }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full w-full ${isDragging ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
}

export function CalendarDroppable({
  id,
  className,
  children,
  onPointerEnter,
  onPointerLeave,
}: {
  id: string
  className?: string
  children: ReactNode
  onPointerEnter?: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerLeave?: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isOver ? 'ring-primary/50 ring-1' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  )
}

function DroppableMonthCell({
  id,
  className,
  onClick,
  children,
}: {
  id: string
  className: string
  onClick: () => void
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`block w-full min-w-0 cursor-pointer ${className} ${isOver ? 'ring-primary/50 ring-1' : ''}`}
    >
      {children}
    </div>
  )
}

export interface CalendarRenderContext {
  compact: boolean
  role: CalendarEventRole
}

interface CalendarBoardProps {
  events: CalendarEvent[]
  draggableEvents?: CalendarEvent[]
  defaultScope?: CalendarScope
  weekStart?: 0 | 1
  timeFormat?: CalendarTimeFormat
  readOnly?: boolean
  /**
   * When the parent navigator date (`day`) changes, snap the inner selected month/day to stay aligned — e.g. Home Agenda outer chevrons.
   */
  navigationAnchor?: Date
  /** Fired whenever the navigated canvas (scope + paging + anchor) exposes a new visible inclusive date span. Use to refetch events. */
  onVisibleWindowChange?: (window: { start: Date; end: Date }) => void
  renderMonthEvent: (event: CalendarEvent, ctx: CalendarRenderContext) => ReactNode
  renderHourEvent: (event: CalendarEvent, ctx: CalendarRenderContext) => ReactNode
  renderDayEvent: (event: CalendarEvent, ctx: CalendarRenderContext) => ReactNode
  /** Month grid: hover popover above the day (portal); list all events for that day. */
  renderMonthDayHoverCard?: (ctx: { day: Date; events: CalendarEvent[] }) => ReactNode
  children?: (state: { selectedDay: Date; selectedEvents: CalendarEvent[] }) => ReactNode
  onDrop?: (payload: CalendarDragPayload) => void | Promise<void>
  onResizeEnd?: (payload: { event: CalendarEvent; end: string }) => void | Promise<void>
}

function StripLaneRow({
  days,
  layout,
  lane,
  renderEvent,
  readOnly,
  compact,
}: {
  days: Date[]
  layout: { lanesByDay: Map<string, Map<number, MonthLane>> }
  lane: number
  renderEvent: (event: CalendarEvent, ctx: CalendarRenderContext) => ReactNode
  readOnly: boolean
  compact: boolean
}) {
  const cells: ReactNode[] = []
  let i = 0
  while (i < days.length) {
    const day = days[i]!
    const slot = layout.lanesByDay.get(dayKey(day))?.get(lane)
    if (!slot) {
      cells.push(<div key={`empty-${lane}-${i}`} style={{ height: STRIP_LANE_HEIGHT }} />)
      i++
      continue
    }
    let span = 1
    while (i + span < days.length) {
      const ns = layout.lanesByDay.get(dayKey(days[i + span]!))?.get(lane)
      if (ns?.event !== slot.event) break
      span++
    }
    cells.push(
      <div
        key={`bar-${lane}-${i}-${slot.event.id}`}
        style={{ gridColumn: `span ${span}`, height: STRIP_LANE_HEIGHT }}
        className="min-w-0 px-[2px]"
      >
        <DraggableCalendarItem
          id={`${slot.event.id}:strip:${dayKey(day)}`}
          event={slot.event}
          disabled={readOnly}
        >
          <div className="h-full w-full overflow-hidden">
            {renderEvent(slot.event, { compact, role: slot.role })}
          </div>
        </DraggableCalendarItem>
      </div>,
    )
    i += span
  }
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {cells}
    </div>
  )
}

export function CalendarBoard({
  events,
  draggableEvents = [],
  defaultScope = 'month',
  weekStart = 0,
  timeFormat = '12h',
  readOnly = false,
  navigationAnchor,
  onVisibleWindowChange,
  renderMonthEvent,
  renderHourEvent,
  renderDayEvent,
  renderMonthDayHoverCard,
  children,
  onDrop,
  onResizeEnd,
}: CalendarBoardProps) {
  const [scope, setScope] = useState<CalendarScope>(defaultScope)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [bottomHeightPx, setBottomHeightPx] = useState<number>(280)
  const [isResizingSplit, setIsResizingSplit] = useState(false)
  const [monthHover, setMonthHover] = useState<{
    key: string
    day: Date
    events: CalendarEvent[]
    rect: DOMRect
    anchor?: HTMLElement
  } | null>(null)
  const monthHoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const splitDividerRef = useRef<HTMLDivElement>(null)
  const dayScrollRef = useRef<HTMLDivElement>(null)
  const weekScrollRef = useRef<HTMLDivElement>(null)
  const monthScrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const [timeResize, setTimeResize] = useState<TimeResizeState | null>(null)
  const anchorDayKeyAppliedRef = useRef<string | null>(null)

  /** Parent-only: align inner calendar when Agenda (or similar) changes outer `day`. */
  useEffect(() => {
    if (!navigationAnchor) {
      anchorDayKeyAppliedRef.current = null
      return
    }
    const key = dayKey(navigationAnchor)
    if (anchorDayKeyAppliedRef.current === key) return
    anchorDayKeyAppliedRef.current = key
    const d = startOfDay(navigationAnchor)
    setSelectedDay(d)
    setCurrentMonth(startOfMonth(d))
  }, [navigationAnchor])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const cellWidth = entry.contentRect.width / 7
      setCompact(cellWidth < COMPACT_CELL_THRESHOLD)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Month grids taller than the viewport open scrolled to the first week —
  // when the visible month contains today, bring today's week into view instead.
  useEffect(() => {
    if (scope !== 'month') return
    const container = monthScrollRef.current
    if (!container) return
    const cell = container.querySelector(`[data-calendar-month-cell="${dayKey(today)}"]`)
    if (!(cell instanceof HTMLElement)) return
    const cRect = container.getBoundingClientRect()
    const eRect = cell.getBoundingClientRect()
    const delta = eRect.top - cRect.top - (cRect.height - eRect.height) / 2
    if (Math.abs(delta) > 4) container.scrollTop += delta
  }, [scope, currentMonth, today])

  const eventsById = useMemo(
    () => new Map([...events, ...draggableEvents].map((event) => [event.id, event])),
    [events, draggableEvents],
  )
  const monthDays = useMemo(() => getMonthDays(currentMonth, weekStart), [currentMonth, weekStart])
  const weekDays = useMemo(() => getWeekDays(selectedDay, weekStart), [selectedDay, weekStart])

  const partitionedEvents = useMemo(() => {
    const strip: CalendarEvent[] = []
    const hour: CalendarEvent[] = []
    for (const event of events) {
      if (isStripEvent(event)) strip.push(event)
      else hour.push(event)
    }
    return { strip, hour }
  }, [events])
  const stripEvents = partitionedEvents.strip
  const hourEvents = partitionedEvents.hour

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const range = getEventRange(event)
      if (!range) continue
      const cursor = startOfDay(range.start)
      const limit = startOfDay(range.end)
      while (cursor.getTime() <= limit.getTime()) {
        const key = dayKey(cursor)
        const bucket = map.get(key) ?? []
        bucket.push(event)
        map.set(key, bucket)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    }
    return map
  }, [events])

  const eventsByDayHour = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of hourEvents) {
      const range = getEventRange(event)
      if (!range) continue
      const eStart = range.start.getTime()
      const eEnd = range.end.getTime()
      const isRange = eEnd > eStart
      if (!isRange) {
        const key = `${dayKey(range.start)}-${range.start.getHours()}`
        const bucket = map.get(key) ?? []
        bucket.push(event)
        map.set(key, bucket)
        continue
      }
      const cursor = startOfDay(range.start)
      const limit = startOfDay(range.end)
      while (cursor.getTime() <= limit.getTime()) {
        const startHour = sameDay(cursor, range.start) ? range.start.getHours() : 0
        const endHour = sameDay(cursor, range.end) ? range.end.getHours() : 23
        const k = dayKey(cursor)
        for (let h = startHour; h <= endHour; h++) {
          const key = `${k}-${h}`
          const bucket = map.get(key) ?? []
          bucket.push(event)
          map.set(key, bucket)
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return map
  }, [hourEvents])

  const monthLayout = useMemo(() => buildMonthLayout(events, monthDays), [events, monthDays])

  const weekStripLayout = useMemo(
    () => buildLaneLayout(stripEvents, weekDays, STRIP_MAX_LANES),
    [stripEvents, weekDays],
  )

  const dayStripLayout = useMemo(
    () => buildLaneLayout(stripEvents, [selectedDay], STRIP_MAX_LANES),
    [stripEvents, selectedDay],
  )

  const weekDayBlocks = useMemo(() => {
    const map = new Map<string, DayBlock[]>()
    for (const day of weekDays) {
      map.set(dayKey(day), buildDayBlocks(hourEvents, day, HOUR_HEIGHT_WEEK))
    }
    return map
  }, [hourEvents, weekDays])

  const dayBlocks = useMemo(
    () => buildDayBlocks(hourEvents, selectedDay, HOUR_HEIGHT_DAY),
    [hourEvents, selectedDay],
  )

  useEffect(() => {
    if (scope === 'day' && dayScrollRef.current) {
      dayScrollRef.current.scrollTop = initialScrollTopForDays(
        hourEvents,
        [selectedDay],
        HOUR_HEIGHT_DAY,
      )
    }
    if (scope === 'week' && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = initialScrollTopForDays(
        hourEvents,
        weekDays,
        HOUR_HEIGHT_WEEK,
      )
    }
  }, [hourEvents, scope, selectedDay, weekDays])

  const weekStripStats = useMemo(() => stripStats(weekStripLayout), [weekStripLayout])
  const dayStripStats = useMemo(() => stripStats(dayStripLayout), [dayStripLayout])

  const selectedEvents = useMemo(
    () => eventsByDay.get(dayKey(selectedDay)) ?? [],
    [eventsByDay, selectedDay],
  )

  const headerLabel = useMemo(
    () => getHeaderLabel(scope, selectedDay, currentMonth, weekStart),
    [scope, selectedDay, currentMonth, weekStart],
  )

  const visibleWindow = useMemo(
    () => getCalendarBoardVisibleWindow(scope, selectedDay, currentMonth, weekStart),
    [scope, selectedDay, currentMonth, weekStart],
  )

  const visibleWindowSignatureRef = useRef<{ startMs: number; endMs: number } | null>(null)
  useEffect(() => {
    if (!onVisibleWindowChange) return
    const startMs = visibleWindow.start.getTime()
    const endMs = visibleWindow.end.getTime()
    const prev = visibleWindowSignatureRef.current
    if (prev?.startMs === startMs && prev?.endMs === endMs) return
    visibleWindowSignatureRef.current = { startMs, endMs }
    onVisibleWindowChange(visibleWindow)
  }, [visibleWindow, onVisibleWindowChange])

  const handlePrev = useCallback(() => {
    if (scope === 'day') {
      setSelectedDay((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() - 1)
        return d
      })
    } else if (scope === 'week') {
      setSelectedDay((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() - 7)
        return d
      })
    } else {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }
  }, [scope])

  const handleNext = useCallback(() => {
    if (scope === 'day') {
      setSelectedDay((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() + 1)
        return d
      })
    } else if (scope === 'week') {
      setSelectedDay((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() + 7)
        return d
      })
    } else {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }
  }, [scope])

  const handleScopeChange = useCallback(
    (next: string) => {
      const s = next as CalendarScope
      setScope(s)
      if (s === 'month') setCurrentMonth(startOfMonth(selectedDay))
    },
    [selectedDay],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!event.over) return
      const eventId =
        (event.active.data.current?.eventId as string | undefined) ?? String(event.active.id)
      const calendarEvent = eventsById.get(eventId)
      if (!calendarEvent) return
      const target = targetFromDropId(String(event.over.id))
      if (!target) return
      await onDrop?.({ event: calendarEvent, target })
    },
    [eventsById, onDrop],
  )

  const clearMonthHoverCloseTimer = useCallback(() => {
    if (monthHoverCloseTimerRef.current != null) {
      clearTimeout(monthHoverCloseTimerRef.current)
      monthHoverCloseTimerRef.current = null
    }
  }, [])

  const scheduleMonthHoverClose = useCallback(() => {
    clearMonthHoverCloseTimer()
    monthHoverCloseTimerRef.current = setTimeout(() => {
      monthHoverCloseTimerRef.current = null
      setMonthHover(null)
    }, MONTH_HOVER_CLOSE_DELAY_MS)
  }, [clearMonthHoverCloseTimer])

  useEffect(() => () => clearMonthHoverCloseTimer(), [clearMonthHoverCloseTimer])

  const getMaxBottomHeight = useCallback(() => {
    const containerEl = containerRef.current
    if (!containerEl) return 280

    const styles = window.getComputedStyle(containerEl)
    const gap = Number.parseFloat(styles.rowGap || styles.gap || '0') || 0
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0
    const dividerHeight =
      splitDividerRef.current?.getBoundingClientRect().height || SPLIT_DIVIDER_HEIGHT
    const calendarMinHeight = CALENDAR_MIN_HEIGHT_BY_SCOPE[scope]
    const available =
      containerEl.clientHeight - headerHeight - dividerHeight - gap * 3 - calendarMinHeight

    return Math.max(SPLIT_BOTTOM_MIN_HEIGHT, Math.floor(available))
  }, [scope])

  const clampBottomHeight = useCallback(
    (height: number) =>
      Math.min(getMaxBottomHeight(), Math.max(SPLIT_BOTTOM_MIN_HEIGHT, Math.round(height))),
    [getMaxBottomHeight],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const sync = () => setBottomHeightPx((height) => clampBottomHeight(height))
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [clampBottomHeight])

  const handleSplitPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const startY = e.clientY
      const startHeight = bottomHeightPx
      setIsResizingSplit(true)

      const onMove = (ev: PointerEvent) => {
        const delta = startY - ev.clientY
        setBottomHeightPx(clampBottomHeight(startHeight + delta))
      }
      const onUp = () => {
        setIsResizingSplit(false)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [bottomHeightPx, clampBottomHeight],
  )

  const handleTimeResizePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      calendarEvent: CalendarEvent,
      day: Date,
      hourHeight: number,
    ) => {
      if (readOnly || !calendarEvent.end || !onResizeEnd) return
      const start = parseCalendarDate(calendarEvent.start)
      const end = parseCalendarDate(calendarEvent.end)
      if (!start || !end || end.getTime() <= start.getTime()) return

      e.preventDefault()
      e.stopPropagation()

      const startMs = start.getTime()
      const initialEndMs = end.getTime()
      const maxEndMs = startOfDay(day).getTime() + 24 * 60 * 60_000
      let nextEndMs = initialEndMs
      setTimeResize({
        eventId: calendarEvent.id,
        startY: e.clientY,
        startMs,
        initialEndMs,
        previewEndMs: initialEndMs,
        maxEndMs,
        hourHeight,
      })

      const onMove = (ev: PointerEvent) => {
        nextEndMs = snappedResizeEndMs(
          initialEndMs,
          ev.clientY - e.clientY,
          hourHeight,
          startMs,
          maxEndMs,
        )
        setTimeResize((current) =>
          current?.eventId === calendarEvent.id ? { ...current, previewEndMs: nextEndMs } : current,
        )
      }

      const onUp = () => {
        setTimeResize(null)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        if (nextEndMs !== initialEndMs) {
          void onResizeEnd({ event: calendarEvent, end: new Date(nextEndMs).toISOString() })
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [onResizeEnd, readOnly],
  )

  useEffect(() => {
    if (!monthHover) return
    const k = monthHover.key
    const sync = () => {
      const el =
        monthHover.anchor ??
        (document.querySelector(`[data-calendar-month-cell="${k}"]`) as HTMLElement | null)
      if (!el) {
        setMonthHover(null)
        return
      }
      if (!el.isConnected) {
        setMonthHover(null)
        return
      }
      setMonthHover((h) => (h && h.key === k ? { ...h, rect: el.getBoundingClientRect() } : h))
    }
    sync()
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [monthHover?.key])

  return (
    <DndContext onDragEnd={readOnly ? undefined : handleDragEnd}>
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-3">
        <div ref={headerRef} className="flex items-center justify-between">
          <div className="body-2 text-foreground font-medium">{headerLabel}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="chip-glass-neutral flex h-8 w-8 items-center justify-center rounded-lg"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Tabs value={scope} onValueChange={handleScopeChange}>
              <TabsList variant="liquid">
                <TabsTrigger value="day" className="px-spacing-2">
                  <span className="body-4">Day</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="px-spacing-2">
                  <span className="body-4">Week</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="px-spacing-2">
                  <span className="body-4">Month</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              type="button"
              className="chip-glass-neutral flex h-8 w-8 items-center justify-center rounded-lg"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {monthHover && renderMonthDayHoverCard && typeof document !== 'undefined'
          ? createPortal(
              <div
                className="dropdown-menu-solid z-dropdown border-border py-spacing-2 pointer-events-auto fixed overflow-y-auto rounded-xl border shadow-lg"
                style={getMonthHoverCardStyle(
                  monthHover.rect,
                  window.innerWidth,
                  window.innerHeight,
                )}
                onPointerEnter={clearMonthHoverCloseTimer}
                onPointerLeave={scheduleMonthHoverClose}
              >
                <p className="typo-section-label text-muted-foreground px-spacing-3 pb-spacing-1">
                  {monthHover.day.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {renderMonthDayHoverCard({ day: monthHover.day, events: monthHover.events })}
              </div>,
              document.body,
            )
          : null}

        {scope === 'month' && (
          <>
            <div
              ref={monthScrollRef}
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
            >
              <div className="grid shrink-0 grid-cols-7 gap-1">
                {getWeekDays(new Date(2024, 0, weekStart === 1 ? 1 : 7), weekStart).map((day) => (
                  <div
                    key={day.getDay()}
                    className="typo-caption text-muted-foreground px-2 py-1 text-center uppercase"
                  >
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                ))}
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 [grid-auto-rows:minmax(100px,1fr)]">
                {monthDays.map((day) => {
                  const key = dayKey(day)
                  const dayEvents = eventsByDay.get(key) ?? []
                  const lanes = monthLayout.lanesByDay.get(key)
                  const overflow = monthLayout.overflowByDay.get(key) ?? 0
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                  const isSelected = sameDay(day, selectedDay)
                  const isDayToday = sameDay(day, today)
                  return (
                    <div
                      key={key}
                      className="relative min-w-0"
                      data-calendar-month-cell={key}
                      onPointerEnter={(e) => {
                        if (!renderMonthDayHoverCard || dayEvents.length === 0) return
                        clearMonthHoverCloseTimer()
                        setMonthHover({
                          key,
                          day,
                          events: dayEvents,
                          rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                          anchor: e.currentTarget as HTMLElement,
                        })
                      }}
                      onPointerLeave={scheduleMonthHoverClose}
                    >
                      <DroppableMonthCell
                        id={`month-day:${key}`}
                        onClick={() => setSelectedDay(day)}
                        className={dayCellClass(isSelected, isDayToday, isCurrentMonth)}
                      >
                        <div className="body-4 text-foreground mb-1 font-medium leading-none">
                          {day.getDate()}
                        </div>
                        <div className="flex flex-col" style={{ rowGap: MONTH_LANE_GAP }}>
                          {Array.from({ length: MONTH_MAX_LANES }).map((_, lane) => {
                            const slot = lanes?.get(lane)
                            if (!slot) {
                              return (
                                <div
                                  key={`empty:${lane}`}
                                  className="shrink-0"
                                  style={{ height: MONTH_LANE_HEIGHT }}
                                  aria-hidden
                                />
                              )
                            }
                            const { event, role } = slot
                            return (
                              <DraggableCalendarItem
                                key={`${event.id}:${key}:${lane}`}
                                id={`${event.id}:${key}`}
                                event={event}
                                disabled={readOnly}
                              >
                                {renderMonthEvent(event, { compact, role })}
                              </DraggableCalendarItem>
                            )
                          })}
                        </div>
                        {overflow > 0 && (
                          <>
                            <div
                              aria-hidden
                              className="via-[var(--color-card)]/85 pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--color-card)] from-40% via-70% to-transparent"
                            />
                            <span className="typo-caption text-muted-foreground absolute bottom-1 right-1.5 z-[1] leading-none">
                              +{overflow} more
                            </span>
                          </>
                        )}
                      </DroppableMonthCell>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {scope === 'week' && (
          <div className="flex min-h-0 flex-1 flex-col overflow-x-auto rounded-lg">
            <div className="min-w-[500px] shrink-0">
              <div
                className="grid"
                style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
              >
                <div className="bg-card rounded-tl-lg" />
                {weekDays.map((day, i) => {
                  const isSelected = sameDay(day, selectedDay)
                  const isDayToday = sameDay(day, today)
                  const isLast = i === 6
                  return (
                    <button
                      key={dayKey(day)}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`bg-card border-border border-b px-1 py-2 text-center transition-colors ${
                        isLast ? 'rounded-tr-lg' : ''
                      } ${isSelected ? 'chip-glass-blue rounded-t-lg' : isDayToday ? 'chip-glass-green rounded-t-lg' : ''}`}
                    >
                      <div className="typo-caption text-muted-foreground uppercase">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="body-3 text-foreground font-medium">{day.getDate()}</div>
                    </button>
                  )
                })}
              </div>
              <div
                className="border-border bg-card grid border-b"
                style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
              >
                <div className="typo-caption text-muted-foreground border-border flex items-center justify-end self-stretch border-r pr-2">
                  all-day
                </div>
                <div className="col-span-7 flex flex-col py-1" style={{ rowGap: STRIP_LANE_GAP }}>
                  {Array.from({ length: Math.max(weekStripStats.visibleLanes, 1) }).map(
                    (_, lane) => (
                      <StripLaneRow
                        key={lane}
                        days={weekDays}
                        layout={weekStripLayout}
                        lane={lane}
                        renderEvent={renderMonthEvent}
                        readOnly={readOnly}
                        compact={compact}
                      />
                    ),
                  )}
                  {weekStripStats.hasOverflow && (
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                    >
                      {weekDays.map((day, i) => {
                        const overflow = weekStripLayout.overflowByDay.get(dayKey(day)) ?? 0
                        if (overflow === 0) return <div key={`overflow-${i}`} />
                        return (
                          <button
                            key={`overflow-${i}`}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className="typo-caption text-muted-foreground hover:text-foreground px-2 text-left leading-none"
                          >
                            +{overflow} more
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div ref={weekScrollRef} className="min-h-0 flex-1 overflow-y-auto">
              <div className="min-w-[500px]">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
                >
                  <div className="flex flex-col">
                    {CALENDAR_HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="typo-caption text-muted-foreground flex items-center justify-end px-2"
                        style={{ height: HOUR_HEIGHT_WEEK }}
                      >
                        {formatCalendarHour(hour, timeFormat)}
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day) => {
                    const dKey = dayKey(day)
                    const blocks = weekDayBlocks.get(dKey) ?? []
                    return (
                      <div key={dKey} className="relative flex flex-col">
                        {CALENDAR_HOURS.map((hour) => {
                          const cellKey = `${dKey}-${hour}`
                          const cellEvents = eventsByDayHour.get(cellKey) ?? []
                          return (
                            <CalendarDroppable
                              id={`week-hour:${dKey}:${hour}`}
                              key={cellKey}
                              className="border-border hover:bg-hover-subtle overflow-hidden border-b border-l"
                              onPointerEnter={(e) => {
                                if (!renderMonthDayHoverCard || cellEvents.length === 0) return
                                clearMonthHoverCloseTimer()
                                setMonthHover({
                                  key: `week:${cellKey}`,
                                  day,
                                  events: cellEvents,
                                  rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                                  anchor: e.currentTarget as HTMLElement,
                                })
                              }}
                              onPointerLeave={scheduleMonthHoverClose}
                            >
                              <div style={{ height: HOUR_HEIGHT_WEEK - 1 }} aria-hidden />
                            </CalendarDroppable>
                          )
                        })}
                        <div className="pointer-events-none absolute inset-0">
                          {blocks.map((block) => {
                            const widthPct = (block.colSpan * 100) / block.laneCount
                            const leftPct = (block.lane * 100) / block.laneCount
                            const gutter = 2
                            const activeResize =
                              timeResize?.eventId === block.event.id ? timeResize : null
                            const blockHeight = activeResize
                              ? Math.max(
                                  ((activeResize.previewEndMs - activeResize.startMs) / 60_000) *
                                    (HOUR_HEIGHT_WEEK / 60) -
                                    2,
                                  16,
                                )
                              : Math.max(block.heightPx - 2, 16)
                            const canResize = !readOnly && Boolean(onResizeEnd && block.event.end)
                            return (
                              <div
                                key={`${block.event.id}:${dKey}:${block.topPx}:${block.lane}`}
                                className="group/time-resize pointer-events-auto absolute"
                                style={{
                                  top: block.topPx + 1,
                                  height: blockHeight,
                                  left: `calc(${leftPct}% + ${gutter}px)`,
                                  width: `calc(${widthPct}% - ${gutter * 2}px)`,
                                }}
                              >
                                <DraggableCalendarItem
                                  id={`${block.event.id}:${dKey}`}
                                  event={block.event}
                                  disabled={readOnly}
                                >
                                  <div className="h-full w-full overflow-hidden">
                                    {renderHourEvent(block.event, { compact, role: block.role })}
                                  </div>
                                </DraggableCalendarItem>
                                {activeResize && (
                                  <div className="dropdown-menu-solid text-foreground pointer-events-none absolute bottom-1 right-1 z-[2] rounded-md px-1.5 py-0.5 text-[10px] leading-none">
                                    {formatResizeTime(activeResize.previewEndMs)}
                                  </div>
                                )}
                                {canResize && (
                                  <div
                                    className="absolute inset-x-0 bottom-0 z-[3] h-2 cursor-ns-resize rounded-b-md opacity-0 transition-opacity group-hover/time-resize:opacity-100"
                                    onPointerDown={(e) =>
                                      handleTimeResizePointerDown(
                                        e,
                                        block.event,
                                        day,
                                        HOUR_HEIGHT_WEEK,
                                      )
                                    }
                                    aria-label="Resize event duration"
                                    role="separator"
                                  >
                                    <div className="bg-primary/80 mx-auto mt-[3px] h-0.5 w-8 rounded-full" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {scope === 'day' && (
          <div className="flex min-h-0 flex-1 flex-col rounded-lg">
            <div className="border-border bg-card flex shrink-0 border-b">
              <div className="typo-caption text-muted-foreground border-border flex w-16 shrink-0 items-center justify-end self-stretch border-r pr-2">
                all-day
              </div>
              <div className="flex min-w-0 flex-1 flex-col py-1" style={{ rowGap: STRIP_LANE_GAP }}>
                {Array.from({ length: Math.max(dayStripStats.visibleLanes, 1) }).map((_, lane) => (
                  <StripLaneRow
                    key={lane}
                    days={[selectedDay]}
                    layout={dayStripLayout}
                    lane={lane}
                    renderEvent={renderMonthEvent}
                    readOnly={readOnly}
                    compact={compact}
                  />
                ))}
                {dayStripStats.hasOverflow && (
                  <div className="px-2">
                    <span className="typo-caption text-muted-foreground leading-none">
                      +{dayStripLayout.overflowByDay.get(dayKey(selectedDay)) ?? 0} more
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div ref={dayScrollRef} className="min-h-0 flex-1 overflow-auto">
              <div className="relative flex flex-col">
                {CALENDAR_HOURS.map((hour) => {
                  const cellKey = `${dayKey(selectedDay)}-${hour}`
                  return (
                    <div
                      key={hour}
                      className="border-border flex overflow-hidden border-b"
                      style={{ height: HOUR_HEIGHT_DAY }}
                    >
                      <div className="typo-caption text-muted-foreground flex w-16 shrink-0 items-center justify-end px-2">
                        {formatCalendarHour(hour, timeFormat)}
                      </div>
                      <CalendarDroppable
                        id={`day-hour:${dayKey(selectedDay)}:${hour}`}
                        key={cellKey}
                        className="border-border hover:bg-hover-subtle min-w-0 flex-1 overflow-hidden border-l"
                      >
                        <div style={{ height: HOUR_HEIGHT_DAY }} aria-hidden />
                      </CalendarDroppable>
                    </div>
                  )
                })}
                <div className="pointer-events-none absolute inset-y-0 left-16 right-0">
                  {dayBlocks.map((block) => {
                    const widthPct = (block.colSpan * 100) / block.laneCount
                    const leftPct = (block.lane * 100) / block.laneCount
                    const gutter = 4
                    const activeResize = timeResize?.eventId === block.event.id ? timeResize : null
                    const blockHeight = activeResize
                      ? Math.max(
                          ((activeResize.previewEndMs - activeResize.startMs) / 60_000) *
                            (HOUR_HEIGHT_DAY / 60) -
                            2,
                          18,
                        )
                      : Math.max(block.heightPx - 2, 18)
                    const canResize = !readOnly && Boolean(onResizeEnd && block.event.end)
                    return (
                      <div
                        key={`${block.event.id}:${block.topPx}:${block.lane}`}
                        className="group/time-resize pointer-events-auto absolute"
                        style={{
                          top: block.topPx + 1,
                          height: blockHeight,
                          left: `calc(${leftPct}% + ${gutter}px)`,
                          width: `calc(${widthPct}% - ${gutter * 2}px)`,
                        }}
                      >
                        <DraggableCalendarItem
                          id={`${block.event.id}:${dayKey(selectedDay)}`}
                          event={block.event}
                          disabled={readOnly}
                        >
                          <div className="h-full w-full overflow-hidden">
                            {renderDayEvent(block.event, { compact, role: block.role })}
                          </div>
                        </DraggableCalendarItem>
                        {activeResize && (
                          <div className="dropdown-menu-solid text-foreground pointer-events-none absolute bottom-1 right-1 z-[2] rounded-md px-1.5 py-0.5 text-[10px] leading-none">
                            {formatResizeTime(activeResize.previewEndMs)}
                          </div>
                        )}
                        {canResize && (
                          <div
                            className="absolute inset-x-0 bottom-0 z-[3] h-2 cursor-ns-resize rounded-b-md opacity-0 transition-opacity group-hover/time-resize:opacity-100"
                            onPointerDown={(e) =>
                              handleTimeResizePointerDown(
                                e,
                                block.event,
                                selectedDay,
                                HOUR_HEIGHT_DAY,
                              )
                            }
                            aria-label="Resize event duration"
                            role="separator"
                          >
                            <div className="bg-primary/80 mx-auto mt-[3px] h-0.5 w-8 rounded-full" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {children ? (
          <>
            <div
              ref={splitDividerRef}
              role="separator"
              aria-orientation="horizontal"
              onPointerDown={handleSplitPointerDown}
              className="group relative flex h-2 flex-shrink-0 cursor-row-resize items-center justify-center"
            >
              <div
                className={`resize-divider-line-blue-horizontal-full pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-opacity ${
                  isResizingSplit ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            </div>
            <div
              style={{ height: bottomHeightPx }}
              className="flex min-h-0 shrink-0 flex-col overflow-hidden"
            >
              {children({ selectedDay, selectedEvents })}
            </div>
          </>
        ) : null}
      </div>
    </DndContext>
  )
}
