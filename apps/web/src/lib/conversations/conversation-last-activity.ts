import type { Conversation } from './conversation.types'

/**
 * History timeline / sectioning timestamp.
 * Prefer last message activity over row `updated_at` (title, pin, scope, opens).
 */
export function getConversationLastActivityAt(conversation: Conversation): string {
  const lastMessageAt = conversation.last_message_at?.trim()
  if (lastMessageAt) return lastMessageAt
  const createdAt = conversation.created_at?.trim()
  if (createdAt) return createdAt
  return conversation.updated_at
}
