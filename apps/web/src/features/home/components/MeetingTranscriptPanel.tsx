'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { extractCallTranscriptText } from '@/features/home/lib/extract-call-transcript'
import { fetchSpaceItem } from '@/lib/spaces/spaces-api'

export function MeetingTranscriptPanel({
  spaceId,
  callItemId,
}: {
  spaceId: string
  callItemId: string
}) {
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
