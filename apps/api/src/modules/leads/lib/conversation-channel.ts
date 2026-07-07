export type ConversationChannel = 'widget' | 'telegram' | 'app'

/** Classifies a conversation's origin channel from its metadata. */
export function deriveConversationChannel(metadata: unknown): ConversationChannel {
  if (!metadata || typeof metadata !== 'object') return 'app'
  const meta = metadata as Record<string, unknown>
  if (meta.telegram_chat_id || meta.source === 'telegram') return 'telegram'
  if (meta.public === true) return 'widget'
  return 'app'
}
