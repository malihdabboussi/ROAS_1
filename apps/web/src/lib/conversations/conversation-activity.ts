import type { ConversationStatus } from './conversation.types'
import { isMeetingConversation } from './conversation-title'

export type ConversationActivity = 'needs_action' | 'working' | 'unread' | 'idle'

/** Slack, Telegram, and meeting rows own a leading identity mark. */
export function conversationHasIdentityIcon(conversation: {
  metadata?: Record<string, unknown> | null
}): boolean {
  const source = conversation.metadata?.source
  if (source === 'slack' || source === 'telegram') return true
  return isMeetingConversation(conversation)
}

export function resolveConversationActivity({
  status = 'active',
  needsAction = false,
  isRunning = false,
  isUnread = false,
}: {
  status?: ConversationStatus
  needsAction?: boolean
  isRunning?: boolean
  isUnread?: boolean
}): ConversationActivity {
  if (status === 'archived' || status === 'deleted') return 'idle'
  if (needsAction) return 'needs_action'
  if (isRunning) return 'working'
  if (isUnread) return 'unread'
  return 'idle'
}
