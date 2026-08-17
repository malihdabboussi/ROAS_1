'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, ExternalLink, Radio } from 'lucide-react'
import { toast } from 'sonner'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import { displayFathomRecordingTitle } from '@/features/home/lib/display-fathom-recording-title'
import {
  linkMeetingRecording,
  type FathomRecordingCandidate,
  type MeetingRecording,
} from '@/features/home/services/meeting-workspace-api'
import { openDocumentInShell } from '@/lib/artifacts'
import { listFathomMeetings } from '@/lib/brain'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

function recordingCandidateId(meeting: FathomRecordingCandidate): string | null {
  const value = meeting.recording_id ?? meeting.id ?? meeting.call_id
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function formatRecordingWhen(meeting: FathomRecordingCandidate): string | null {
  const raw = meeting.recording_start_time ?? meeting.scheduled_start_time ?? meeting.created_at
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MeetingRecordingsSection({
  spaceId,
  meetingItemId,
  recordings,
  onLinked,
  isPostCall = true,
  attachmentCount = 0,
  children,
}: {
  spaceId: string
  meetingItemId: string
  recordings: MeetingRecording[]
  onLinked: () => void | Promise<void>
  /** Pre-call the empty state is expected, not a gap — soften the copy. */
  isPostCall?: boolean
  attachmentCount?: number
  children?: ReactNode
}) {
  const [picking, setPicking] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<FathomRecordingCandidate[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()

  const linkedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const recording of recordings) {
      const externalId = recording.external_recording_id?.trim()
      if (externalId) ids.add(externalId)
    }
    return ids
  }, [recordings])

  useEffect(() => {
    if (!picking) return
    let cancelled = false
    setLoadingCandidates(true)
    void listFathomMeetings()
      .then((response) => {
        if (cancelled) return
        setCandidates(response.items ?? [])
        setNextCursor(response.next_cursor)
      })
      .catch(() => {
        if (cancelled) return
        setCandidates([])
        toast.error(HOME_TOAST_ERRORS.MEETING_RECORDINGS_LOAD_FAILED.userMessage)
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false)
      })
    return () => {
      cancelled = true
    }
  }, [picking])

  const loadMore = async () => {
    if (!nextCursor || loadingCandidates) return
    setLoadingCandidates(true)
    try {
      const response = await listFathomMeetings(nextCursor)
      setCandidates((current) => [...current, ...(response.items ?? [])])
      setNextCursor(response.next_cursor)
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_RECORDINGS_LOAD_FAILED.userMessage)
    } finally {
      setLoadingCandidates(false)
    }
  }

  const linkCandidate = async (meeting: FathomRecordingCandidate) => {
    const candidateId = recordingCandidateId(meeting)
    if (!candidateId || linkingId) return
    setLinkingId(candidateId)
    try {
      await linkMeetingRecording(spaceId, meetingItemId, meeting)
      toast.success(HOME_TOAST_SUCCESS.MEETING_RECORDING_LINKED.userMessage)
      setPicking(false)
      await onLinked()
    } catch (error) {
      toast.error(
        sanitizeUserError(error, HOME_TOAST_ERRORS.MEETING_RECORDING_LINK_FAILED.userMessage),
      )
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <section className="gap-spacing-4 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">Recordings & attachments</h2>
        <div className="gap-spacing-2 flex items-center">
          <button
            type="button"
            onClick={() => setPicking((open) => !open)}
            className="button-compact button-glass-neutral"
            aria-label={picking ? 'Close recording picker' : 'Link a call recording'}
            aria-expanded={picking}
          >
            {picking ? 'Close' : 'Link recording'}
          </button>
        </div>
      </div>

      {picking ? (
        <div className="border-border gap-spacing-3 rounded-spacing-2 p-spacing-3 flex flex-col border">
          <p className="typo-caption text-muted-foreground">
            Select a Fathom recording to link to this meeting.
          </p>
          {loadingCandidates && candidates.length === 0 ? (
            <p className="body-4 text-muted-foreground">Loading recordings…</p>
          ) : null}
          {!loadingCandidates && candidates.length === 0 ? (
            <p className="body-4 text-muted-foreground">No Fathom recordings found.</p>
          ) : null}
          <div className="gap-spacing-2 flex max-h-64 flex-col overflow-y-auto">
            {candidates.map((meeting) => {
              const candidateId = recordingCandidateId(meeting)
              if (!candidateId) return null
              const linked = linkedIds.has(candidateId)
              const when = formatRecordingWhen(meeting)
              const title = displayFathomRecordingTitle(meeting)
              const busy = linkingId === candidateId
              return (
                <button
                  key={candidateId}
                  type="button"
                  disabled={linked || Boolean(linkingId)}
                  onClick={() => void linkCandidate(meeting)}
                  className="border-border hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 p-spacing-3 flex w-full items-start border text-left disabled:opacity-60"
                  aria-label={title}
                >
                  <span className="mt-spacing-1 shrink-0">
                    {linked ? (
                      <Check className="icon-sm text-primary" aria-hidden />
                    ) : (
                      <Radio className="icon-sm text-muted-foreground" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="body-4 text-foreground block truncate">{title}</span>
                    <span className="typo-caption text-muted-foreground mt-spacing-1 block">
                      {linked ? 'Already linked' : busy ? 'Linking…' : when || 'Select to link'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          {nextCursor ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingCandidates}
              className="button-compact button-glass-neutral self-start disabled:opacity-50"
            >
              {loadingCandidates ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </div>
      ) : null}

      {recordings.map((recording) => (
        <div
          key={recording.id}
          className="border-border gap-spacing-2 rounded-spacing-2 p-spacing-3 flex flex-col border"
        >
          <div className="gap-spacing-2 flex items-center">
            <Radio className="icon-sm text-primary" aria-hidden />
            <span className="body-4 text-foreground truncate">{recording.title}</span>
          </div>
          <p className="typo-caption text-muted-foreground">
            {recording.is_primary ? 'Primary recording' : 'Supplemental recording'}
          </p>
          {recording.recording_url ? (
            <a
              href={recording.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="typo-caption text-primary gap-spacing-1 inline-flex items-center"
            >
              Open recording <ExternalLink className="icon-xs" />
            </a>
          ) : null}
          {recording.transcript_doc_item_id ? (
            <button
              type="button"
              onClick={() =>
                openDocumentInShell({
                  documentId: recording.transcript_doc_item_id!,
                  spaceItemId: recording.transcript_doc_item_id!,
                  spaceId,
                  title: `Transcript — ${recording.title}`,
                })
              }
              className="button-compact button-glass-neutral self-start"
            >
              Open transcript
            </button>
          ) : null}
        </div>
      ))}

      {children}

      {!picking && recordings.length === 0 && attachmentCount === 0 ? (
        <p className="body-4 text-muted-foreground">
          {isPostCall
            ? 'No recording or attachments yet — link a Fathom recording.'
            : 'Recordings and attachments will land here after the call.'}
        </p>
      ) : null}
    </section>
  )
}
