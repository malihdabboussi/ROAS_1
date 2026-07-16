'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Loader2, Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react'
import type { LiveSessionState } from '@/features/brain/hooks/use-brain-live-session'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import { StatusIndicator } from '@/features/studio/components/chat/StatusIndicator'
import type { SpaceChatTurnData } from './space-vibey-chat-messages.logic'
import { SpaceVoiceLiveTranscript } from './SpaceVoiceLiveTranscript'
import { formatVoiceElapsedTime } from '@/features/team/components/voice/agent-voice-mode/agent-voice-mode-utils'

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
  turnData: SpaceChatTurnData<Message>
  inputTranscript?: string
  outputTranscript?: string
  micInputLevelRef: MutableRefObject<number>
  audioLevelRef: MutableRefObject<number>
  error: string | null
  isMuted: boolean
  onReconnect: () => void
  onToggleMute: () => void
  onEnd: () => void
}

function voiceStatusLabel(state: LiveSessionState): string | null {
  switch (state) {
    case 'listening':
      return 'Listening'
    case 'speaking':
      return 'Speaking'
    case 'toolCall':
      return 'Working'
    default:
      return null
  }
}

export function SpaceVoiceSessionView({
  agentName,
  conversationId,
  state,
  turnData,
  inputTranscript = '',
  outputTranscript = '',
  micInputLevelRef,
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
  const showTranscript = active || state === 'connecting'
  const statusLabel = voiceStatusLabel(state)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4">
      <div className="flex shrink-0 flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <BrainVoiceOrbScene animationState={orbState} audioLevelRef={audioLevelRef} size="mini" />
        </div>

        <div className="mt-2 flex min-h-6 flex-col items-center justify-center gap-1 text-center">
          {state === 'connecting' ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="body-3">Connecting to {agentName}...</span>
            </div>
          ) : null}

          {state === 'error' ? (
            <p className="body-3 text-destructive">{error ?? 'Something went wrong'}</p>
          ) : null}

          {state === 'idle' ? (
            <p className="body-3 text-muted-foreground">Voice session ended</p>
          ) : null}

          {active && statusLabel ? (
            <div className="gap-spacing-1 flex items-center">
              {state === 'listening' ? (
                <Mic className="text-destructive h-3.5 w-3.5 animate-pulse" aria-hidden />
              ) : null}
              <span className="body-3 text-foreground font-medium">{statusLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      {showTranscript ? (
        <SpaceVoiceLiveTranscript
          agentName={agentName}
          conversationId={conversationId}
          state={state}
          turnData={turnData}
          inputTranscript={inputTranscript}
          outputTranscript={outputTranscript}
          micInputLevelRef={micInputLevelRef}
          audioLevelRef={audioLevelRef}
          isMuted={isMuted}
        />
      ) : null}

      {conversationId ? (
        <div className="mt-2 w-full max-w-md shrink-0">
          <StatusIndicator conversationIdOverride={conversationId} />
        </div>
      ) : null}

      <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
        {active ? (
          <>
            <span className="body-4 text-muted-foreground font-mono">{formatVoiceElapsedTime(elapsed)}</span>
            <button
              type="button"
              onClick={onToggleMute}
              className={`btn-icon-glass rounded-full p-2 ${isMuted ? 'bg-destructive/15' : ''}`}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="text-destructive h-4 w-4" />
              ) : (
                <Mic className="text-muted-foreground h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleEnd}
              className="bg-destructive/15 text-destructive hover:bg-destructive/25 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
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
