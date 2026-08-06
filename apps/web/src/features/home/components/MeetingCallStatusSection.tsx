'use client'

import { Play, Square } from 'lucide-react'

export function MeetingCallStatusSection({
  phase,
  isLive,
  isPostCall,
  hasRecording,
  joinUrl,
  starting,
  ending,
  onStart,
  onEnd,
  onContinue,
}: {
  phase: string | undefined
  isLive: boolean
  isPostCall: boolean
  hasRecording: boolean
  joinUrl: string | null
  starting: boolean
  ending: boolean
  onStart: () => void
  onEnd: () => void
  onContinue: () => void
}) {
  const isProcessing = phase === 'processing'
  return (
    <section className="border-border gap-spacing-4 py-spacing-3 flex items-center justify-between border-b">
      <div className="min-w-0 flex-1">
        <p className="body-3 text-foreground font-semibold">
          {isLive
            ? 'Call in progress'
            : isProcessing
              ? 'Call ended'
              : isPostCall
                ? 'Call complete'
                : 'Ready when you are'}
        </p>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          {isLive
            ? 'Dump notes in chat. End the call when you wrap.'
            : isProcessing
              ? 'Recording still catching up — keep chatting anytime.'
              : isPostCall
                ? hasRecording
                  ? 'Recording, transcript, and follow-ups are ready to review below.'
                  : 'This meeting has ended. Link its recording below if it has not appeared yet.'
                : 'Start the call without losing your agenda, chat, or follow-ups.'}
        </p>
        {isLive && joinUrl ? (
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="typo-caption text-primary mt-spacing-2 inline-flex"
          >
            Open call link
          </a>
        ) : null}
      </div>
      {isLive ? (
        <button
          type="button"
          onClick={onEnd}
          disabled={ending}
          className="button-default button-glass-destructive gap-spacing-2 inline-flex shrink-0 items-center disabled:opacity-50"
        >
          <Square className="icon-sm" aria-hidden />
          {ending ? 'Ending…' : 'End call'}
        </button>
      ) : isProcessing || isPostCall ? (
        <button
          type="button"
          onClick={onContinue}
          className="button-default button-glass-neutral gap-spacing-2 inline-flex shrink-0 items-center"
        >
          Continue in chat
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="button-default button-glass-primary gap-spacing-2 inline-flex shrink-0 items-center disabled:opacity-50"
        >
          <Play className="icon-sm" aria-hidden />
          {starting ? 'Opening…' : 'Start call'}
        </button>
      )}
    </section>
  )
}
