'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, X } from 'lucide-react'
import { useBrainLiveSession, type BrainLiveScope } from '../hooks/use-brain-live-session'

const BrainVoiceOrbScene = dynamic(
  () => import('./BrainVoiceOrbScene').then((m) => ({ default: m.BrainVoiceOrbScene })),
  { ssr: false },
)

const TOOL_LABELS: Record<string, string> = {
  save_memory: 'Saving to your brain…',
  search_brain: 'Searching your memories…',
  search_memory: 'Searching your memories…',
  list_recent_memories: 'Recalling recent memories…',
  get_brain_stats: 'Checking brain stats…',
  trigger_crystallization: 'Crystallizing insight…',
}

interface BrainVoiceOrbProps {
  onClose: () => void
  scope?: BrainLiveScope
}

export function BrainVoiceOrb({ onClose, scope }: BrainVoiceOrbProps) {
  const {
    state,
    inputTranscript,
    outputTranscript,
    activeToolCall,
    audioLevelRef,
    error,
    startSession,
    endSession,
  } = useBrainLiveSession(scope)

  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state === 'listening' || state === 'speaking' || state === 'toolCall') {
      if (!timerRef.current) {
        const start = Date.now()
        timerRef.current = setInterval(
          () => setElapsed(Math.floor((Date.now() - start) / 1000)),
          250,
        )
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startSession()
  }, [])

  const handleClose = () => {
    endSession()
    onClose()
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-modal-overlay" onClick={handleClose} />

      <button
        type="button"
        onClick={handleClose}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10 flex h-[55vh] max-h-[90vw] w-[55vh] max-w-[90vw] items-center justify-center">
        <BrainVoiceOrbScene
          animationState={orbState}
          audioLevelRef={audioLevelRef}
          size="full"
          enableMouseRepulsion={state === 'idle' || state === 'error'}
        />
      </div>

      <div className="relative z-10 mt-4 flex max-w-lg flex-col items-center gap-3 px-6 text-center">
        {state === 'connecting' && (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="body-2">Connecting to Atlas…</span>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-2">
            <p className="body-2 text-red-400">{error ?? 'Something went wrong'}</p>
            <button
              type="button"
              onClick={() => startSession()}
              className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {activeToolCall && (
          <p className="body-2 text-primary animate-pulse font-medium">
            {TOOL_LABELS[activeToolCall] ?? `Running ${activeToolCall}…`}
          </p>
        )}

        {inputTranscript && state !== 'error' && (
          <p className="body-3 max-h-12 overflow-hidden text-white/50">{inputTranscript}</p>
        )}

        {outputTranscript && state !== 'error' && (
          <p className="body-2 max-h-16 overflow-hidden text-white/90">{outputTranscript}</p>
        )}

        {(state === 'listening' || state === 'speaking' || state === 'toolCall') && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <span className="body-4 font-mono text-white/40">{formatTime(elapsed)}</span>
              {state === 'listening' && (
                <div className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 animate-pulse text-red-400" />
                  <span className="body-4 text-white/50">Listening</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              End Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
