'use client'

import { useState } from 'react'
import { Send, ThumbsDown, ThumbsUp } from 'lucide-react'

export interface RatingPayload {
  thumbs_up: boolean | null
  rating: number | null
  feedback: string
}

interface MissionRatingStripProps {
  onSubmit: (payload: RatingPayload) => void
  sending?: boolean
}

export function MissionRatingStrip({ onSubmit, sending }: MissionRatingStripProps) {
  const [thumbs, setThumbs] = useState<boolean | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleThumbs = (up: boolean) => {
    const next = thumbs === up ? null : up
    setThumbs(next)
    setExpanded(true)
  }

  const canSend = thumbs !== null && !sending

  const handleSend = () => {
    if (!canSend) return
    onSubmit({ thumbs_up: thumbs, rating, feedback: feedback.trim() })
  }

  return (
    <div className="rounded-spacing-2 px-spacing-3 py-spacing-2 border border-orange-500/20 bg-orange-500/[0.06]">
      <div className="flex items-center justify-between">
        <p className="typo-caption shrink-0 uppercase tracking-wide text-orange-300/70">
          Rate this work
        </p>
        <div className="gap-spacing-1 flex items-center">
          <button
            type="button"
            onClick={() => handleThumbs(true)}
            className={`btn-icon-glass btn-icon-glass-sm ${thumbs === true ? 'border border-emerald-500/40 bg-emerald-500/10' : ''}`}
            aria-label="Thumbs up"
          >
            <ThumbsUp className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={() => handleThumbs(false)}
            className={`btn-icon-glass btn-icon-glass-sm ${thumbs === false ? 'border border-red-500/40 bg-red-500/10' : ''}`}
            aria-label="Thumbs down"
          >
            <ThumbsDown className="icon-xs" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-spacing-2 mt-spacing-2">
          <div className="flex items-center gap-2">
            <span className="typo-caption tabular-nums text-orange-300/50">1</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={rating ?? 5}
              onChange={(e) => setRating(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-orange-400 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400"
            />
            <span className="typo-caption tabular-nums text-orange-300/50">10</span>
            <span className="typo-caption min-w-[1.25rem] text-center font-medium text-orange-300">
              {rating ?? '–'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-spacing-1 px-spacing-2 py-spacing-1 flex-1 border border-orange-500/10 bg-orange-500/[0.04]">
              <input
                type="text"
                placeholder="Optional feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="body-3 w-full bg-transparent text-[var(--color-foreground)] placeholder:text-orange-300/30 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="button-glass-neutral flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30"
              aria-label="Send rating"
            >
              <Send className={`h-3.5 w-3.5 ${sending ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
