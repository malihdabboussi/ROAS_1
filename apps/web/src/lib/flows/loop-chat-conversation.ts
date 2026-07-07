export const LOOP_CHAT_CONVERSATION_EVENT = 'loop-chat:conversation-changed'
export const LOOP_CHAT_SELECT_CONVERSATION_EVENT = 'loop-chat:select-conversation'
export const LOOP_CHAT_OPEN_PANEL_EVENT = 'loop-chat:open-panel'
export const LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT = 'loop-chat:activate-conversation'

export type LoopChatConversationDetail = {
  spaceId: string
  conversationId: string | null
}

export type LoopChatSelectConversationDetail = {
  spaceId: string
  conversationId: string
}

export type LoopChatActivateConversationDetail = {
  spaceId: string
  conversation: {
    id: string
    user_id: string
    campaign_id: string | null
    title: string | null
    agent_id: string | null
    status: 'active' | 'archived' | 'deleted'
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
    default_model_id?: string | null
  }
}

export function dispatchLoopChatConversationChanged(detail: LoopChatConversationDetail) {
  window.dispatchEvent(new CustomEvent(LOOP_CHAT_CONVERSATION_EVENT, { detail }))
}

export function dispatchLoopChatSelectConversation(detail: LoopChatSelectConversationDetail) {
  window.dispatchEvent(new CustomEvent(LOOP_CHAT_SELECT_CONVERSATION_EVENT, { detail }))
}

export function dispatchLoopChatActivateConversation(detail: LoopChatActivateConversationDetail) {
  window.dispatchEvent(new CustomEvent(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, { detail }))
}

export function dispatchLoopChatOpenPanel() {
  window.dispatchEvent(new CustomEvent(LOOP_CHAT_OPEN_PANEL_EVENT))
}
