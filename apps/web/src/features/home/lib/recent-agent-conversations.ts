import type { Conversation } from '@/lib/conversations/conversation.types'

export const INITIAL_RECENT_CONVERSATION_ROWS = 10
export const LOAD_MORE_RECENT_CONVERSATION_ROWS = 10

const SOFT_HIDE_STORAGE_KEY = 'vibey-home-recent-conv-soft-hide'

export function readSoftHiddenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(SOFT_HIDE_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function writeSoftHiddenIds(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(SOFT_HIDE_STORAGE_KEY, JSON.stringify([...ids]))
}

export function isPinnedConversation(conversation: Conversation): boolean {
  const metadata = conversation.metadata
  if (!metadata || typeof metadata !== 'object') return false
  return (metadata as { pinned?: unknown }).pinned === true
}

export function isArchivedConversation(conversation: Conversation): boolean {
  return conversation.status === 'archived'
}

export function hasConversationLevel(
  conversation: Conversation | null,
  required: 'view' | 'edit' | 'admin',
): boolean {
  if (!conversation) return false
  const weight = { view: 1, edit: 2, admin: 3 } as const
  const level = conversation.effective_level ?? 'admin'
  return weight[level] >= weight[required]
}

export function conversationHref(conversation: Conversation): string {
  const agentKey = conversation.agent_id?.trim() || 'vibey'
  const params = new URLSearchParams()
  params.set('agent', agentKey)
  params.set('tab', 'chat')
  params.set('conv', conversation.id)
  return `/team?${params.toString()}`
}
