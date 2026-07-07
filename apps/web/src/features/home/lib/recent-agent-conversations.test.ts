import { describe, expect, it } from 'vitest'
import {
  conversationHref,
  hasConversationLevel,
  isArchivedConversation,
  isPinnedConversation,
} from './recent-agent-conversations'
import type { Conversation } from '@/lib/conversations/conversation.types'

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: 'conversation-1',
    user_id: 'user-1',
    campaign_id: null,
    title: null,
    agent_id: null,
    status: 'active',
    metadata: {},
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('recent agent conversations helpers', () => {
  it('reads pin and archive state from conversation fields', () => {
    expect(isPinnedConversation(conversation({ metadata: { pinned: true } }))).toBe(true)
    expect(isPinnedConversation(conversation({ metadata: { pinned: false } }))).toBe(false)
    expect(isArchivedConversation(conversation({ status: 'archived' }))).toBe(true)
  })

  it('checks effective share level with admin as the default', () => {
    expect(hasConversationLevel(conversation({ effective_level: 'view' }), 'edit')).toBe(false)
    expect(hasConversationLevel(conversation({ effective_level: 'edit' }), 'view')).toBe(true)
    expect(hasConversationLevel(conversation({ effective_level: null }), 'admin')).toBe(true)
  })

  it('builds team conversation links with a vibey fallback agent', () => {
    expect(conversationHref(conversation({ id: 'c-1', agent_id: 'atlas' }))).toBe(
      '/team?agent=atlas&tab=chat&conv=c-1',
    )
    expect(conversationHref(conversation({ id: 'c-2', agent_id: null }))).toBe(
      '/team?agent=vibey&tab=chat&conv=c-2',
    )
  })
})
