import { resolveAgentModelDisplay } from '@/lib/agents/model-strategies'
import type { ChatRenderMessage } from './chat-render-message'

export type ChatTurnChangeDividerItem = {
  kind: 'model'
  label: string
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getMessageModelId(message: ChatRenderMessage): string | null {
  return (
    readString(message.model_id) ??
    readString(message.metadata?.model_id) ??
    readString(message.metadata?.model)
  )
}

export function resolveChatModelLabel(
  modelId: string,
  modelOptions?: ReadonlyArray<{ id: string; label: string }>,
): string {
  return resolveAgentModelDisplay(modelId, modelOptions).label
}

export function buildChatTurnChangeDividerItems(params: {
  previousUserMessage?: ChatRenderMessage | null
  userMessage: ChatRenderMessage
  modelOptions?: ReadonlyArray<{ id: string; label: string }>
}): ChatTurnChangeDividerItem[] {
  const { previousUserMessage, userMessage, modelOptions } = params
  if (!previousUserMessage) return []

  const items: ChatTurnChangeDividerItem[] = []
  const previousModelId = getMessageModelId(previousUserMessage)
  const currentModelId = getMessageModelId(userMessage)
  if (previousModelId && currentModelId && previousModelId !== currentModelId) {
    items.push({
      kind: 'model',
      label: `Changed model to ${resolveChatModelLabel(currentModelId, modelOptions)}`,
    })
  }

  return items
}
