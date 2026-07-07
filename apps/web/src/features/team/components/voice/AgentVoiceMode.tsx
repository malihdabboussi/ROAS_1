'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  useBrainLiveSession,
  type BrainLiveScope,
} from '@/lib/brain/brain-live-session-adapter'
import type { MissionAgent } from '@/lib/agents'
import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'
import { VoiceApprovalProvider } from '@/components/chat/VoiceApprovalContext'
import { AgentVoiceSessionHeader } from './agent-voice-mode/AgentVoiceSessionHeader'
import { AgentVoiceTranscript } from './agent-voice-mode/AgentVoiceTranscript'
import {
  BOTTOM_SCROLL_THRESHOLD,
  EMPTY_MESSAGES,
  buildAgentVoiceTurnData,
  getAgentVoiceOrbState,
} from './agent-voice-mode/agent-voice-mode-utils'
import { VoiceTaskPanel } from './VoiceTaskPanel'

interface AgentVoiceModeProps {
  agent: MissionAgent
  conversationId: string | null
  voiceName?: string
  onEnd: () => void
}

export function AgentVoiceMode({ agent, conversationId, voiceName, onEnd }: AgentVoiceModeProps) {
  const scope: BrainLiveScope = useMemo(
    () => ({
      type: 'agent' as const,
      agentId: agent.agent_key,
      label: agent.name,
      avatarUrl: agent.image_url ?? undefined,
      voiceName,
      conversationId,
    }),
    [agent.agent_key, agent.name, agent.image_url, voiceName, conversationId],
  )

  const {
    state,
    inputTranscript: _inputTranscript,
    outputTranscript: _outputTranscript,
    audioLevelRef,
    error,
    isMuted,
    delegationTasks,
    startSession,
    reconnectSession,
    endSession,
    toggleMute,
    sendApproval,
  } = useBrainLiveSession(scope)

  const hasTasks = delegationTasks.length > 0

  const [elapsed, setElapsed] = useState(0)
  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartRef = useRef<number>(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)
  const spacerHeightRef = useRef(0)
  const lastUserPromptHeightRef = useRef(0)
  const isProgrammaticScrollRef = useRef(false)
  const previousMessageCountRef = useRef(0)

  const messages = useChatStore((s) =>
    conversationId ? (s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )
  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const meta = m.metadata as Record<string, unknown> | undefined
        if (meta?.hidden) return false
        if (meta?.delegation_task) return false
        return true
      }),
    [messages],
  )

  const turnData = useMemo(() => buildAgentVoiceTurnData(visibleMessages), [visibleMessages])

  useEffect(() => {
    const isActive = state === 'listening' || state === 'speaking' || state === 'toolCall'
    if (isActive && !timerRef.current) {
      timerStartRef.current = Date.now()
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000)),
        250,
      )
    }
    if (!isActive && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [state === 'listening' || state === 'speaking' || state === 'toolCall'])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startSession()
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const applyHeight = (h: number) => {
      setSpacerHeight(h)
      spacerHeightRef.current = h
    }
    const ro = new ResizeObserver(([entry]) => {
      if (entry) applyHeight(entry.contentRect.height)
    })
    ro.observe(el)
    applyHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [conversationId])

  useEffect(() => {
    const el = lastUserPromptRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        const h = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
        setLastUserPromptHeight(h)
        lastUserPromptHeightRef.current = h
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [visibleMessages.length])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || visibleMessages.length === 0) return

    const currentCount = visibleMessages.length
    const prevCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    if (currentCount > prevCount && prevCount > 0) {
      const latestUserMsg = [...visibleMessages].reverse().find((m) => m.role === 'user')
      if (latestUserMsg) {
        setTimeout(() => {
          const el = scrollEl.querySelector(`[data-turn-id="${latestUserMsg.id}"]`)
          if (el) {
            isProgrammaticScrollRef.current = true
            const containerTop = scrollEl.getBoundingClientRect().top
            const elTop = el.getBoundingClientRect().top
            scrollEl.scrollTop += elTop - containerTop
            requestAnimationFrame(() => {
              isProgrammaticScrollRef.current = false
            })
          }
        }, 80)
      }
      setUserHasScrolledUp(false)
    }
  }, [visibleMessages.length, visibleMessages])

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SCROLL_THRESHOLD
    setUserHasScrolledUp(!atBottom)
  }, [])

  const handleScrollToBottom = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    setUserHasScrolledUp(false)
  }, [])

  const handleEnd = () => {
    endSession()
    onEnd()
  }

  const orbState = getAgentVoiceOrbState(state)

  return (
    <VoiceApprovalProvider value={sendApproval}>
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            hasTasks ? 'basis-3/5 min-w-80 shrink-0' : 'flex-1'
          }`}
        >
          <AgentVoiceSessionHeader
            agentName={agent.name}
            state={state}
            orbState={orbState}
            audioLevelRef={audioLevelRef}
            error={error}
            elapsed={elapsed}
            isMuted={isMuted}
            conversationId={conversationId}
            sessionStarted={startedRef.current}
            onReconnect={reconnectSession}
            onToggleMute={toggleMute}
            onEnd={handleEnd}
          />

          <AgentVoiceTranscript
            scrollRef={scrollRef}
            lastUserPromptRef={lastUserPromptRef}
            turnData={turnData}
            state={state}
            conversationId={conversationId}
            spacerHeight={spacerHeight}
            lastUserPromptHeight={lastUserPromptHeight}
            userHasScrolledUp={userHasScrolledUp}
            visibleMessageCount={visibleMessages.length}
            onScroll={handleScroll}
            onScrollToBottom={handleScrollToBottom}
          />
        </div>

        <motion.div
          initial={false}
          animate={{ flexGrow: hasTasks ? 1 : 0, opacity: hasTasks ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className="bg-background flex min-h-0 basis-0 shrink-0 flex-col overflow-hidden"
        >
          <VoiceTaskPanel conversationId={conversationId} tasks={delegationTasks} />
        </motion.div>
      </div>
    </VoiceApprovalProvider>
  )
}
