import type { Conversation } from '../types'

/**
 * In-memory stale-while-revalidate cache for the space/channel chat
 * conversation lists, keyed by chat scope storage id (`spaceId` or
 * `channel:<channelId>`). The space chat panel remounts on every space
 * switch; this lets it paint the last known list instantly while the
 * fresh list loads in the background.
 */
const conversationsByScope = new Map<string, Conversation[]>()

export const spaceConversationsCache = {
  get(scopeStorageId: string): Conversation[] | undefined {
    return conversationsByScope.get(scopeStorageId)
  },
  set(scopeStorageId: string, conversations: Conversation[]) {
    conversationsByScope.set(scopeStorageId, conversations)
  },
}
