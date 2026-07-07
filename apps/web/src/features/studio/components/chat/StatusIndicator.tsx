'use client'

import { useEffect, useRef, useState } from 'react'
import { VibeyChatOrb, type OrbAnimationStyle } from '@/components/vibey/vibey-chat-orb'
import {
  useChatStore,
  type FlowGenerationBlock,
  type FlowTimelineBlock,
  type FlowToolBlock,
} from '../../store/use-chat-store'
import { FlowTimeline } from './FlowTimeline'
import { TypewriterShimmer } from './TypewriterShimmer'

const ORB_STYLES: OrbAnimationStyle[] = ['elastic', 'trails', 'constellation', 'liquid', 'firefly']

/**
 * Rotating status messages — cycles every 8s with typewriter effect.
 */
const THINKING_MESSAGES = [
  'Working...',
  'Getting oriented...',
  'Planning next moves...',
  'Thinking through it...',
  'Connecting the dots...',
  'Moving things along...',
  'Checking the next step...',
  'Keeping the thread moving...',
]

/**
 * StatusIndicator — Shows progress while Vibey is working.
 *
 * Thinking (no tools yet) → emerald/green orb + typewriter rotating messages
 * Tool active             → orange orb + shimmer label
 * Tool completed         → checkmark icon + muted label
 * Streaming (text)        → hidden (text is the progress)
 *
 * @param conversationIdOverride — When provided (e.g. widget modal), use instead of activeConversationId for streaming checks
 */
const EMPTY_FLOW_TIMELINE: import('../../store/use-chat-store').FlowTimelineBlock[] = []
const EMPTY_ACTIVE_TOOLS: Array<{ name: string; label: string; toolCallId?: string }> = []

export function StatusIndicator({
  conversationIdOverride,
}: { conversationIdOverride?: string | null } = {}) {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const hasConversationOverride = conversationIdOverride !== undefined
  const effectiveConversationId = hasConversationOverride
    ? conversationIdOverride
    : activeConversationId
  const flowTimeline = useChatStore((s) =>
    hasConversationOverride && conversationIdOverride
      ? (s.conversationStreamUI[conversationIdOverride]?.flowTimeline ?? EMPTY_FLOW_TIMELINE)
      : hasConversationOverride
        ? EMPTY_FLOW_TIMELINE
        : s.flowTimeline,
  )
  const agentPhase = useChatStore((s) =>
    hasConversationOverride && conversationIdOverride
      ? (s.conversationStreamUI[conversationIdOverride]?.agentPhase ?? 'idle')
      : hasConversationOverride
        ? 'idle'
        : s.agentPhase,
  )
  const activeTools = useChatStore((s) =>
    hasConversationOverride && conversationIdOverride
      ? (s.conversationStreamUI[conversationIdOverride]?.activeTools ?? EMPTY_ACTIVE_TOOLS)
      : hasConversationOverride
        ? EMPTY_ACTIVE_TOOLS
        : s.activeTools,
  )
  const agentStatusMessage = useChatStore((s) =>
    hasConversationOverride && conversationIdOverride
      ? (s.conversationStreamUI[conversationIdOverride]?.agentStatusMessage ?? null)
      : hasConversationOverride
        ? null
        : s.agentStatusMessage,
  )
  const isStreaming = useChatStore((s) =>
    effectiveConversationId ? s.streamingConversationIds.includes(effectiveConversationId) : false,
  )
  const isReconnecting = useChatStore((s) =>
    effectiveConversationId
      ? s.reconnectingConversationIds.includes(effectiveConversationId)
      : false,
  )
  const streamingMessageId = useChatStore((s) =>
    effectiveConversationId
      ? (s.streamingMessageIdsByConversation[effectiveConversationId] ?? null)
      : null,
  )
  const messagesByConversation = useChatStore((s) => s.messagesByConversation)
  const lastAgentEventAt = useChatStore((s) =>
    effectiveConversationId ? (s.lastAgentEventAtByConversation[effectiveConversationId] ?? 0) : 0,
  )
  const [thinkingIndex, setThinkingIndex] = useState(0)
  const [clock, setClock] = useState(() => Date.now())
  const lastVisibilitySignatureRef = useRef<string>('')

  // Streaming message uses content_blocks_ordered (tools inline) — don't duplicate in StatusIndicator
  // When streamingMessageId is set (live SSE), use it directly.
  // When null but conversation is streaming (DB-poll recovery), fall back to the last assistant message.
  const streamingMsg = (() => {
    if (!effectiveConversationId) return null
    const msgs = messagesByConversation[effectiveConversationId]
    if (!msgs) return null
    if (streamingMessageId) return msgs.find((m) => m.id === streamingMessageId) ?? null
    if (isStreaming) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i]?.role === 'assistant') return msgs[i] ?? null
      }
    }
    return null
  })()
  const orderedBlocks =
    (streamingMsg?.metadata?.content_blocks_ordered as Array<{
      type: string
      state?: string
      content?: string
    }>) ?? []
  const streamingHasOrderedBlocks = orderedBlocks.some((b) => b.type === 'tool')
  const streamingHasActiveToolBlock = orderedBlocks.some(
    (b) => b.type === 'tool' && b.state === 'active',
  )
  const streamingHasActiveCompaction = orderedBlocks.some(
    (b) => b.type === 'session_compaction' && b.state === 'active',
  )
  const streamingHasThinkingTranscript = orderedBlocks.some(
    (b) => b.type === 'thinking_transcript' && b.state === 'active' && !!b.content?.trim(),
  )
  const streamingMsgHasTextContent =
    !!streamingMsg?.content?.trim() ||
    orderedBlocks.some((b) => b.type === 'text' && !!b.content?.trim())
  /** Avoid orb between inline cards (artifact, etc.) and the narrative — reads as one message */
  const waitingForTextAfterRichCard =
    isStreaming &&
    !streamingMsgHasTextContent &&
    orderedBlocks.some((b) => b.type === 'artifact_preview' || b.type === 'document_card')
  // Rotate thinking messages
  useEffect(() => {
    if (agentPhase !== 'thinking' && agentPhase !== 'executing' && agentPhase !== 'streaming')
      return
    if (flowTimeline.length > 0) return

    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [agentPhase, flowTimeline.length])

  // Reset thinking index when a new stream starts
  useEffect(() => {
    if (isStreaming) setThinkingIndex(0)
  }, [isStreaming])

  // Gap filler: show a green orb if there's a 1s+ gap between any stream events.
  useEffect(() => {
    if (!isStreaming) return
    const interval = setInterval(() => setClock(Date.now()), 250)
    return () => clearInterval(interval)
  }, [isStreaming])

  const hasTools = flowTimeline.some((b) => b.type === 'tool')
  const activeGeneration = flowTimeline.find(
    (b): b is FlowGenerationBlock => b.type === 'generation' && b.state === 'active',
  )
  const showFlowTimeline = isStreaming && hasTools && !streamingHasOrderedBlocks
  // Keep waiting feedback visible while stream is still open, even after text appears.
  const suppressPostContentWaitingOrb = false
  const awaitingContent = agentPhase === 'streaming' && !streamingMsgHasTextContent
  const showThinking =
    isStreaming &&
    (agentPhase === 'thinking' || awaitingContent) &&
    !suppressPostContentWaitingOrb &&
    !showFlowTimeline &&
    !streamingHasThinkingTranscript &&
    !streamingHasActiveCompaction &&
    (!streamingHasOrderedBlocks || !streamingHasActiveToolBlock) &&
    !waitingForTextAfterRichCard &&
    !(agentPhase === 'thinking' && streamingMsgHasTextContent && !agentStatusMessage)
  const showExecuting =
    isStreaming &&
    agentPhase === 'executing' &&
    !showFlowTimeline &&
    !streamingHasThinkingTranscript &&
    !streamingHasActiveCompaction &&
    !streamingHasActiveToolBlock
  const showGeneration =
    isStreaming && !!activeGeneration && !showFlowTimeline && !streamingHasOrderedBlocks
  // Gap filler only when nothing else is visible (including inline ordered-block tools in MessageBubble).
  const showGapFiller =
    isStreaming &&
    lastAgentEventAt > 0 &&
    clock - lastAgentEventAt >= 1000 &&
    !suppressPostContentWaitingOrb &&
    !streamingHasThinkingTranscript &&
    !streamingHasActiveCompaction &&
    (!streamingHasOrderedBlocks || !streamingHasActiveToolBlock) &&
    !showFlowTimeline &&
    !showThinking &&
    !showExecuting &&
    !showGeneration &&
    !waitingForTextAfterRichCard
  const gapFillerState: 'thinking' | 'executing' =
    hasTools || streamingHasOrderedBlocks ? 'executing' : 'thinking'
  const displayLabel = activeTools[0]?.label ?? agentStatusMessage ?? 'Working…'
  const thinkingLabel =
    agentStatusMessage ?? THINKING_MESSAGES[thinkingIndex % THINKING_MESSAGES.length] ?? 'Thinking…'

  useEffect(() => {
    const signature = JSON.stringify({
      isStreaming,
      agentPhase,
      flowTimelineCount: flowTimeline.length,
      hasTools,
      streamingHasOrderedBlocks,
      streamingHasActiveToolBlock,
      hasActiveTools: activeTools.length > 0,
      showFlowTimeline,
      showThinking,
      showExecuting,
      showGeneration,
      showGapFiller,
    })
    if (signature === lastVisibilitySignatureRef.current) return
    lastVisibilitySignatureRef.current = signature
  }, [
    isStreaming,
    agentPhase,
    flowTimeline.length,
    hasTools,
    streamingHasOrderedBlocks,
    streamingHasActiveToolBlock,
    activeTools.length > 0,
    showFlowTimeline,
    showThinking,
    showExecuting,
    showGeneration,
    showGapFiller,
  ])

  if (isReconnecting && !isStreaming) {
    return (
      <div className="mx-2 flex items-center gap-2.5 py-0.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
          <VibeyChatOrb state="reconnecting" style={ORB_STYLES[0]} />
        </div>
        <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
          Reconnecting…
        </span>
      </div>
    )
  }

  if (!showFlowTimeline && !showThinking && !showExecuting && !showGeneration && !showGapFiller) {
    return null
  }

  return (
    <>
      {showFlowTimeline && <FlowTimeline blocks={flowTimeline} />}
      {showExecuting && (
        <div className="mx-2 flex items-center gap-2.5 py-0.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
            <VibeyChatOrb state="executing" style={ORB_STYLES[0]} />
          </div>
          <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
            {displayLabel}
          </span>
        </div>
      )}
      {showGeneration && (
        <div className="mx-2 flex items-center gap-2.5 py-0.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
            <VibeyChatOrb state="streaming" style={ORB_STYLES[0]} />
          </div>
          <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
            {activeGeneration?.message ?? 'Writing…'}
          </span>
        </div>
      )}
      {showThinking && (
        <div className="mx-2 flex items-center gap-2.5 py-0.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
            <VibeyChatOrb state="thinking" style={ORB_STYLES[thinkingIndex % ORB_STYLES.length]} />
          </div>
          <TypewriterShimmer key={agentStatusMessage ?? thinkingIndex} text={thinkingLabel} />
        </div>
      )}
      {showGapFiller && (
        <div className="mx-2 flex items-center gap-2.5 py-0.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
            <VibeyChatOrb state={gapFillerState} style={ORB_STYLES[0]} />
          </div>
          <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
            {displayLabel}
          </span>
        </div>
      )}
    </>
  )
}

/**
 * Static version for persisted tool steps in loaded messages.
 */
export function PersistedFlowTimeline({ blocks }: { blocks: FlowTimelineBlock[] }) {
  if (!blocks || blocks.length === 0) return null
  return <FlowTimeline blocks={blocks} />
}

/**
 * Backward-compatible renderer for old `tool_steps` string[] payloads.
 */
export function PersistedToolSteps({ steps }: { steps: string[] }) {
  if (!steps || steps.length === 0) return null
  const blocks: FlowToolBlock[] = steps.map((step, i) => ({
    id: `legacy-tool-${i}`,
    type: 'tool',
    name: `legacy-${i}`,
    label: step,
    state: 'complete',
    startedAt: Date.now() + i,
    endedAt: Date.now() + i,
    progress: [],
  }))
  return (
    <div className="mb-2">
      <FlowTimeline blocks={blocks as FlowTimelineBlock[]} />
    </div>
  )
}
