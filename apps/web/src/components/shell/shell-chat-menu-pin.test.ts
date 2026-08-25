import { describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/conversations'
import {
  mergeConversationsWithStore,
  mergeStoreConversationRow,
  persistConversationPinned,
} from './shell-chat-menu-pin'

const mocks = vi.hoisted(() => ({
  updateConversation: vi.fn(),
  setConversationPinned: vi.fn(),
  invalidateCachedFetch: vi.fn(),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: {
    getState: () => ({ updateConversation: mocks.updateConversation }),
  },
}))

vi.mock('@/lib/conversations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/conversations')>('@/lib/conversations')
  return {
    ...actual,
    setConversationPinned: mocks.setConversationPinned,
  }
})

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  invalidateCachedFetch: mocks.invalidateCachedFetch,
}))

function conversation(overrides: Partial<Conversation> & { id: string }): Conversation {
  return {
    user_id: 'user-1',
    campaign_id: null,
    title: 'Strategy',
    agent_id: 'vibey',
    status: 'active',
    metadata: { source: 'slack' },
    created_at: '2026-08-14T12:00:00.000Z',
    updated_at: '2026-08-14T12:00:00.000Z',
    ...overrides,
    id: overrides.id,
  }
}

describe('shell chat menu pin', () => {
  const clientScope = {
    clientId: 'client-1',
    clientName: 'Acme',
    campaignId: 'campaign-1',
    spaceIds: ['space-1', 'space-2'],
  }

  it('keeps local pin metadata when the live store row omits it', () => {
    const merged = mergeStoreConversationRow(
      conversation({ id: 'c1', metadata: { source: 'slack', pinned: true } }),
      conversation({ id: 'c1', metadata: { source: 'slack' } }),
    )
    expect(merged.metadata).toMatchObject({ source: 'slack', pinned: true })
  })

  it('returns the same row reference when the store row adds nothing new', () => {
    const current = conversation({ id: 'c1', metadata: { source: 'slack', pinned: true } })
    const merged = mergeStoreConversationRow(
      current,
      conversation({ id: 'c1', metadata: { source: 'slack', pinned: true } }),
    )
    expect(merged).toBe(current)
  })

  it('skips rebuilding the chat list when store rows are unchanged', () => {
    const current = conversation({ id: 'c1', metadata: { source: 'slack', pinned: true } })
    const prev = [current]
    const next = mergeConversationsWithStore(
      prev,
      [conversation({ id: 'c1', metadata: { source: 'slack', pinned: true } })],
      null,
    )
    expect(next).toBe(prev)
  })

  it('merges only conversations associated with the selected client', () => {
    const current = conversation({ id: 'c1', campaign_id: 'campaign-1' })
    const prev = [current]
    const next = mergeConversationsWithStore(
      prev,
      [
        conversation({ id: 'c2', campaign_id: 'campaign-2' }),
        conversation({ id: 'c3', campaign_id: null, metadata: { space_id: 'space-2' } }),
      ],
      null,
      clientScope,
    )

    expect(next.map((row) => row.id)).toEqual(['c3', 'c1'])
  })

  it('pins immediately and keeps the flag from the persisted conversation', async () => {
    const current = conversation({ id: 'c1' })
    const rows = [current]
    const setConversations = vi.fn((updater: (prev: Conversation[]) => Conversation[]) => {
      rows.splice(0, rows.length, ...updater(rows))
    })
    mocks.setConversationPinned.mockResolvedValue(
      conversation({ id: 'c1', metadata: { source: 'slack', pinned: true } }),
    )

    await persistConversationPinned({
      conversationId: 'c1',
      pinned: true,
      current,
      setConversations,
    })

    expect(rows[0]?.metadata).toMatchObject({ source: 'slack', pinned: true })
    expect(mocks.setConversationPinned).toHaveBeenCalledWith('c1', true)
    expect(mocks.invalidateCachedFetch).toHaveBeenCalledWith('shell-conversations:')
  })
})
