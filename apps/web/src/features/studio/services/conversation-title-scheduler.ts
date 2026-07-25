'use client'

import {
  needsGeneratedConversationTitle,
  resolveSuggestedConversationTitle,
} from '@/lib/conversations/conversation-title'
import { renameConversation } from '@/lib/conversations/conversations-api'
import { useChatStore } from '../store/use-chat-store'
import { suggestConversationTitle } from './chat.service'

const conversationTitleSuggestionInFlight = new Set<string>()
const userMessageCountByConversation = new Map<string, number>()
let titleAutogenInitialized = false

function isPendingConversationId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('pending-')
}

/** Fire-and-forget Gemini title for the first user turn (Claude/ChatGPT-style sidebar labels). */
export function scheduleConversationTitleSuggestion(
  conversationId: string,
  firstMessage: string,
): void {
  if (isPendingConversationId(conversationId)) return
  const trimmed = firstMessage.trim()
  if (!trimmed) return
  if (conversationTitleSuggestionInFlight.has(conversationId)) return
  conversationTitleSuggestionInFlight.add(conversationId)

  void suggestConversationTitle(trimmed)
    .then(async (res) => {
      const title = resolveSuggestedConversationTitle(res.title, trimmed, 60)
      if (!title) return
      await renameConversation(conversationId, title)
      useChatStore.getState().updateConversation(conversationId, {
        title,
        updated_at: new Date().toISOString(),
      })
    })
    .catch(async () => {
      const title = resolveSuggestedConversationTitle(null, trimmed, 60)
      if (!title) return
      const existing = useChatStore.getState().conversations.find((c) => c.id === conversationId)
      if (existing && !needsGeneratedConversationTitle(existing.title)) return
      try {
        await renameConversation(conversationId, title)
        useChatStore.getState().updateConversation(conversationId, {
          title,
          updated_at: new Date().toISOString(),
        })
      } catch {
        // Non-critical — early first-message title already covers the list row.
      }
    })
    .finally(() => {
      conversationTitleSuggestionInFlight.delete(conversationId)
    })
}

/**
 * Watch the chat store for first user messages and schedule AI titles.
 * Idempotent — safe to call from shell + studio mount paths.
 */
export function initConversationTitleAutogen(): void {
  if (typeof window === 'undefined' || titleAutogenInitialized) return
  titleAutogenInitialized = true

  const sync = () => {
    const { messagesByConversation, conversations } = useChatStore.getState()
    for (const [conversationId, messages] of Object.entries(messagesByConversation)) {
      const userCount = messages.filter((message) => message.role === 'user').length
      const previous = userMessageCountByConversation.get(conversationId) ?? 0
      userMessageCountByConversation.set(conversationId, userCount)
      if (previous > 0 || userCount < 1) continue

      const existing = conversations.find((row) => row.id === conversationId)
      if (existing && !needsGeneratedConversationTitle(existing.title)) continue

      const firstUser = messages.find((message) => message.role === 'user')
      const content = typeof firstUser?.content === 'string' ? firstUser.content : ''
      if (content.trim()) scheduleConversationTitleSuggestion(conversationId, content)
    }
  }

  sync()
  useChatStore.subscribe(sync)
}
