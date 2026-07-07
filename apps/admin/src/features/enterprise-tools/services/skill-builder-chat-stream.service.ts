'use client'

import { createClient } from '@/lib/supabase/client'
import { stripEmoji } from '@web/lib/utils/text'
import {
  endToolInTimeline,
  progressToolInTimeline,
  startToolInTimeline,
  upsertGenerationInTimeline,
  useChatStore,
} from '@web/features/studio/store/use-chat-store'
import type { DocumentAttachment, Message } from '@web/features/studio/types'
import { fetchSkillBuilderMessages } from './skill-builder.service'
import type { SkillBuilderMessage } from '../types/skill-builder.types'

function isRealAgentStreamEvent(type: string): boolean {
  return (
    type === 'message_start' ||
    type === 'tool_start' ||
    type === 'tool_update' ||
    type === 'tool_content_preview' ||
    type === 'tool_end' ||
    type === 'generation_start' ||
    type === 'generation_end' ||
    type === 'ui_block' ||
    type === 'a2a_message' ||
    type === 'thinking_delta' ||
    type === 'content_delta' ||
    type === 'done'
  )
}

function shouldMarkConversationInterruptedForStreamError(hasRealAgentEventStarted: boolean): boolean {
  return hasRealAgentEventStarted
}

function mergeMessagesPreservingOrderedBlocks(localMessages: Message[], backendMessages: Message[]): Message[] {
  const backendById = new Map(backendMessages.map((m) => [m.id, m]))
  return localMessages.map((local) => {
    const backend = backendById.get(local.id)
    if (!backend) return local
    const localMeta = (local.metadata ?? {}) as Record<string, unknown>
    const backendMeta = (backend.metadata ?? {}) as Record<string, unknown>
    const localBlocks = (localMeta.content_blocks_ordered as unknown[] | undefined) ?? []
    const backendBlocks = (backendMeta.content_blocks_ordered as unknown[] | undefined) ?? []
    if (localBlocks.length >= backendBlocks.length) {
      return {
        ...backend,
        content: local.content || backend.content,
        metadata: { ...backendMeta, ...localMeta, content_blocks_ordered: localBlocks },
      } as Message
    }
    return backend
  })
}

function normalizeUiBlock(block: unknown): Record<string, unknown> | null {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null
  const record = block as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type.trim() : ''
  if (!type) return null
  return {
    ...record,
    type,
    id:
      typeof record.id === 'string' && record.id.trim().length > 0 ? record.id : `ui-${Date.now()}`,
  }
}

const activeControllers = new Map<string, AbortController>()

function formatAdminErrorBody(status: number, text: string): string {
  const raw = text.trim()
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { message?: string | string[] }
      if (typeof j.message === 'string' && j.message.length > 0) return j.message
      if (Array.isArray(j.message) && j.message.length > 0) return j.message.join(', ')
    } catch {
      /* use raw */
    }
  }
  return raw || `Request failed: ${status}`
}

export function toStudioMessage(msg: SkillBuilderMessage, sessionId: string): Message {
  const metadata: Record<string, unknown> = {}
  const blocks = Array.isArray(msg.content_blocks) ? msg.content_blocks : []
  const attachmentBlock = blocks.find(
    (b) =>
      b &&
      typeof b === 'object' &&
      (b as Record<string, unknown>).type === 'document_attachments',
  ) as { documents?: DocumentAttachment[] } | undefined

  if (attachmentBlock?.documents?.length) {
    metadata.documents = attachmentBlock.documents
  }

  const orderedBlocks = blocks.filter(
    (b) =>
      b &&
      typeof b === 'object' &&
      (b as Record<string, unknown>).type !== 'document_attachments',
  )
  if (orderedBlocks.length > 0) {
    metadata.content_blocks_ordered = orderedBlocks
  }

  return {
    id: msg.id,
    conversation_id: sessionId,
    role: msg.role,
    content: msg.content,
    content_blocks: null,
    metadata,
    created_at: msg.created_at,
  }
}

export function hydrateSkillBuilderMessages(
  sessionId: string,
  messages: SkillBuilderMessage[],
): Message[] {
  return messages.filter((m) => m.role !== 'system').map((m) => toStudioMessage(m, sessionId))
}

export function abortSkillBuilderStream(sessionId: string): void {
  activeControllers.get(sessionId)?.abort()
}

export async function sendSkillBuilderMessageStreaming(input: {
  sessionId: string
  content: string
  documents?: DocumentAttachment[]
}): Promise<void> {
  const { sessionId, content, documents } = input
  const store = useChatStore.getState()

  abortSkillBuilderStream(sessionId)
  const controller = new AbortController()
  activeControllers.set(sessionId, controller)

  const userMsgId = crypto.randomUUID()
  const userMsg: Message = {
    id: userMsgId,
    conversation_id: sessionId,
    role: 'user',
    content,
    content_blocks: null,
    metadata: documents?.length ? { documents } : {},
    created_at: new Date().toISOString(),
  }
  store.addMessage(sessionId, userMsg)

  const tempId = `temp-${Date.now()}`
  const assistantMsg: Message = {
    id: tempId,
    conversation_id: sessionId,
    role: 'assistant',
    content: '',
    content_blocks: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }
  store.addMessage(sessionId, assistantMsg)

  store.setConversationStreamingMessageId(sessionId, tempId)
  store.setConversationStreaming(sessionId, true)
  store.setConversationReconnecting(sessionId, false)
  store.setConversationInterrupted(sessionId, false)
  store.setIsStreaming(true)
  store.setInlineError(null)
  store.updateConversationStreamUI(sessionId, () => ({
    agentPhase: 'thinking',
    flowTimeline: [],
    agentStatusMessage: null,
    activeTools: [],
    imageGeneratedEvents: [],
    statusMessages: [],
  }))

  let finalMessageId: string | null = null
  let sawRealAgentEvent = false
  let sawDoneEvent = false
  let persistedMessageId = tempId

  const finalizeStreamState = () => {
    activeControllers.delete(sessionId)
    store.finalizeStreamWithMessages(sessionId, null, activeControllers.size > 0, false)
  }

  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const res = await fetch(
      `/api/proxy/admin/enterprise/skill-builder/sessions/${sessionId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          content,
          ...(documents?.length ? { documents } : {}),
        }),
        signal: controller.signal,
      },
    )

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(formatAdminErrorBody(res.status, text))
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!(line.startsWith('data: ') || line.startsWith('data:'))) continue
        const data = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const event = JSON.parse(data) as Record<string, unknown>
          const type = event.type as string
          if (isRealAgentStreamEvent(type)) sawRealAgentEvent = true

          switch (type) {
            case 'message_start':
              if (event.message_id) finalMessageId = event.message_id as string
              break
            case 'status': {
              const phase = (event.phase as string) ?? 'thinking'
              const message =
                typeof event.message === 'string' && event.message.trim().length > 0
                  ? event.message.trim()
                  : null
              const mapped =
                phase === 'streaming'
                  ? 'streaming'
                  : phase === 'executing'
                    ? 'executing'
                    : 'thinking'
              if (mapped !== 'thinking') {
                store.completeThinkingTranscriptInOrderedBlocks(sessionId, tempId)
              }
              store.updateConversationStreamUI(sessionId, () => ({
                agentPhase: mapped as 'streaming' | 'executing' | 'thinking',
                ...(message !== null
                  ? { agentStatusMessage: message }
                  : mapped === 'executing'
                    ? { agentStatusMessage: null }
                    : {}),
              }))
              break
            }
            case 'tool_start': {
              const name = (event.name as string) ?? 'tool'
              const label = stripEmoji((event.label as string) ?? 'Working...')
              const action = event.action as string | undefined
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              const ts = Date.now()
              store.updateConversationStreamUI(sessionId, (ui) => ({
                agentPhase: 'executing',
                agentStatusMessage: null,
                activeTools: [...ui.activeTools, { name, label, toolCallId }],
                flowTimeline: startToolInTimeline(
                  ui.flowTimeline,
                  name,
                  label,
                  action,
                  ts,
                  toolCallId,
                ),
              }))
              store.pushToolToOrderedBlocks(sessionId, tempId, {
                name,
                label,
                ...(action ? { action } : {}),
                ...(toolCallId ? { toolCallId } : {}),
                state: 'active',
                startedAt: ts,
              })
              break
            }
            case 'tool_update': {
              const name = (event.name as string) ?? 'tool'
              const detail = stripEmoji((event.detail as string) ?? '').trim()
              if (!detail) break
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              const ts = Date.now()
              store.updateConversationStreamUI(sessionId, (ui) => ({
                agentPhase: 'executing',
                flowTimeline: progressToolInTimeline(
                  ui.flowTimeline,
                  name,
                  detail,
                  ts,
                  toolCallId,
                ),
              }))
              store.appendToolProgressToOrderedBlocks(
                sessionId,
                tempId,
                name,
                detail,
                ts,
                toolCallId,
              )
              break
            }
            case 'tool_content_preview': {
              const name = (event.name as string) ?? ''
              const previewContent = (event.content as string) ?? ''
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              if (previewContent) {
                store.setToolContentPreview(sessionId, tempId, name, previewContent, toolCallId)
              }
              break
            }
            case 'tool_end': {
              const name = (event.name as string) ?? 'tool'
              const label = stripEmoji((event.label as string) ?? 'Done')
              const status =
                ((event.status as string) ?? 'completed') === 'completed' ? 'completed' : 'failed'
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              const ts = Date.now()
              store.updateConversationStreamUI(sessionId, (ui) => {
                const remaining = ui.activeTools.filter((t) =>
                  toolCallId ? t.toolCallId !== toolCallId : t.name !== name,
                )
                return {
                  agentPhase: remaining.length > 0 ? 'executing' : 'thinking',
                  agentStatusMessage: remaining.length > 0 ? label : null,
                  activeTools: remaining,
                  statusMessages: [...ui.statusMessages, label],
                  flowTimeline: endToolInTimeline(
                    ui.flowTimeline,
                    name,
                    label,
                    status,
                    ts,
                    toolCallId,
                  ),
                }
              })
              store.updateToolBlockByName(sessionId, tempId, name, status, ts, toolCallId)
              break
            }
            case 'generation_start': {
              const label = typeof event.label === 'string' ? event.label.trim() : ''
              if (label) {
                store.updateConversationStreamUI(sessionId, (ui) => ({
                  flowTimeline: upsertGenerationInTimeline(
                    ui.flowTimeline,
                    'streaming',
                    label,
                    Date.now(),
                  ),
                }))
                store.pushGenerationStartToOrderedBlocks(sessionId, tempId, {
                  label,
                  timestamp: Date.now(),
                })
              }
              break
            }
            case 'generation_end': {
              const label = typeof event.label === 'string' ? event.label.trim() : ''
              store.updateConversationStreamUI(sessionId, (ui) => ({
                flowTimeline: upsertGenerationInTimeline(
                  ui.flowTimeline,
                  'completed',
                  label || 'Completed',
                  Date.now(),
                ),
              }))
              store.completeGenerationInOrderedBlocks(sessionId, tempId, Date.now())
              break
            }
            case 'ui_block': {
              const block = normalizeUiBlock(event.block)
              if (block) store.appendUiBlockToOrderedBlocks(sessionId, tempId, block)
              break
            }
            case 'thinking_delta': {
              const text = (event.text as string) ?? ''
              if (text) store.upsertThinkingTranscriptInOrderedBlocks(sessionId, tempId, text)
              break
            }
            case 'content_delta':
              if (event.content) {
                const delta = stripEmoji(event.content as string, { preserveFormatting: true })
                store.updateConversationStreamUI(sessionId, () => ({ agentPhase: 'streaming' }))
                store.appendToMessage(sessionId, tempId, delta)
                store.appendTextToOrderedBlocks(sessionId, tempId, delta)
              }
              break
            case 'error':
              throw new Error(
                (event.message as string) ?? (event.error as string) ?? 'Stream error',
              )
            case 'done': {
              sawDoneEvent = true
              const durationMs = event.duration_ms as number | undefined
              if (durationMs != null) {
                const msgs = store.messagesByConversation[sessionId] ?? []
                const assistant = msgs.find((m) => m.id === tempId)
                if (assistant) {
                  store.updateMessage(sessionId, assistant.id, {
                    metadata: { ...assistant.metadata, duration_ms: durationMs },
                  })
                }
              }
              store.setConversationInterrupted(sessionId, false)
              break
            }
            default:
              break
          }
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) continue
          throw parseErr
        }
      }
    }

    if (!sawDoneEvent && !controller.signal.aborted) {
      if (!sawRealAgentEvent) throw new Error('__MACHINE_WARMUP_INTERRUPTED__')
      throw new Error('__STREAM_INTERRUPTED__')
    }

    if (finalMessageId) {
      store.updateMessage(sessionId, tempId, { id: finalMessageId })
      store.setConversationStreamingMessageId(sessionId, finalMessageId)
      persistedMessageId = finalMessageId
    }

    try {
      const localMessages = store.messagesByConversation[sessionId] ?? []
      const backend = await fetchSkillBuilderMessages(sessionId)
      const backendMessages = hydrateSkillBuilderMessages(sessionId, backend.messages)
      const merged = mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages)
      store.setMessages(sessionId, merged)
    } catch {
      // keep streamed content
    }

    finalizeStreamState()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    if (
      err instanceof Error &&
      (err.message === '__MACHINE_WARMUP_INTERRUPTED__' ||
        !shouldMarkConversationInterruptedForStreamError(sawRealAgentEvent))
    ) {
      store.setConversationInterrupted(sessionId, false)
      finalizeStreamState()
      throw err
    }
    store.updateMessage(sessionId, persistedMessageId, {
      content: '',
      metadata: { error: err instanceof Error ? err.message : 'Chat failed' },
    })
    store.setConversationInterrupted(sessionId, true)
    finalizeStreamState()
    throw err
  }
}
