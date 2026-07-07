import type { ReactNode } from 'react'

export type CalendarScope = 'day' | 'week' | 'month'
export type CalendarTimeFormat = '12h' | '24h'

export interface CalendarEvent<T = unknown> {
  id: string
  sourceId: string
  start: string
  end?: string
  allDay?: boolean
  title: string
  subtitle?: string
  badge?: ReactNode
  thumbnail?: ReactNode
  draggable?: boolean
  raw: T
}

export type CalendarDropTarget =
  | { type: 'month-day'; day: string }
  | { type: 'week-hour'; day: string; hour: number }
  | { type: 'day-hour'; day: string; hour: number }
  | { type: 'custom'; id: string }

export interface CalendarDragPayload<T = unknown> {
  event: CalendarEvent<T>
  target: CalendarDropTarget
}
