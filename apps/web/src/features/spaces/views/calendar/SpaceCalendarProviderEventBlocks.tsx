import { ExternalLink, Video } from 'lucide-react'
import type { CalendarEvent } from '@/components/calendar'
import type { CalendarRenderContext } from '@/components/calendar/CalendarBoard'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { cn } from '@/lib/utils/cn'
import { OptionDot } from '../../components/OptionBadge'

const PROVIDER_BG_BY_COLOR: Record<string, string> = {
  amber: 'bg-amber-500/20',
  blue: 'bg-blue-500/20',
  emerald: 'bg-emerald-500/20',
  green: 'bg-green-500/20',
  indigo: 'bg-indigo-500/20',
  orange: 'bg-orange-500/20',
  purple: 'bg-purple-500/20',
  red: 'bg-red-500/20',
  rose: 'bg-rose-500/20',
  sky: 'bg-sky-500/20',
  slate: 'bg-slate-500/25',
  yellow: 'bg-yellow-500/20',
}

const PROVIDER_BORDER_BY_COLOR: Record<string, string> = {
  amber: 'border-l-amber-500',
  blue: 'border-l-blue-500',
  emerald: 'border-l-emerald-500',
  green: 'border-l-green-500',
  indigo: 'border-l-indigo-500',
  orange: 'border-l-orange-500',
  purple: 'border-l-purple-500',
  red: 'border-l-red-500',
  rose: 'border-l-rose-500',
  sky: 'border-l-sky-500',
  slate: 'border-l-slate-500',
  yellow: 'border-l-yellow-500',
}

const GOOGLE_CALENDAR_COLOR_BY_ID: Record<string, string> = {
  '1': 'indigo',
  '2': 'green',
  '3': 'purple',
  '4': 'rose',
  '5': 'yellow',
  '6': 'orange',
  '7': 'sky',
  '8': 'slate',
  '9': 'blue',
  '10': 'emerald',
  '11': 'red',
}

function providerBg(color: string): string {
  return PROVIDER_BG_BY_COLOR[color] ?? 'bg-muted-20'
}

function providerBorder(color: string): string {
  return PROVIDER_BORDER_BY_COLOR[color] ?? 'border-l-primary'
}

function rangeRoundedClass(role: CalendarRenderContext['role']): string {
  if (role === 'single') return 'rounded-md'
  if (role === 'start') return 'rounded-l-md rounded-r-none'
  if (role === 'end') return 'rounded-r-md rounded-l-none'
  return 'rounded-none'
}

function providerSourceLabel(sourceId: string): string {
  if (sourceId === 'google_calendar') return 'Google Calendar'
  if (sourceId === 'outlook') return 'Outlook'
  return 'Calendar'
}

function providerColor(row: CalendarAgendaEvent): string {
  if (row.source === 'outlook') return 'blue'
  if (row.color_id) return GOOGLE_CALENDAR_COLOR_BY_ID[row.color_id] ?? 'amber'
  return 'amber'
}

function formatProviderTimeRange(row: CalendarAgendaEvent): string {
  if (row.all_day) return 'All day'
  const start = new Date(row.start)
  const end = new Date(row.end)
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return start.toLocaleTimeString('en-US', opts)
  }
  return `${start.toLocaleTimeString('en-US', opts)} - ${end.toLocaleTimeString('en-US', opts)}`
}

export function ProviderMonthBar({
  event,
  ctx,
}: {
  event: CalendarEvent<CalendarAgendaEvent>
  ctx: CalendarRenderContext
}) {
  const row = event.raw
  const color = providerColor(row)
  const showLabel = ctx.role === 'single' || ctx.role === 'start'
  const title = `${event.title} · ${formatProviderTimeRange(row)} · ${providerSourceLabel(event.sourceId)}`

  return (
    <div
      className={cn(
        'flex h-full min-w-0 items-center gap-1 overflow-hidden border-l-4 px-1.5',
        providerBg(color),
        providerBorder(color),
        rangeRoundedClass(ctx.role),
      )}
      title={title}
    >
      {showLabel ? (
        <>
          <span className="flex shrink-0 items-center justify-center">
            <OptionDot color={color} size="sm" />
          </span>
          {!ctx.compact ? (
            <span className="typo-caption text-foreground min-w-0 flex-1 truncate leading-none">
              {event.title}
            </span>
          ) : null}
          {!ctx.compact && row.video_url ? (
            <Video className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
          ) : null}
          {!ctx.compact && row.html_link ? (
            <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function ProviderHourBlock({
  event,
  ctx,
}: {
  event: CalendarEvent<CalendarAgendaEvent>
  ctx: CalendarRenderContext
}) {
  const row = event.raw
  const color = providerColor(row)
  const showContent = ctx.role === 'single' || ctx.role === 'start'

  return (
    <div
      className={cn(
        'border-border flex h-full min-w-0 flex-col gap-0.5 overflow-hidden border border-l-4 px-1.5 py-1',
        providerBg(color),
        providerBorder(color),
        rangeRoundedClass(ctx.role),
      )}
      title={`${event.title} · ${formatProviderTimeRange(row)} · ${providerSourceLabel(event.sourceId)}`}
    >
      {showContent ? (
        <>
          <div className="flex min-w-0 items-center gap-1">
            <span className="typo-caption text-foreground min-w-0 flex-1 truncate leading-tight">
              {event.title}
            </span>
            {row.video_url ? (
              <Video className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
            ) : null}
            {row.html_link ? (
              <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
            ) : null}
          </div>
          <div className="typo-caption text-muted-foreground flex min-w-0 items-center gap-1 leading-none">
            <span className="shrink-0">{formatProviderTimeRange(row)}</span>
            {!ctx.compact ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{providerSourceLabel(event.sourceId)}</span>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function ProviderHoverRow({
  event,
  timeLabel,
}: {
  event: CalendarEvent<CalendarAgendaEvent>
  timeLabel: string
}) {
  const row = event.raw
  const color = providerColor(row)

  return (
    <div className="hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex min-w-0 items-start gap-2 rounded-md">
      <div className="flex shrink-0 items-center pt-[3px]">
        <OptionDot color={color} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="body-3 text-foreground truncate">{event.title}</div>
        <div className="typo-caption text-muted-foreground">
          {timeLabel} · {providerSourceLabel(event.sourceId)}
        </div>
        {row.video_url || row.html_link ? (
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {row.video_url ? (
              <a
                href={row.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-caption text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Video className="h-3 w-3" />
                Meeting
              </a>
            ) : null}
            {row.html_link ? (
              <a
                href={row.html_link}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-caption text-primary inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Event
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
