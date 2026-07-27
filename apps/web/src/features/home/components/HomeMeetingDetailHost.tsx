'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ExternalLink, MapPin, MessageSquare, Video, X } from 'lucide-react'
import { askAboutMeetingInChat } from '@/features/home/lib/ask-meeting-in-chat'
import { extractCallTranscriptText } from '@/features/home/lib/extract-call-transcript'
import type {
  CalendarAgendaEvent,
  CalendarAgendaRelatedFollowUp,
} from '@/lib/services/calendar-api'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import { fetchSpaceItem } from '@/lib/spaces/spaces-api'
import { createClient } from '@/lib/supabase/client'

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

function isHttpUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function recordingLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('fathom')) return 'Open Fathom recording'
    return `Open recording (${host})`
  } catch {
    return 'Open recording'
  }
}

function isYours(followUp: CalendarAgendaRelatedFollowUp, currentUserId: string | null): boolean {
  if (!currentUserId) return false
  return followUp.assignee_type === 'human' && followUp.assignee_id === currentUserId
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="typo-caption text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
      {children}
    </p>
  )
}

function TaskRow({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:bg-hover-subtle body-3 text-foreground w-full rounded-lg border px-3 py-2 text-left"
    >
      {title}
    </button>
  )
}

function MeetingTranscriptPanel({ spaceId, callItemId }: { spaceId: string; callItemId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)

  useEffect(() => {
    if (!open || transcript !== null || error !== null) return
    let cancelled = false
    setLoading(true)
    void fetchSpaceItem(spaceId, callItemId)
      .then((item) => {
        if (cancelled) return
        const text = extractCallTranscriptText({
          description: item.description,
          custom_data: (item.custom_data as Record<string, unknown> | null) ?? null,
        })
        setTranscript(text)
        if (!text) setError('No transcript saved on this call yet.')
      })
      .catch(() => {
        if (!cancelled) setError('Couldn’t load the transcript.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [callItemId, error, open, spaceId, transcript])

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border-border hover:bg-hover-subtle body-3 text-foreground inline-flex w-full items-center justify-between rounded-lg border px-3 py-2 font-medium"
        aria-expanded={open}
      >
        <span>Full transcript</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-border bg-secondary max-h-64 overflow-y-auto rounded-lg border px-3 py-2">
          {loading ? (
            <p className="typo-caption text-muted-foreground">Loading transcript…</p>
          ) : null}
          {error ? <p className="typo-caption text-muted-foreground">{error}</p> : null}
          {transcript ? (
            <p className="body-3 text-foreground whitespace-pre-wrap">{transcript}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export function HomeMeetingDetailHost({
  event,
  onClose,
  onOpenPrep,
  onStartPrep,
  prepBusy,
}: {
  event: CalendarAgendaEvent
  onClose: () => void
  onOpenPrep: () => void
  onStartPrep: () => void
  prepBusy?: boolean
}) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const location = event.location?.trim() || null
  const related = event.related ?? null
  const relatedHref =
    related?.space_id && related.call_item_id
      ? buildSpaceItemHref(related.space_id, related.call_item_id)
      : null
  const recordingUrl = isHttpUrl(related?.recording_url)
    ? related.recording_url.trim()
    : isHttpUrl(event.video_url) && event.source === 'fathom'
      ? event.video_url.trim()
      : null
  const joinUrl =
    isHttpUrl(event.video_url) && event.video_url.trim() !== recordingUrl
      ? event.video_url.trim()
      : null
  const summary = related?.summary?.trim() || null
  const showMeetingLinks = Boolean(relatedHref || recordingUrl || joinUrl)
  const showTranscript = Boolean(
    related?.has_transcript && related.space_id && related.call_item_id,
  )

  useEffect(() => {
    let cancelled = false
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setCurrentUserId(data.user?.id ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { yours, others } = useMemo(() => {
    const followUps = related?.follow_ups ?? []
    const yoursList: CalendarAgendaRelatedFollowUp[] = []
    const othersList: CalendarAgendaRelatedFollowUp[] = []
    for (const fu of followUps) {
      if (isYours(fu, currentUserId)) yoursList.push(fu)
      else othersList.push(fu)
    }
    return { yours: yoursList, others: othersList }
  }, [currentUserId, related?.follow_ups])

  const openCallTask = () => {
    if (!relatedHref) return
    onClose()
    router.push(relatedHref)
  }

  const openFollowUp = (itemId: string) => {
    if (!related?.space_id || !itemId) return
    onClose()
    router.push(buildSpaceItemHref(related.space_id, itemId))
  }

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

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          {summary ? (
            <section>
              <SectionLabel>Summary</SectionLabel>
              <p className="body-3 text-foreground whitespace-pre-wrap">{summary}</p>
            </section>
          ) : null}

          {showTranscript && related ? (
            <MeetingTranscriptPanel spaceId={related.space_id} callItemId={related.call_item_id} />
          ) : null}

          {showMeetingLinks ? (
            <section className="flex flex-col gap-2">
              <SectionLabel>Meeting</SectionLabel>
              {relatedHref ? (
                <button
                  type="button"
                  onClick={openCallTask}
                  className="border-border hover:bg-hover-subtle body-3 rounded-lg border px-3 py-2 text-left"
                >
                  <span className="text-foreground font-medium">
                    {related?.title?.trim() || 'Open call record'}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block font-normal">
                    Open the meeting task in Spaces
                  </span>
                </button>
              ) : null}
              {recordingUrl ? (
                <a
                  href={recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border hover:bg-hover-subtle body-3 text-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {recordingLinkLabel(recordingUrl)}
                </a>
              ) : null}
              {joinUrl ? (
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border hover:bg-hover-subtle body-3 text-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-medium"
                >
                  <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {event.video_label ? `Join ${event.video_label}` : 'Join meeting'}
                </a>
              ) : null}
            </section>
          ) : null}

          {yours.length > 0 ? (
            <section className="flex flex-col gap-2">
              <SectionLabel>Your action items</SectionLabel>
              {yours.slice(0, 8).map((fu) => (
                <TaskRow key={fu.id} title={fu.title} onClick={() => openFollowUp(fu.id)} />
              ))}
            </section>
          ) : null}

          {others.length > 0 ? (
            <section className="flex flex-col gap-2">
              <SectionLabel>
                {yours.length > 0 ? 'Other action items' : 'Action items'}
              </SectionLabel>
              {others.slice(0, 8).map((fu) => (
                <TaskRow key={fu.id} title={fu.title} onClick={() => openFollowUp(fu.id)} />
              ))}
            </section>
          ) : null}

          {related && yours.length === 0 && others.length === 0 ? (
            <section>
              <SectionLabel>Action items</SectionLabel>
              <p className="typo-caption text-muted-foreground">No follow-up tasks yet.</p>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <SectionLabel>Prep</SectionLabel>
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

          {event.attendees.length > 0 ? (
            <section>
              <SectionLabel>Who</SectionLabel>
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
              <SectionLabel>Where</SectionLabel>
              <p className="body-3 text-foreground flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {location}
              </p>
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
        </div>
      </div>
    </div>
  )
}
