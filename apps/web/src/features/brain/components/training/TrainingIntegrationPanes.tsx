'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ExternalLink, Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import { reportBrainError } from '../../lib/report-brain-error'
import {
  listFathomMeetings,
  listFirefliesTranscripts,
  type FathomMeeting,
  type FirefliesTranscript,
} from '../../services/user-brain-import.service'
import { formatMeetingTime } from './training-staging-helpers'

export function TrainingFathomPane({
  connected,
  onAddMeeting,
  isStaged,
  isInBrain,
}: {
  connected: boolean
  onAddMeeting: (meeting: FathomMeeting) => void
  isStaged: (meeting: FathomMeeting) => boolean
  isInBrain: (meeting: FathomMeeting) => boolean
}) {
  const [items, setItems] = useState<FathomMeeting[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    if (!connected) return
    setLoading(true)
    try {
      const result = await listFathomMeetings()
      setItems(result.items)
      setCursor(result.next_cursor)
    } catch (error) {
      reportBrainError('fathom_meetings_load_failed', error)
      toast.error(
        error instanceof Error
          ? error.message
          : BRAIN_TOAST_ERRORS.LOAD_FATHOM_FAILED.userMessage,
      )
    } finally {
      setLoading(false)
    }
  }, [connected])

  useEffect(() => {
    if (connected) void load()
  }, [connected, load])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return items
    return items.filter((meeting) =>
      (meeting.title || meeting.meeting_title || '').toLowerCase().includes(search),
    )
  }, [items, query])

  if (!connected) {
    return (
      <div className="px-spacing-6 py-spacing-8 flex h-full flex-col items-center justify-center gap-2 text-center">
        <ExternalLink className="icon-md text-muted-foreground" />
        <p className="body-3 text-muted-foreground">Fathom isn't connected.</p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 flex h-full flex-col">
      <TrainingIntegrationSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search Fathom calls…"
      />
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {loading ? (
          <div className="py-spacing-8 flex justify-center">
            <Loader2 className="icon-sm text-muted-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="body-3 text-muted-foreground py-spacing-4 text-center">No calls found.</p>
        ) : (
          filtered.map((meeting) => {
            const staged = isStaged(meeting)
            const inBrain = isInBrain(meeting)
            return (
              <button
                key={String(
                  meeting.id ||
                    meeting.recording_id ||
                    meeting.call_id ||
                    meeting.url ||
                    meeting.title,
                )}
                type="button"
                onClick={() => onAddMeeting(meeting)}
                disabled={staged}
                className={cn(
                  'rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-3 group flex w-full items-center text-left transition-colors',
                  staged
                    ? 'card-glass-blue cursor-default'
                    : 'border-border bg-muted/20 hover:bg-muted/30 border',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="body-3 text-foreground truncate font-medium">
                    {meeting.title || meeting.meeting_title || 'Untitled Meeting'}
                  </p>
                  <p className="typo-caption text-muted-foreground">
                    {formatMeetingTime(meeting.created_at)}
                  </p>
                </div>
                <div className="gap-spacing-1 flex shrink-0 items-center">
                  {inBrain ? <AlreadyInBrainBadge /> : null}
                  {staged ? (
                    <span className="typo-caption text-muted-foreground">Staged</span>
                  ) : (
                    <Plus className="icon-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
              </button>
            )
          })
        )}
        {cursor ? (
          <div className="py-spacing-2 flex justify-center">
            {loadingMore ? (
              <Loader2 className="icon-xs animate-spin" />
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setLoadingMore(true)
                  try {
                    const result = await listFathomMeetings(cursor)
                    setItems((prev) => [...prev, ...result.items])
                    setCursor(result.next_cursor)
                  } finally {
                    setLoadingMore(false)
                  }
                }}
                className="body-3 text-muted-foreground hover:text-foreground"
              >
                Load more
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function TrainingFirefliesPane({
  connected,
  onAddTranscript,
  isStaged,
  isInBrain,
}: {
  connected: boolean
  onAddTranscript: (transcript: FirefliesTranscript) => void
  isStaged: (transcript: FirefliesTranscript) => boolean
  isInBrain: (transcript: FirefliesTranscript) => boolean
}) {
  const [items, setItems] = useState<FirefliesTranscript[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!connected) return
    setLoading(true)
    listFirefliesTranscripts(30)
      .then(setItems)
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : BRAIN_TOAST_ERRORS.LOAD_FIREFLIES_FAILED.userMessage,
        )
      })
      .finally(() => setLoading(false))
  }, [connected])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return items
    return items.filter((transcript) => (transcript.title || '').toLowerCase().includes(search))
  }, [items, query])

  if (!connected) {
    return (
      <div className="px-spacing-6 py-spacing-8 flex h-full flex-col items-center justify-center gap-2 text-center">
        <ExternalLink className="icon-md text-muted-foreground" />
        <p className="body-3 text-muted-foreground">Fireflies isn't connected.</p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 flex h-full flex-col">
      <TrainingIntegrationSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search Fireflies calls…"
      />
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {loading ? (
          <div className="py-spacing-8 flex justify-center">
            <Loader2 className="icon-sm animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="body-3 text-muted-foreground py-spacing-4 text-center">No calls found.</p>
        ) : (
          filtered.map((transcript) => {
            const staged = isStaged(transcript)
            const inBrain = isInBrain(transcript)
            return (
              <button
                key={transcript.id}
                type="button"
                onClick={() => onAddTranscript(transcript)}
                disabled={staged}
                className={cn(
                  'rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-3 group flex w-full items-center text-left transition-colors',
                  staged
                    ? 'card-glass-blue cursor-default'
                    : 'border-border bg-muted/20 hover:bg-muted/30 border',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="body-3 text-foreground truncate font-medium">
                    {transcript.title || 'Untitled Meeting'}
                  </p>
                  <p className="typo-caption text-muted-foreground">
                    {formatMeetingTime(transcript.date)}
                  </p>
                </div>
                <div className="gap-spacing-1 flex shrink-0 items-center">
                  {inBrain ? <AlreadyInBrainBadge /> : null}
                  {staged ? (
                    <span className="typo-caption text-muted-foreground">Staged</span>
                  ) : (
                    <Plus className="icon-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function TrainingIntegrationSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative shrink-0">
      <Search className="icon-xs text-muted-foreground left-spacing-2 absolute top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-spacing-8 pl-spacing-6 pr-spacing-2 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
      />
    </div>
  )
}

function AlreadyInBrainBadge() {
  return (
    <span className="body-4 bg-warning/10 text-warning rounded-spacing-1 px-spacing-1 gap-spacing-1 flex items-center">
      <AlertTriangle className="icon-xs" />
      In brain
    </span>
  )
}
