'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  HelpCircle,
  MapPin,
  MessageSquare,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { MeetingTranscriptPanel } from '@/features/home/components/MeetingTranscriptPanel'
import { HOME_TOAST_SUCCESS } from '@/features/home/config/home-toast-errors.config'
import {
  attendeeStatusLabel,
  formatMeetingTimeRange,
  isHttpUrl,
  isYoursFollowUp,
  joinLinkHost,
  prepOpenLabel,
  recordingLinkLabel,
  resolveMeetingJoinUrl,
} from '@/features/home/lib/home-meeting-detail'
import type {
  CalendarAgendaEvent,
  CalendarAgendaRelatedFollowUp,
} from '@/lib/services/calendar-api'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import { createClient } from '@/lib/supabase/client'

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

function AttendeeStatusIcon({
  status,
}: {
  status: CalendarAgendaEvent['attendees'][number]['status']
}) {
  if (status === 'accepted') {
    return <Check className="text-success h-3.5 w-3.5 shrink-0" aria-hidden />
  }
  if (status === 'declined') {
    return <XCircle className="text-destructive h-3.5 w-3.5 shrink-0" aria-hidden />
  }
  return <HelpCircle className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
}

function copyJoinLink(url: string) {
  void navigator.clipboard.writeText(url).then(() => {
    toast.success(HOME_TOAST_SUCCESS.LINK_COPIED.userMessage)
  })
}

export function HomeMeetingDetailHost({
  event,
  onClose,
  onOpenPrep,
  onTalkWithPixel,
}: {
  event: CalendarAgendaEvent
  onClose: () => void
  onOpenPrep: () => void
  onTalkWithPixel: () => void
}) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [fullDetails, setFullDetails] = useState(false)
  const location = event.location?.trim() || null
  const description = event.description?.trim() || null
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
  const joinUrl = resolveMeetingJoinUrl(event)
  const locationIsJoin = Boolean(joinUrl && location && location.trim() === joinUrl)
  const summary = related?.summary?.trim() || null
  const showTranscript = Boolean(
    related?.has_transcript && related.space_id && related.call_item_id,
  )
  const calendarsLabel = event.account_label?.trim() || null

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
      if (isYoursFollowUp(fu, currentUserId)) yoursList.push(fu)
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

  const hasExtraDetails = Boolean(
    description ||
    calendarsLabel ||
    summary ||
    showTranscript ||
    relatedHref ||
    recordingUrl ||
    yours.length > 0 ||
    others.length > 0 ||
    related ||
    event.html_link,
  )

  return (
    <div className="z-modal-backdrop bg-modal-overlay fixed inset-0 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="border-border bg-card z-modal-content flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-xl"
      >
        <div className="bg-primary h-1.5 w-full shrink-0" aria-hidden />

        <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="body-2 text-foreground font-semibold">{event.title}</p>
            <p className="typo-caption text-muted-foreground mt-1">
              {formatMeetingTimeRange(event)}
            </p>
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
          {joinUrl ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-stretch gap-2">
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-glass-green body-3 inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-semibold"
                >
                  <Video className="h-4 w-4" aria-hidden />
                  {event.video_label
                    ? `Join ${event.video_label}`
                    : `Join · ${joinLinkHost(joinUrl)}`}
                </a>
                <div className="border-border bg-secondary flex min-w-0 flex-1 items-center gap-1 rounded-lg border px-2.5 py-2">
                  <p className="typo-caption text-muted-foreground min-w-0 flex-1 truncate">
                    {joinUrl}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyJoinLink(joinUrl)}
                    className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle shrink-0 rounded-md p-1"
                    aria-label="Copy join link"
                    title="Copy join link"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {event.attendees.length > 0 ? (
            <section>
              <SectionLabel>Guests · {event.attendees.length}</SectionLabel>
              <ul className="gap-spacing-1 flex flex-col">
                {event.attendees.map((a) => {
                  const status = attendeeStatusLabel(a.status)
                  const name = a.name?.trim() || null
                  return (
                    <li key={`${a.email}-${name ?? ''}`} className="flex items-start gap-2">
                      <AttendeeStatusIcon status={a.status} />
                      <div className="min-w-0 flex-1">
                        <p className="body-3 text-foreground truncate">{name || a.email}</p>
                        {name ? (
                          <p className="typo-caption text-muted-foreground truncate">{a.email}</p>
                        ) : null}
                      </div>
                      {status ? (
                        <span className="typo-caption text-muted-foreground shrink-0">
                          {status}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {location && !locationIsJoin ? (
            <section>
              <SectionLabel>Where</SectionLabel>
              <p className="body-3 text-foreground flex items-start gap-2 break-all">
                <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {location}
              </p>
            </section>
          ) : null}

          {fullDetails ? (
            <>
              {calendarsLabel ? (
                <section>
                  <SectionLabel>On calendars</SectionLabel>
                  <p className="body-3 text-foreground">{calendarsLabel}</p>
                </section>
              ) : null}

              {description ? (
                <section>
                  <SectionLabel>Details</SectionLabel>
                  <p className="body-3 text-foreground whitespace-pre-wrap break-words">
                    {description}
                  </p>
                </section>
              ) : null}

              {summary ? (
                <section>
                  <SectionLabel>Summary</SectionLabel>
                  <p className="body-3 text-foreground whitespace-pre-wrap">{summary}</p>
                </section>
              ) : null}

              {showTranscript && related ? (
                <MeetingTranscriptPanel
                  spaceId={related.space_id}
                  callItemId={related.call_item_id}
                />
              ) : null}

              {relatedHref || recordingUrl ? (
                <section className="flex flex-col gap-2">
                  <SectionLabel>Meeting record</SectionLabel>
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

              {event.html_link ? (
                <a
                  href={event.html_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="typo-caption text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  Open in calendar
                </a>
              ) : null}
            </>
          ) : null}

          {hasExtraDetails ? (
            <button
              type="button"
              onClick={() => setFullDetails((v) => !v)}
              className="body-4 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start font-medium"
            >
              {fullDetails ? 'Show less' : 'More details'}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${fullDetails ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        <div className="border-border flex flex-col gap-2 border-t px-5 py-4">
          {event.prep ? (
            <button
              type="button"
              onClick={onOpenPrep}
              className="button-glass-secondary body-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-semibold"
            >
              {prepOpenLabel(event.prep.status)}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onTalkWithPixel}
            className="button-glass-purple body-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-semibold"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Prepare with Pixel
          </button>
          <p className="typo-caption text-muted-foreground text-center">
            Pixel asks whether to prep beforehand or guide you live on the call.
          </p>
        </div>
      </div>
    </div>
  )
}
