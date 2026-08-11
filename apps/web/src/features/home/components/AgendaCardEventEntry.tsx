'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Minus, Video } from 'lucide-react'
import { AgendaMinimizedEventEntry } from '@/features/home/components/AgendaMinimizedEventEntry'
import type { CalendarAgendaEvent, CalendarAttendee } from '@/lib/services/calendar-api'

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
const DEFAULT_EVENT_COLOR = { border: '#F6BF26', bg: 'rgba(246,191,38,0.18)', text: '#FFF59D' }

function eventColor(ev: CalendarAgendaEvent): (typeof GCAL_EVENT_COLORS)[string] {
  if (ev.color_id) {
    const c = GCAL_EVENT_COLORS[ev.color_id]
    if (c) return c
  }
  return DEFAULT_EVENT_COLOR
}
function formatTimeRange(ev: CalendarAgendaEvent): string {
  const s = new Date(ev.start)
  const e = new Date(ev.end)
  if (ev.all_day) return 'All day'
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${s.toLocaleTimeString('en-US', opts)} – ${e.toLocaleTimeString('en-US', opts)}`
}
function minutesBetween(a: number, b: number): number {
  return Math.max(0, Math.round((b - a) / 60000))
}

function formatCountdown(now: number, ev: CalendarAgendaEvent): string | null {
  const s = new Date(ev.start).getTime()
  const e = new Date(ev.end).getTime()
  if (s <= now && e >= now) {
    const left = minutesBetween(now, e)
    if (left > 60) return `${Math.floor(left / 60)}h ${left % 60}m left`
    return `${left}m left`
  }
  if (s > now) {
    const until = minutesBetween(now, s)
    if (until > 60) return `in ${Math.floor(until / 60)}h ${until % 60}m`
    return `in ${until}m`
  }
  return null
}

function attendeeRsvpSummary(attendees: CalendarAttendee[]): string | null {
  if (attendees.length === 0) return null
  const accepted = attendees.filter((a) => a.status === 'accepted').length
  const declined = attendees.filter((a) => a.status === 'declined').length
  const parts: string[] = []
  if (accepted > 0) parts.push(`${accepted} Yes`)
  if (declined > 0) parts.push(`${declined} No`)
  const pending = attendees.length - accepted - declined
  if (pending > 0) parts.push(`${pending} Pending`)
  return parts.join(' · ')
}
function attendeeLabel(a: CalendarAttendee): string {
  const name = a.name?.trim()
  if (name) return name
  return a.email
}

function attendeeInitials(a: CalendarAttendee): string {
  if (a.name) {
    const parts = a.name.trim().split(/\s+/)
    return parts.length >= 2
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
      : (parts[0]?.[0] ?? '?').toUpperCase()
  }
  return (a.email[0] ?? '?').toUpperCase()
}
const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-success/20 text-success',
  'bg-destructive/20 text-destructive',
  'bg-warning/20 text-warning',
  'bg-secondary text-foreground',
  'bg-muted text-muted-foreground',
]

function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]!
}

function videoButtonLabel(ev: CalendarAgendaEvent): string {
  if (ev.video_label) return `Join ${ev.video_label} meeting`
  return 'Join meeting'
}

const ENTRY_TRANSITION = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const

function AgendaAttendeesControl({ attendees }: { attendees: CalendarAttendee[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const summary = attendeeRsvpSummary(attendees)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative mt-2.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="hover:bg-hover-subtle flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors"
        aria-expanded={open}
        aria-label="Show attendees"
        title={attendees.map(attendeeLabel).join(', ')}
      >
        <div className="flex -space-x-1.5">
          {attendees.slice(0, 5).map((a, i) => (
            <div
              key={a.email}
              className={`${avatarColor(i)} border-background flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-bold`}
            >
              {attendeeInitials(a)}
            </div>
          ))}
          {attendees.length > 5 ? (
            <div className="border-background bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-bold">
              +{attendees.length - 5}
            </div>
          ) : null}
        </div>
        {summary ? <span className="typo-caption text-muted-foreground">{summary}</span> : null}
      </button>
      {open ? (
        <div
          className="dropdown-menu-solid z-dropdown absolute left-0 top-full mt-1 min-w-[220px] max-w-[280px] py-1"
          role="listbox"
          aria-label="Attendees"
        >
          <ul className="max-h-48 overflow-y-auto px-1">
            {attendees.map((a) => (
              <li key={a.email} className="px-spacing-2 py-spacing-1">
                <p className="body-3 text-foreground truncate">{attendeeLabel(a)}</p>
                {a.name?.trim() ? (
                  <p className="typo-caption text-muted-foreground truncate">{a.email}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function AgendaEventEntry({
  ev,
  isExpanded,
  isNextHero = false,
  isMinimized = false,
  onSelect,
  onOpenMeeting,
  onMinimizedChange,
  nowTick,
  showAccountLabel,
}: {
  ev: CalendarAgendaEvent
  isExpanded: boolean
  isNextHero?: boolean
  isMinimized?: boolean
  onSelect: () => void
  onOpenMeeting?: () => void
  onMinimizedChange?: (minimized: boolean) => void
  nowTick: number
  showAccountLabel: boolean
}) {
  const color = eventColor(ev)
  const accountLabel = showAccountLabel && ev.account_label ? String(ev.account_label).trim() : ''

  const minimizeButton = onMinimizedChange ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onMinimizedChange(true)
      }}
      className="btn-icon-bare"
      aria-label="Minimize meeting"
      title="Minimize meeting"
    >
      <Minus className="icon-sm" aria-hidden />
    </button>
  ) : null

  const openMeeting = () => {
    onOpenMeeting?.()
  }

  if (isMinimized) {
    return (
      <AgendaMinimizedEventEntry
        ev={ev}
        accountLabel={accountLabel}
        eventColor={color.border}
        onRestore={
          onMinimizedChange
            ? () => {
                onMinimizedChange(false)
              }
            : undefined
        }
      />
    )
  }

  return (
    <motion.div
      layout
      transition={ENTRY_TRANSITION}
      onClick={() => {
        onSelect()
        openMeeting()
      }}
      className={
        isNextHero
          ? 'agenda-next-card cursor-pointer'
          : isExpanded
            ? 'card-glass cursor-pointer rounded-xl border-l-[4px] p-4'
            : 'hover:bg-hover-subtle cursor-pointer rounded-lg px-2 py-2 transition-colors'
      }
      style={isExpanded && !isNextHero ? { borderLeftColor: color.border } : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
          openMeeting()
        }
      }}
    >
      {isExpanded ? (
        <motion.div layout="position" transition={ENTRY_TRANSITION}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="body-2 text-foreground font-semibold">{ev.title}</p>
              {accountLabel ? (
                <p className="typo-caption text-muted-foreground mt-0.5 truncate">{accountLabel}</p>
              ) : null}
            </div>
            {minimizeButton}
          </div>
          {ev.source === 'fathom' ? (
            <span className="badge-glass badge-glass-cyan typo-caption mt-1 inline-flex">
              Fathom
            </span>
          ) : null}
          <p className="typo-caption text-muted-foreground mt-1">
            {formatCountdown(nowTick, ev) ? `${formatCountdown(nowTick, ev)} · ` : ''}
            {formatTimeRange(ev)}
          </p>
          {ev.location?.trim() ? (
            <p className="typo-caption text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{ev.location.trim()}</span>
            </p>
          ) : null}

          {ev.attendees.length > 0 ? <AgendaAttendeesControl attendees={ev.attendees} /> : null}

          <div className="mt-3 flex flex-col gap-2">
            {onOpenMeeting ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenMeeting()
                }}
                className="button-glass-secondary body-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-semibold"
              >
                {ev.source === 'fathom' ? 'Open recording' : 'Open meeting'}
              </button>
            ) : null}
            {ev.video_url ? (
              <a
                href={ev.video_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="button-glass-green body-3 mt-0 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-semibold"
              >
                <Video className="h-4 w-4" />
                {ev.source === 'fathom' ? 'Watch recording' : videoButtonLabel(ev)}
              </a>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <motion.div
          layout="position"
          transition={ENTRY_TRANSITION}
          className="flex items-center gap-2"
        >
          <span
            className="h-6 w-1 shrink-0 rounded-full"
            style={{ background: color.border }}
            aria-hidden
          />
          <span className="typo-caption text-muted-foreground w-14 shrink-0">
            {ev.all_day
              ? 'All day'
              : new Date(ev.start).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </span>
          <div className="min-w-0 flex-1">
            <span className="body-3 text-foreground block truncate font-medium">{ev.title}</span>
            {accountLabel ? (
              <span className="typo-caption text-muted-foreground block truncate">
                {accountLabel}
              </span>
            ) : null}
          </div>
          {ev.source === 'fathom' ? (
            <span className="badge-glass badge-glass-cyan typo-caption shrink-0">Fathom</span>
          ) : null}
          {ev.prep ? (
            <span
              className={
                ev.prep.status === 'ready'
                  ? 'badge-glass badge-glass-green typo-caption shrink-0'
                  : ev.prep.status === 'failed'
                    ? 'badge-glass badge-glass-red typo-caption shrink-0'
                    : 'badge-glass badge-glass-muted typo-caption shrink-0'
              }
            >
              Prep
            </span>
          ) : null}
          {ev.prep?.agenda_doc_link ? (
            <a
              href={ev.prep.agenda_doc_link}
              target="_blank"
              rel="noopener noreferrer"
              className="badge-glass badge-glass-cyan typo-caption shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              Doc
            </a>
          ) : null}
          {ev.video_url ? <Video className="text-muted-foreground h-3.5 w-3.5 shrink-0" /> : null}
          {minimizeButton}
        </motion.div>
      )}
    </motion.div>
  )
}
