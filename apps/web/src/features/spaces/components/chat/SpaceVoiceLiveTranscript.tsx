'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import type { LiveSessionState } from '@/features/brain/hooks/use-brain-live-session'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import type { SpaceChatTurnData } from './space-vibey-chat-messages.logic'
import {
  getLiveInputPlaceholder,
  getLiveOutputPlaceholder,
  isVoiceAssistantStreaming,
  normalizeAudioLevel,
} from './space-voice-live-transcript.logic'

interface SpaceVoiceLiveTranscriptProps {
  agentName: string
  conversationId: string | null
  state: LiveSessionState
  turnData: SpaceChatTurnData<Message>
  inputTranscript: string
  outputTranscript: string
  micInputLevelRef: MutableRefObject<number>
  audioLevelRef: MutableRefObject<number>
  isMuted: boolean
}

function useLevelMeter(levelRef: MutableRefObject<number>, active: boolean): number {
  const [level, setLevel] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastLevelRef = useRef(0)

  useEffect(() => {
    if (!active) {
      lastLevelRef.current = 0
      setLevel(0)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }

    let mounted = true
    const tick = () => {
      if (!mounted) return
      const next = normalizeAudioLevel(levelRef.current)
      if (Math.abs(next - lastLevelRef.current) >= 1) {
        lastLevelRef.current = next
        setLevel(next)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      mounted = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [active, levelRef])

  return level
}

function AudioLevelRow({
  label,
  level,
  hint,
}: {
  label: string
  level: number
  hint?: string
}) {
  return (
    <div className="gap-spacing-1 flex flex-col">
      <div className="gap-spacing-2 flex items-center justify-between">
        <span className="typo-caption text-muted-foreground uppercase">{label}</span>
        <span className="body-4 text-muted-foreground">{hint ?? (level > 4 ? 'Active' : 'Silent')}</span>
      </div>
      <div className="progress-bar-track w-full">
        <div className="progress-bar-fill transition-[width] duration-75" style={{ width: `${level}%` }} />
      </div>
    </div>
  )
}

function LiveTranscriptLine({
  label,
  text,
  isPlaceholder,
}: {
  label: string
  text: string
  isPlaceholder: boolean
}) {
  return (
    <div className="gap-spacing-1 flex flex-col">
      <span className="typo-caption text-muted-foreground uppercase">{label}</span>
      <p className={`body-3 wrap-break-word ${isPlaceholder ? 'text-muted-foreground italic' : 'text-foreground'}`}>
        {text}
      </p>
    </div>
  )
}

export function SpaceVoiceLiveTranscript({
  agentName,
  conversationId,
  state,
  turnData,
  inputTranscript,
  outputTranscript,
  micInputLevelRef,
  audioLevelRef,
  isMuted,
}: SpaceVoiceLiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const metering =
    state === 'connecting' ||
    state === 'listening' ||
    state === 'speaking' ||
    state === 'toolCall'
  const active = state === 'listening' || state === 'speaking' || state === 'toolCall'
  const micLevel = useLevelMeter(micInputLevelRef, metering && !isMuted)
  const speakerLevel = useLevelMeter(audioLevelRef, metering && state === 'speaking')

  const inputText = inputTranscript.trim() || getLiveInputPlaceholder(state, isMuted)
  const outputText = outputTranscript.trim() || getLiveOutputPlaceholder(state, agentName)
  const hasHistory =
    turnData.leadingMessages.length > 0 ||
    turnData.turns.some((turn) => turn.user.content?.trim() || turn.responses.some((r) => r.content?.trim()))

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [turnData, inputTranscript, outputTranscript, state])

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
      <p className="typo-caption text-muted-foreground px-1 pb-2 text-center uppercase">Live transcript</p>

      <div className="gap-spacing-2 border-border mb-3 flex flex-col border-b px-1 pb-3">
        <AudioLevelRow
          label="Mic input"
          level={micLevel}
          hint={isMuted ? 'Muted' : micLevel > 4 ? 'Hearing you' : 'No input detected'}
        />
        <AudioLevelRow
          label="Speaker output"
          level={speakerLevel}
          hint={state === 'speaking' ? (speakerLevel > 4 ? 'Playing audio' : 'No audio detected') : 'Idle'}
        />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1">
        {!hasHistory ? (
          <p className="body-4 text-muted-foreground pb-3 text-center">
            Conversation text will build here as you talk.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pb-3">
          {turnData.leadingMessages.map((message) => (
            <div key={message.id} data-message-id={message.id}>
              <MessageBubble
                message={message}
                isStreaming={false}
                isEditable={false}
                conversationIdOverride={conversationId}
              />
            </div>
          ))}

          {turnData.turns.map((turn) => (
            <div key={turn.user.id} data-turn-id={turn.user.id} className="flex flex-col gap-2">
              <MessageBubble
                message={turn.user}
                isStreaming={false}
                isEditable={false}
                conversationIdOverride={conversationId}
              />
              {turn.responses.map((message) => (
                <div key={message.id} data-message-id={message.id}>
                  <MessageBubble
                    message={message}
                    isStreaming={isVoiceAssistantStreaming(message.id, state)}
                    isEditable={false}
                    conversationIdOverride={conversationId}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {active ? (
        <div className="border-border gap-spacing-3 surface-card mt-2 flex flex-col border-t px-2 py-3">
          <LiveTranscriptLine
            label="You"
            text={inputText}
            isPlaceholder={!inputTranscript.trim()}
          />
          <LiveTranscriptLine
            label={agentName}
            text={outputText}
            isPlaceholder={!outputTranscript.trim()}
          />
        </div>
      ) : null}
    </div>
  )
}
