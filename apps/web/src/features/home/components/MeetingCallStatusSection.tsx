'use client'

import { Play, Square } from 'lucide-react'
import {
  MEETING_POST_CALL_ACTIONS,
  MEETING_PRE_CALL_ACTIONS,
  type MeetingPostCallAction,
} from '@/features/home/config/meeting-post-call-actions.config'

function StartCallButton({
  starting,
  onStart,
  compact,
}: {
  starting: boolean
  onStart: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={starting}
      className={`${compact ? 'button-compact' : 'button-default'} button-glass-primary gap-spacing-2 inline-flex items-center disabled:opacity-50`}
    >
      <Play className={compact ? 'icon-xs' : 'icon-sm'} aria-hidden />
      {starting ? 'Opening…' : 'Start call'}
    </button>
  )
}

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
  onPostCallAction,
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
  onPostCallAction?: (action: MeetingPostCallAction) => void
}) {
  const isProcessing = phase === 'processing'
  const showPostCallActions = (isProcessing || isPostCall) && !isLive && onPostCallAction
  const showPreCallActions = !isLive && !isProcessing && !isPostCall && onPostCallAction
  return (
    <section className="border-border gap-spacing-4 py-spacing-4 flex flex-col border-b">
      <div className="gap-spacing-3 flex flex-wrap items-start justify-between">
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
            className="button-default button-glass-destructive gap-spacing-2 inline-flex items-center disabled:opacity-50"
          >
            <Square className="icon-sm" aria-hidden />
            {ending ? 'Ending…' : 'End call'}
          </button>
        ) : showPostCallActions ? null : (
          <StartCallButton starting={starting} onStart={onStart} />
        )}
      </div>
      {showPostCallActions || showPreCallActions ? (
        <div className="gap-spacing-2 flex w-full flex-wrap items-center">
          {showPostCallActions ? (
            <StartCallButton starting={starting} onStart={onStart} compact />
          ) : null}
          {(showPostCallActions ? MEETING_POST_CALL_ACTIONS : MEETING_PRE_CALL_ACTIONS).map(
            (action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onPostCallAction(action)}
                  className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
                >
                  <Icon className="icon-xs" aria-hidden />
                  {action.label}
                </button>
              )
            },
          )}
        </div>
      ) : null}
    </section>
  )
}
