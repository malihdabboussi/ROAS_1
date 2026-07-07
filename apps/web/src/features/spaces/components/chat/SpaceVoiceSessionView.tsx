'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Loader2, Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react'
import type { LiveSessionState } from '@/features/brain/hooks/use-brain-live-session'
import { StatusIndicator } from '@/features/studio/components/chat/StatusIndicator'

const BrainVoiceOrbScene = dynamic(
  () =>
    import('@/features/brain/components/BrainVoiceOrbScene').then((m) => ({
      default: m.BrainVoiceOrbScene,
    })),
  { ssr: false },
)

interface SpaceVoiceSessionViewProps {
  agentName: string
  conversationId: string | null
  state: LiveSessionState
  audioLevelRef: MutableRefObject<number>
  error: string | null
  isMuted: boolean
  onReconnect: () => void
  onToggleMute: () => void
  onEnd: () => void
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

export function SpaceVoiceSessionView({
  agentName,
  conversationId,
  state,
  audioLevelRef,
  error,
  isMuted,
  onReconnect,
  onToggleMute,
  onEnd,
}: SpaceVoiceSessionViewProps) {
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartRef = useRef(0)

  useEffect(() => {
    const active = state === 'listening' || state === 'speaking' || state === 'toolCall'
    if (active && !timerRef.current) {
      timerStartRef.current = Date.now()
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000)),
        250,
      )
    }
    if (!active && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [state])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleEnd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setElapsed(0)
    onEnd()
  }, [onEnd])

  const orbState =
    state === 'idle' || state === 'error'
      ? 'idle'
      : state === 'connecting'
        ? 'connecting'
        : state === 'toolCall'
          ? 'toolCall'
          : state === 'speaking'
            ? 'speaking'
            : 'listening'

  const active = state === 'listening' || state === 'speaking' || state === 'toolCall'

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <BrainVoiceOrbScene animationState={orbState} audioLevelRef={audioLevelRef} size="mini" />
      </div>

      <div className="mt-4 flex min-h-6 items-center justify-center">
        {state === 'connecting' ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="body-3">Connecting to {agentName}...</span>
          </div>
        ) : null}

        {state === 'error' ? (
          <p className="body-3 text-[var(--color-destructive)]">
            {error ?? 'Something went wrong'}
          </p>
        ) : null}

        {state === 'idle' ? (
          <p className="body-3 text-muted-foreground">Voice session ended</p>
        ) : null}
      </div>

      {conversationId ? (
        <div className="mt-3 w-full max-w-md">
          <StatusIndicator conversationIdOverride={conversationId} />
        </div>
      ) : null}

      <div className="mt-4 flex min-h-10 items-center gap-3">
        {active ? (
          <>
            <span className="body-4 text-muted-foreground font-mono">{formatTime(elapsed)}</span>
            <button
              type="button"
              onClick={onToggleMute}
              className={`btn-icon-glass rounded-full p-2 ${isMuted ? 'bg-red-500/20' : ''}`}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4 text-red-400" />
              ) : (
                <Mic className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleEnd}
              className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/30"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onReconnect}
              className="button-glass-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reconnect
            </button>
            <button
              type="button"
              onClick={handleEnd}
              className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium"
            >
              Back to Chat
            </button>
          </>
        )}
      </div>
    </div>
  )
}
