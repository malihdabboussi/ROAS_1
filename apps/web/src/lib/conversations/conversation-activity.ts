import type { ConversationStatus } from './conversation.types'

export type ConversationActivity = 'needs_action' | 'working' | 'unread' | 'idle'

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
