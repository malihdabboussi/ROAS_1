'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MessageContentBlock } from '@/lib/chat'
import type { Message } from '@/lib/conversations'
import {
  fetchWorkRequestReviewChat,
  sendWorkRequestReviewChatStream,
  type WorkRequestReviewChatMessage,
} from '@/lib/work-requests'
import { WORK_REQUEST_ERRORS } from '../config/errors.config'

export type WorkRequestReviewAgentPhase = 'idle' | 'thinking' | 'executing' | 'streaming'

function mapReviewMessages(
  conversationId: string,
  rows: WorkRequestReviewChatMessage[],
): Message[] {
  return rows.map((row) => ({
    id: row.id,
    conversation_id: conversationId,
    role: row.role as Message['role'],
    content: row.content,
    content_blocks: null,
    created_at: row.created_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }))
}

export function useWorkRequestReviewChat(token: string, enabled: boolean) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentPhase, setAgentPhase] = useState<WorkRequestReviewAgentPhase>('idle')
  const [agentStatusMessage, setAgentStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const sendInFlightRef = useRef(false)

  const loadMessages = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    setUnavailable(false)
    try {
      const payload = await fetchWorkRequestReviewChat(token)
      setConversationId(payload.conversation_id)
      setMessages(mapReviewMessages(payload.conversation_id, payload.messages))
    } catch (caught) {
      setUnavailable(true)
      setError(
        caught instanceof Error ? caught.message : WORK_REQUEST_ERRORS.LOAD_FAILED.userMessage,
      )
    } finally {
      setLoading(false)
    }
  }, [enabled, token])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    sendInFlightRef.current = false
    setIsStreaming(false)
    setAgentPhase('idle')
    setAgentStatusMessage(null)
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || !conversationId || sendInFlightRef.current) return

      sendInFlightRef.current = true
      setError(null)
      setIsStreaming(true)
      setAgentPhase('thinking')
      setAgentStatusMessage(null)

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: trimmed,
        content_blocks: null,
        created_at: new Date().toISOString(),
        metadata: {},
      }
      setMessages((prev) => [...prev, userMessage])

      const placeholderAssistantId = `assistant-${Date.now()}`
      let activeAssistantId = placeholderAssistantId
      let assistantContent = ''
      let orderedBlocks: MessageContentBlock[] = []

      setMessages((prev) => [
        ...prev,
        {
          id: placeholderAssistantId,
          conversation_id: conversationId,
          role: 'assistant',
          content: '',
          content_blocks: null,
          created_at: new Date().toISOString(),
          metadata: {},
        },
      ])

      const controller = new AbortController()
      abortRef.current = controller

      const updateAssistant = (patch: Partial<Message>) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === activeAssistantId || message.id === placeholderAssistantId
              ? { ...message, ...patch }
              : message,
          ),
        )
      }

      try {
        await sendWorkRequestReviewChatStream(
          token,
          trimmed,
          (event) => {
            const type = event.type as string
            switch (type) {
              case 'message_start': {
                if (typeof event.message_id === 'string') {
                  const mid = event.message_id
                  setMessages((prev) =>
                    prev.map((message) =>
                      message.id === placeholderAssistantId ? { ...message, id: mid } : message,
                    ),
                  )
                  activeAssistantId = mid
                }
                break
              }
              case 'status': {
                const phase = (event.phase as string) ?? 'thinking'
                setAgentPhase(
                  phase === 'streaming'
                    ? 'streaming'
                    : phase === 'executing'
                      ? 'executing'
                      : 'thinking',
                )
                setAgentStatusMessage(
                  typeof event.message === 'string' && event.message.trim()
                    ? event.message.trim()
                    : null,
                )
                break
              }
              case 'tool_start': {
                orderedBlocks = [
                  ...orderedBlocks,
                  {
                    type: 'tool',
                    id: `tool-${String(event.name ?? 'tool')}-${Date.now()}`,
                    name: (event.name as string) ?? 'tool',
                    label: (event.label as string) ?? 'Working...',
                    action: event.action as string | undefined,
                    toolCallId:
                      typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined,
                    state: 'active',
                    startedAt: Date.now(),
                  },
                ]
                updateAssistant({ metadata: { content_blocks_ordered: orderedBlocks } })
                setAgentPhase('executing')
                break
              }
              case 'tool_end': {
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                orderedBlocks = orderedBlocks.map((block) =>
                  block.type === 'tool' &&
                  (toolCallId ? block.toolCallId === toolCallId : block.state === 'active')
                    ? { ...block, state: 'complete' as const }
                    : block,
                )
                updateAssistant({ metadata: { content_blocks_ordered: orderedBlocks } })
                break
              }
              case 'content_delta': {
                const delta =
                  typeof event.content === 'string'
                    ? event.content
                    : typeof event.delta === 'string'
                      ? event.delta
                      : ''
                if (!delta) break
                assistantContent += delta
                setAgentPhase('streaming')
                updateAssistant({ content: assistantContent })
                break
              }
              case 'ui_block': {
                const block = event.block as MessageContentBlock | undefined
                if (!block) break
                orderedBlocks = [...orderedBlocks, block]
                updateAssistant({ metadata: { content_blocks_ordered: orderedBlocks } })
                break
              }
              case 'error': {
                setError(
                  typeof event.error === 'string'
                    ? event.error
                    : WORK_REQUEST_ERRORS.LOAD_FAILED.userMessage,
                )
                break
              }
              default:
                break
            }
          },
          controller.signal,
        )
        const persisted = await fetchWorkRequestReviewChat(token)
        setConversationId(persisted.conversation_id)
        setMessages(mapReviewMessages(persisted.conversation_id, persisted.messages))
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error ? caught.message : WORK_REQUEST_ERRORS.LOAD_FAILED.userMessage,
          )
        }
      } finally {
        sendInFlightRef.current = false
        abortRef.current = null
        setIsStreaming(false)
        setAgentPhase('idle')
        setAgentStatusMessage(null)
      }
    },
    [conversationId, token],
  )

  return {
    messages,
    conversationId,
    loading,
    isStreaming,
    agentPhase,
    agentStatusMessage,
    error,
    unavailable,
    sendMessage,
    stopStreaming,
    reload: loadMessages,
  }
}
