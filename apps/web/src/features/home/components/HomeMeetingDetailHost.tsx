'use client'

import { MapPin, MessageSquare, Video, X } from 'lucide-react'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { askAboutMeetingInChat } from '@/features/home/lib/ask-meeting-in-chat'

function formatTimeRange(ev: CalendarAgendaEvent): string {
  const s = new Date(ev.start)
  const e = new Date(ev.end)
  if (ev.all_day) return 'All day'
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return `${s.toLocaleString('en-US', opts)} – ${e.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function prepLabel(status: NonNullable<CalendarAgendaEvent['prep']>['status']): string {
  if (status === 'ready') return 'Open prep'
  if (status === 'failed') return 'Prep failed — retry'
  return 'Prep generating…'
}

export function HomeMeetingDetailHost({
  event,
  onClose,
  onOpenPrep,
  onStartPrep,
  onOpenSpaceItem,
  prepBusy,
}: {
  event: CalendarAgendaEvent
  onClose: () => void
  onOpenPrep: () => void
  onStartPrep: () => void
  onOpenSpaceItem: (spaceId: string, itemId: string, title: string) => void
  prepBusy?: boolean
}) {
  const location = event.location?.trim() || null
  const related = event.related ?? null

  return (
    <div className="z-modal-backdrop bg-modal-overlay fixed inset-0 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="border-border bg-background z-modal-content flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-xl"
      >
        <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="body-2 text-foreground font-semibold">{event.title}</p>
            <p className="typo-caption text-muted-foreground mt-1">{formatTimeRange(event)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
            aria-label="Close meeting detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {event.attendees.length > 0 ? (
            <section>
              <p className="typo-caption text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                Who
              </p>
              <ul className="space-y-1">
                {event.attendees.map((a) => (
                  <li key={a.email} className="body-3 text-foreground">
                    {a.name?.trim() || a.email}
                    {a.name?.trim() ? (
                      <span className="text-muted-foreground"> · {a.email}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {location ? (
            <section>
              <p className="typo-caption text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                Where
              </p>
              <p className="body-3 text-foreground flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {location}
              </p>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
              Prep
            </p>
            {event.prep ? (
              <button
                type="button"
                onClick={onOpenPrep}
                className="border-border bg-secondary text-foreground hover:bg-hover-subtle body-3 rounded-lg border px-3 py-2 text-left font-medium"
              >
                {prepLabel(event.prep.status)}
                {event.prep.title ? (
                  <span className="text-muted-foreground mt-0.5 block font-normal">
                    {event.prep.title}
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartPrep}
                disabled={prepBusy}
                className="button-glass-secondary body-3 rounded-lg px-3 py-2 font-medium disabled:opacity-50"
              >
                {prepBusy ? 'Starting prep…' : 'Start pre-call prep'}
              </button>
            )}
          </section>

          {related ? (
            <section className="flex flex-col gap-2">
              <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
                Call recording & tasks
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenSpaceItem(related.space_id, related.call_item_id, related.title)
                }
                className="border-border hover:bg-hover-subtle body-3 rounded-lg border px-3 py-2 text-left"
              >
                <span className="text-foreground font-medium">{related.title}</span>
                {related.recording_url ? (
                  <span className="text-muted-foreground mt-0.5 block truncate text-[12px]">
                    Recording linked
                  </span>
                ) : null}
              </button>
              {related.follow_ups.length > 0 ? (
                <ul className="space-y-1">
                  {related.follow_ups.slice(0, 8).map((fu) => (
                    <li key={fu.id}>
                      <button
                        type="button"
                        onClick={() => onOpenSpaceItem(related.space_id, fu.id, fu.title)}
                        className="body-3 text-foreground hover:bg-hover-subtle w-full rounded-md px-2 py-1.5 text-left"
                      >
                        {fu.title}
                        {fu.status ? (
                          <span className="text-muted-foreground"> · {fu.status}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="typo-caption text-muted-foreground">No follow-up tasks yet.</p>
              )}
            </section>
          ) : null}
        </div>

        <div className="border-border flex flex-col gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={() => askAboutMeetingInChat(event)}
            className="button-glass-primary body-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-semibold"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Talk with Vibey about this meeting
          </button>
          {event.video_url ? (
            <a
              href={event.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border body-3 text-foreground hover:bg-hover-subtle inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium"
            >
              <Video className="h-4 w-4" aria-hidden />
              {event.video_label ? `Join ${event.video_label}` : 'Join meeting'}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
