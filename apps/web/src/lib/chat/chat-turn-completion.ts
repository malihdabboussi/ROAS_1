/** Minimal message shape used for assistant-turn completion checks. */
export type ChatTurnMessage = {
  id?: string
  role: string
  content?: string | null
  content_blocks?: unknown
  created_at: string
  metadata?: Record<string, unknown> | null
  conversation_id?: string
}

const RECENT_ASSISTANT_TURN_MS = 5 * 60 * 1_000

function hasLegacyContentBlocks(message: ChatTurnMessage): boolean {
  const blocks = message.content_blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return false
  return blocks.some(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      'content' in block &&
      typeof (block as { content?: unknown }).content === 'string' &&
      ((block as { content: string }).content ?? '').trim().length > 0,
  )
}

export function getLastAssistantMessage<T extends ChatTurnMessage>(messages: T[]): T | undefined {
  return [...messages].reverse().find((message) => message.role === 'assistant')
}

export function assistantHasVisibleOutput(message: ChatTurnMessage | undefined): boolean {
  if (!message || message.role !== 'assistant') return false
  const metadata = message.metadata as Record<string, unknown> | undefined
  if (metadata?.duration_ms != null) return true
  if (assistantHasRenderableText(message)) return true
  const blocks = metadata?.content_blocks_ordered
  if (Array.isArray(blocks) && blocks.length > 0) return true
  return hasLegacyContentBlocks(message)
}

export function assistantHasRenderableText(message: ChatTurnMessage | undefined): boolean {
  if (!message || message.role !== 'assistant') return false
  if (typeof message.content === 'string' && message.content.trim().length > 0) return true
  const metadata = message.metadata as Record<string, unknown> | undefined
  const blocks = metadata?.content_blocks_ordered
  if (Array.isArray(blocks)) {
    return blocks.some(
      (block) =>
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        (block as { type?: string }).type === 'text' &&
        'content' in block &&
        typeof (block as { content?: unknown }).content === 'string' &&
        ((block as { content: string }).content ?? '').trim().length > 0,
    )
  }
  return hasLegacyContentBlocks(message)
}

export function isAssistantTurnComplete(
  message: ChatTurnMessage | undefined,
  streamInactive = false,
): boolean {
  if (!assistantHasVisibleOutput(message) || !message) return false
  const metadata = message.metadata as Record<string, unknown> | undefined
  if (metadata?.duration_ms != null) return true
  return streamInactive
}

export function shouldReconnectPersistedAssistant(
  message: ChatTurnMessage | undefined,
  now = Date.now(),
): boolean {
  if (!message || message.role !== 'assistant') return false
  const metadata = message.metadata as Record<string, unknown> | undefined
  if (metadata?.duration_ms != null) return false
  if (assistantHasVisibleOutput(message)) return false
  const createdAt = new Date(message.created_at).getTime()
  if (!Number.isFinite(createdAt)) return false
  return now - createdAt <= RECENT_ASSISTANT_TURN_MS
}
