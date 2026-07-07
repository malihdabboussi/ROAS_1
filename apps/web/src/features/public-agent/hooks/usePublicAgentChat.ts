'use client'

import { useCallback, useRef, useState } from 'react'
import type { Message, MessageContentBlock } from '@/features/studio/types'
import { fetchPublicMessages, sendPublicMessageStream } from '../services/public-agent.service'
import { resolvePublicAgentStreamErrorMessage } from '../config/errors.config'
import { usePublicAgentConversationPreparation } from './usePublicAgentConversationPreparation'

export type AgentPhase = 'idle' | 'thinking' | 'executing' | 'streaming'

function mapPublicMessages(
  convId: string,
  rows: Array<{ id: string; role: string; content: string; metadata: unknown; created_at: string }>,
): Message[] {
  return rows.map((m) => ({
    id: m.id,
    conversation_id: convId,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    content_blocks: null,
    created_at: m.created_at,
    metadata: (m.metadata ?? {}) as Record<string, unknown>,
  }))
}

export function usePublicAgentChat(userSlug: string, agentKey: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentPhase, setAgentPhase] = useState<AgentPhase>('idle')
  const [agentStatusMessage, setAgentStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendInFlightRef = useRef(false)
  const {
    conversationId,
    preparationStatus,
    isPreparingContext,
    ensureConversation,
    prepareConversation,
    prepareConversationForSend,
    prewarmConversation,
    adoptConversation,
    getVisitorId,
    saveVisitorIdentity,
  } = usePublicAgentConversationPreparation(userSlug, agentKey)

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim()
      if (!trimmedContent || sendInFlightRef.current) return

      sendInFlightRef.current = true
      setError(null)
      setIsStreaming(true)
      setAgentPhase('thinking')
      setAgentStatusMessage(null)

      const resetSendState = () => {
        sendInFlightRef.current = false
        setIsStreaming(false)
        setAgentPhase('idle')
        setAgentStatusMessage(null)
        abortRef.current = null
      }

      let convId: string | null = null
      try {
        convId = await prepareConversationForSend()
      } catch {
        setError(resolvePublicAgentStreamErrorMessage({ code: 'generic' }))
      }
      if (!convId) {
        setError((current) => current ?? 'Failed to start conversation')
        resetSendState()
        return
      }
      const visitorId = getVisitorId()

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content: trimmedContent,
        content_blocks: null,
        created_at: new Date().toISOString(),
        metadata: {},
      }
      setMessages((prev) => [...prev, userMessage])

      const placeholderAssistantId = `assistant-${Date.now()}`
      let activeAssistantId = placeholderAssistantId
      let assistantContent = ''
      let orderedBlocks: MessageContentBlock[] = []
      let lastTextBlockId: string | null = null

      const resolveAssistantRowId = (prev: Message[]) => {
        if (prev.some((m) => m.id === activeAssistantId)) return activeAssistantId
        if (prev.some((m) => m.id === placeholderAssistantId)) return placeholderAssistantId
        return activeAssistantId
      }

      setMessages((prev) => [
        ...prev,
        {
          id: placeholderAssistantId,
          conversation_id: convId,
          role: 'assistant' as const,
          content: '',
          content_blocks: null,
          created_at: new Date().toISOString(),
          metadata: {},
        },
      ])

      const controller = new AbortController()
      abortRef.current = controller

      const updateAssistant = (patch: Partial<Message>) => {
        setMessages((prev) => {
          const rowId = resolveAssistantRowId(prev)
          return prev.map((m) => (m.id === rowId ? { ...m, ...patch } : m))
        })
      }

      const recoverPersistedAssistant = async (): Promise<boolean> => {
        try {
          const persisted = await fetchPublicMessages(userSlug, agentKey, convId)
          const latestPersisted = persisted.at(-1)
          if (latestPersisted?.role === 'assistant' && latestPersisted.content.trim().length > 0) {
            setMessages(mapPublicMessages(convId, persisted))
            return true
          }
        } catch {
          return false
        }
        return false
      }

      try {
        await sendPublicMessageStream(
          userSlug,
          agentKey,
          { visitor_id: visitorId, conversation_id: convId, content: trimmedContent },
          (event) => {
            const type = event.type as string

            switch (type) {
              case 'message_start': {
                if (typeof event.message_id === 'string') {
                  const mid = event.message_id as string
                  setMessages((prev) =>
                    prev.map((m) => (m.id === placeholderAssistantId ? { ...m, id: mid } : m)),
                  )
                  activeAssistantId = mid
                }
                break
              }

              case 'status': {
                const phase = (event.phase as string) ?? 'thinking'
                const mapped =
                  phase === 'streaming'
                    ? 'streaming'
                    : phase === 'executing'
                      ? 'executing'
                      : 'thinking'
                setAgentPhase(mapped)
                const msg =
                  typeof event.message === 'string' && event.message.trim().length > 0
                    ? event.message.trim()
                    : null
                setAgentStatusMessage(msg)
                break
              }

              case 'tool_start': {
                const name = (event.name as string) ?? 'tool'
                const label = (event.label as string) ?? 'Working...'
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                const block: MessageContentBlock = {
                  type: 'tool',
                  id: `tool-${name}-${Date.now()}`,
                  name,
                  label,
                  action: event.action as string | undefined,
                  toolCallId,
                  state: 'active',
                  startedAt: Date.now(),
                }
                lastTextBlockId = null
                orderedBlocks = [...orderedBlocks, block]
                updateAssistant({
                  metadata: { content_blocks_ordered: orderedBlocks },
                })
                setAgentPhase('executing')
                break
              }

              case 'tool_end': {
                const name = (event.name as string) ?? 'tool'
                const status =
                  ((event.status as string) ?? 'completed') === 'completed' ? 'completed' : 'failed'
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                orderedBlocks = orderedBlocks.map((b) => {
                  if (b.type !== 'tool') return b
                  const match = toolCallId
                    ? b.toolCallId === toolCallId
                    : b.name === name && b.state === 'active'
                  if (!match) return b
                  return {
                    ...b,
                    label: (event.label as string) ?? b.label,
                    state: status === 'completed' ? ('complete' as const) : ('failed' as const),
                    endedAt: Date.now(),
                  }
                })
                updateAssistant({
                  metadata: { content_blocks_ordered: orderedBlocks },
                })
                const hasActive = orderedBlocks.some(
                  (b) => b.type === 'tool' && b.state === 'active',
                )
                if (!hasActive) setAgentPhase('streaming')
                break
              }

              case 'thinking_delta': {
                break
              }

              case 'content_delta': {
                if (typeof event.content === 'string') {
                  assistantContent += event.content
                  setAgentPhase('streaming')

                  if (lastTextBlockId) {
                    orderedBlocks = orderedBlocks.map((b) =>
                      b.type === 'text' && b.id === lastTextBlockId
                        ? { ...b, content: assistantContent }
                        : b,
                    )
                  } else {
                    lastTextBlockId = `text-${Date.now()}`
                    orderedBlocks = [
                      ...orderedBlocks,
                      { type: 'text', id: lastTextBlockId, content: assistantContent },
                    ]
                  }

                  updateAssistant({
                    content: assistantContent,
                    metadata: { content_blocks_ordered: orderedBlocks },
                  })
                }
                break
              }

              case 'ui_block': {
                if (event.block && typeof event.block === 'object') {
                  const block = event.block as MessageContentBlock
                  if (!block.id) (block as Record<string, unknown>).id = `ui-${Date.now()}`
                  lastTextBlockId = null
                  orderedBlocks = [...orderedBlocks, block]
                  updateAssistant({
                    metadata: { content_blocks_ordered: orderedBlocks },
                  })
                }
                break
              }

              case 'done': {
                if (typeof event.id === 'string') {
                  const finalId = event.id as string
                  setMessages((prev) => {
                    const rowId = resolveAssistantRowId(prev)
                    return prev.map((m) => (m.id === rowId ? { ...m, id: finalId } : m))
                  })
                  activeAssistantId = finalId
                }
                break
              }

              case 'error': {
                setError(resolvePublicAgentStreamErrorMessage(event))
                break
              }

              default:
                break
            }
          },
          controller.signal,
        )
        if (!controller.signal.aborted && assistantContent.trim().length === 0) {
          await recoverPersistedAssistant()
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const recovered = await recoverPersistedAssistant()
          if (!recovered) setError(resolvePublicAgentStreamErrorMessage({ code: 'generic' }))
        }
      } finally {
        resetSendState()
      }
    },
    [agentKey, getVisitorId, prepareConversationForSend, userSlug],
  )

  const loadExistingMessages = useCallback(
    async (convId: string) => {
      adoptConversation(convId)
      const msgs = await fetchPublicMessages(userSlug, agentKey, convId)
      setMessages(mapPublicMessages(convId, msgs))
    },
    [adoptConversation, userSlug, agentKey],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    conversationId,
    preparationStatus,
    isPreparingContext,
    isStreaming,
    agentPhase,
    agentStatusMessage,
    error,
    sendMessage,
    stopStreaming,
    loadExistingMessages,
    ensureConversation,
    prepareConversation,
    prewarmConversation,
    getVisitorId,
    saveVisitorIdentity,
  }
}
