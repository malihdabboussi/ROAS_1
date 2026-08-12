import { peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Conversation } from '@/lib/conversations'

export function conversationCacheKey(
  simpleSidebar: boolean,
  agentKey: string | null,
  activeOrgId: string | null,
): string {
  const scopeKey = simpleSidebar ? 'all-scopes' : (activeOrgId ?? 'personal')
  return `shell-conversations:${scopeKey}:${agentKey ?? 'all'}`
}

export function peekConversationCache(
  simpleSidebar: boolean,
  agentKey: string | null,
  activeOrgId: string | null,
): Conversation[] | undefined {
  return peekCachedFetch<Conversation[]>(
    conversationCacheKey(simpleSidebar, agentKey, activeOrgId),
  )
}
