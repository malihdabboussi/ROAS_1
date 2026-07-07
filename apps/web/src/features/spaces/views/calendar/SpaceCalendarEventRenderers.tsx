import type { CalendarEvent } from '@/components/calendar'
import type { CalendarRenderContext } from '@/components/calendar/CalendarBoard'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { cn } from '@/lib/utils/cn'
import { OptionDot } from '../../components/OptionBadge'
import { readFieldValue } from '../../components/space-item-values'
import type { SpaceItem } from '../../types'
import type { FieldDef } from '../../types/space-schema'
import {
  ProviderHourBlock,
  ProviderHoverRow,
  ProviderMonthBar,
} from './SpaceCalendarProviderEventBlocks'

function validDateValue(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : value
}

export function spaceItemToEvent(
  item: SpaceItem,
  dateField: string,
): CalendarEvent<SpaceItem> | null {
  const startDateValue = validDateValue(item.start_date)
  const dueDateValue = validDateValue(item.due_date)
  const dateFieldValue = validDateValue(readFieldValue(item, dateField))

  let start: string | null = null
  let end: string | undefined
  if (startDateValue && dueDateValue) {
    start = startDateValue
    end = dueDateValue
  } else {
    start = dateFieldValue
  }
  if (!start) return null

  const timeLabel = new Date(start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const subtitle = item.priority != null ? `Priority: ${item.priority}` : timeLabel
  return {
    id: `space-item:${item.id}`,
    sourceId: 'space_items',
    start,
    end,
    title: item.title || 'Untitled task',
    subtitle,
    draggable: true,
    raw: item,
  }
}
function providerEventSubtitle(row: CalendarAgendaEvent): string {
  if (row.source === 'google_calendar') return row.video_label ?? 'Google Calendar'
  return row.video_label ?? 'Outlook'
}
export function providerEventToEvent(row: CalendarAgendaEvent): CalendarEvent<CalendarAgendaEvent> {
  return {
    id: `${row.source}:${row.id}`,
    sourceId: row.source,
    start: row.start,
    end: row.end,
    allDay: row.all_day,
    title: row.title || 'Untitled event',
    subtitle: providerEventSubtitle(row),
    draggable: !row.all_day,
    raw: row,
  }
}
function resolveStatusOption(item: SpaceItem, statusField: FieldDef | undefined) {
  const statusValue = readFieldValue(item, 'status')
  return statusField?.options?.find((o) => o.id === statusValue) ?? null
}
const RANGE_BAR_BG_BY_STATUS_COLOR: Record<string, string> = {
  cyan: 'bg-cyan-500/20',
  amber: 'bg-amber-500/20',
  violet: 'bg-violet-500/20',
  emerald: 'bg-emerald-500/20',
  slate: 'bg-slate-500/25',
  blue: 'bg-blue-500/20',
  orange: 'bg-orange-500/20',
  red: 'bg-red-500/20',
  pink: 'bg-pink-500/20',
  rose: 'bg-rose-500/20',
  fuchsia: 'bg-fuchsia-500/20',
  purple: 'bg-purple-500/20',
  indigo: 'bg-indigo-500/20',
  sky: 'bg-sky-500/20',
  teal: 'bg-teal-500/20',
  green: 'bg-green-500/20',
  lime: 'bg-lime-500/20',
  yellow: 'bg-yellow-500/20',
}
function rangeBarBg(color?: string): string {
  return RANGE_BAR_BG_BY_STATUS_COLOR[color ?? ''] ?? 'bg-muted-20'
}
function rangeRoundedClass(role: CalendarRenderContext['role']): string {
  if (role === 'single') return 'rounded-md'
  if (role === 'start') return 'rounded-l-md rounded-r-none'
  if (role === 'end') return 'rounded-r-md rounded-l-none'
  return 'rounded-none'
}

function TaskMonthBar({
  item,
  title,
  ctx,
  statusField,
}: {
  item: SpaceItem
  title: string
  ctx: CalendarRenderContext
  statusField: FieldDef | undefined
}) {
  const statusOption = resolveStatusOption(item, statusField)
  const showLabel = ctx.role === 'single' || ctx.role === 'start'
  const tip = statusOption ? `${title} · ${statusOption.label}` : title

  return (
    <div
      className={cn(
        'flex min-w-0 items-stretch gap-1.5 overflow-hidden px-1.5',
        rangeBarBg(statusOption?.color),
        rangeRoundedClass(ctx.role),
      )}
      title={tip}
    >
      {showLabel ? (
        <>
          <span className="flex shrink-0 items-center justify-center">
            <OptionDot color={statusOption?.color} size="sm" />
          </span>
          <span className="typo-caption text-foreground flex min-h-0 min-w-0 flex-1 items-center truncate leading-none">
            {title}
          </span>
        </>
      ) : null}
    </div>
  )
}

export const SOCIAL_PLATFORM_LOGO_SRC: Record<string, string> = {
  instagram: '/Integrations/Instagram.png',
  linkedin: '/Integrations/LinkedIn.png',
}

export function isSameRescheduleDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function CalendarMonthEvent({
  event,
  ctx,
  statusField,
}: {
  event: CalendarEvent
  ctx: CalendarRenderContext
  statusField: FieldDef | undefined
}) {
  if (event.sourceId === 'space_items') {
    return (
      <TaskMonthBar
        item={event.raw as SpaceItem}
        title={event.title}
        ctx={ctx}
        statusField={statusField}
      />
    )
  }
  if (event.sourceId === 'google_calendar' || event.sourceId === 'outlook') {
    return <ProviderMonthBar event={event as CalendarEvent<CalendarAgendaEvent>} ctx={ctx} />
  }
  const label =
    ctx.compact || event.title.length <= 18 ? event.title : `${event.title.slice(0, 18)}...`
  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden" title={event.title}>
      {event.thumbnail ? (
        <div className="h-4 w-4 shrink-0 overflow-hidden rounded">{event.thumbnail}</div>
      ) : null}
      {!ctx.compact && (
        <span className="typo-caption text-foreground min-w-0 flex-1 truncate leading-none">
          {label}
        </span>
      )}
    </div>
  )
}

function TaskHourBlock({
  item,
  title,
  ctx,
  statusField,
}: {
  item: SpaceItem
  title: string
  ctx: CalendarRenderContext
  statusField: FieldDef | undefined
}) {
  const statusOption = resolveStatusOption(item, statusField)
  return (
    <div
      className={cn(
        'border-border flex h-full min-w-0 items-start gap-1.5 border px-1.5 py-1',
        rangeBarBg(statusOption?.color),
        rangeRoundedClass(ctx.role),
      )}
      title={statusOption ? `${title} · ${statusOption.label}` : title}
    >
      {ctx.role === 'start' || ctx.role === 'single' ? (
        <span className="mt-0.5 shrink-0">
          <OptionDot color={statusOption?.color} size="sm" />
        </span>
      ) : null}
      {(ctx.role === 'start' || ctx.role === 'single') && (
        <span className="typo-caption text-foreground min-w-0 flex-1 truncate leading-tight">
          {title}
        </span>
      )}
    </div>
  )
}

export function CalendarHourEvent({
  event,
  ctx,
  statusField,
}: {
  event: CalendarEvent
  ctx: CalendarRenderContext
  statusField: FieldDef | undefined
}) {
  if (event.sourceId === 'space_items') {
    return (
      <TaskHourBlock
        item={event.raw as SpaceItem}
        title={event.title}
        ctx={ctx}
        statusField={statusField}
      />
    )
  }
  if (event.sourceId === 'google_calendar' || event.sourceId === 'outlook') {
    return <ProviderHourBlock event={event as CalendarEvent<CalendarAgendaEvent>} ctx={ctx} />
  }
  return (
    <div
      className="flex h-full min-w-0 items-start gap-1.5 overflow-hidden px-1.5 py-1"
      title={event.title}
    >
      {event.thumbnail ? (
        <div className="mt-0.5 h-4 w-4 shrink-0 overflow-hidden rounded">{event.thumbnail}</div>
      ) : null}
      <span className="typo-caption text-foreground min-w-0 flex-1 truncate leading-tight">
        {event.title}
      </span>
    </div>
  )
}

function formatHoverTimeLabel(event: CalendarEvent): string {
  const raw = event.raw as Partial<CalendarAgendaEvent> | undefined
  if (raw?.all_day) return 'All day'
  const start = new Date(event.start)
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  if (!event.end) return formatTime(start)
  const end = new Date(event.end)
  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) return formatTime(start)
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function MonthDayHoverCardBody({
  events,
  statusField,
}: {
  events: CalendarEvent[]
  statusField: FieldDef | undefined
}) {
  return (
    <div className="gap-spacing-1 px-spacing-2 flex flex-col">
      {events.map((event) => {
        const timeLabel = formatHoverTimeLabel(event)
        if (event.sourceId === 'space_items') {
          const item = event.raw as SpaceItem
          const statusOption = resolveStatusOption(item, statusField)
          return (
            <div
              key={event.id}
              className="hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex min-w-0 items-start gap-2 rounded-md"
            >
              <div className="flex shrink-0 items-center pt-[3px]">
                <OptionDot color={statusOption?.color} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="body-3 text-foreground truncate">{event.title}</div>
                <div className="typo-caption text-muted-foreground">{timeLabel}</div>
              </div>
            </div>
          )
        }
        if (event.sourceId === 'google_calendar' || event.sourceId === 'outlook') {
          return (
            <ProviderHoverRow
              key={event.id}
              event={event as CalendarEvent<CalendarAgendaEvent>}
              timeLabel={timeLabel}
            />
          )
        }
        return (
          <div
            key={event.id}
            className="hover:bg-hover-subtle px-spacing-1 py-spacing-1 flex min-w-0 items-start gap-2 rounded-md"
          >
            {event.thumbnail ? (
              <div className="mt-0.5 h-5 w-5 shrink-0 overflow-hidden rounded">
                {event.thumbnail}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="body-3 text-foreground truncate">{event.title}</div>
              <div className="typo-caption text-muted-foreground">
                {timeLabel} · {event.subtitle}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
