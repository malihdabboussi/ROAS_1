'use client'

import {
  needsGeneratedConversationTitle,
  resolveGeneratedConversationTitle,
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

function isSlackConversation(
  conversation: { metadata?: Record<string, unknown> | null } | undefined,
): boolean {
  return conversation?.metadata?.source === 'slack'
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
      const existing = useChatStore.getState().conversations.find((c) => c.id === conversationId)
      const title = isSlackConversation(existing)
        ? resolveGeneratedConversationTitle(res.title, 60)
        : resolveSuggestedConversationTitle(res.title, trimmed, 60)
      if (!title) return
      await renameConversation(conversationId, title)
      useChatStore.getState().updateConversation(conversationId, {
        title,
        updated_at: new Date().toISOString(),
      })
    })
    .catch(async () => {
      const existing = useChatStore.getState().conversations.find((c) => c.id === conversationId)
      if (isSlackConversation(existing)) return
      if (existing && !needsGeneratedConversationTitle(existing.title, trimmed)) return
      const title = resolveSuggestedConversationTitle(null, trimmed, 60)
      if (!title) return
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

      const firstUser = messages.find((message) => message.role === 'user')
      const content = typeof firstUser?.content === 'string' ? firstUser.content : ''
      const existing = conversations.find((row) => row.id === conversationId)
      if (existing && !needsGeneratedConversationTitle(existing.title, content)) continue
      if (content.trim()) scheduleConversationTitleSuggestion(conversationId, content)
    }
  }

  sync()
  useChatStore.subscribe(sync)
}
