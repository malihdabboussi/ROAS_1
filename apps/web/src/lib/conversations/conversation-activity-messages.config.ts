import type { ConversationActivity } from './conversation-activity'

export const conversationActivityLabel: Record<Exclude<ConversationActivity, 'idle'>, string> = {
  needs_action: 'Needs your action',
  working: 'Working',
  unread: 'New activity',
}
