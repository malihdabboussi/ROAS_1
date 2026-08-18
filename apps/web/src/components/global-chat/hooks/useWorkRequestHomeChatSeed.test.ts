import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWorkRequestReviewChat } from '@/lib/work-requests'
import { useWorkRequestHomeChatSeed } from './useWorkRequestHomeChatSeed'

const mocks = vi.hoisted(() => ({
  conv: 'd407a9a4-92ca-42eb-9cd7-2bddee6da3e1',
  wr: 'aseJrZz1ZQeZs9sBv0Adc-AJBg5IcliECGOIO9A5xZc',
  cachedCount: 0,
  setMessages: vi.fn(),
  setActiveConversationId: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'conv' ? mocks.conv : key === 'wr' ? mocks.wr : null),
  }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: Object.assign(
    (selector: (state: { messagesByConversation: Record<string, unknown[]> }) => unknown) =>
      selector({
        messagesByConversation: mocks.cachedCount
          ? { [mocks.conv]: new Array(mocks.cachedCount) }
          : {},
      }),
    {
      getState: () => ({
        messagesByConversation: mocks.cachedCount
          ? { [mocks.conv]: new Array(mocks.cachedCount) }
          : {},
        setMessages: mocks.setMessages,
        setActiveConversationId: mocks.setActiveConversationId,
      }),
    },
  ),
}))

vi.mock('@/lib/work-requests', () => ({
  fetchWorkRequestReviewChat: vi.fn(),
  mapWorkRequestReviewChatMessages: (
    conversationId: string,
    rows: Array<{ id: string; role: string; content: string | null; created_at: string }>,
  ) =>
    rows.map((row) => ({
      id: row.id,
      conversation_id: conversationId,
      role: row.role,
      content: row.content,
      created_at: row.created_at,
    })),
}))

describe('useWorkRequestHomeChatSeed', () => {
  beforeEach(() => {
    mocks.cachedCount = 0
    mocks.setMessages.mockReset()
    mocks.setActiveConversationId.mockReset()
    vi.mocked(fetchWorkRequestReviewChat).mockReset()
  })

  it('seeds the signed-in home chat from the review token when the pane is empty', async () => {
    vi.mocked(fetchWorkRequestReviewChat).mockResolvedValue({
      conversation_id: mocks.conv,
      messages: [
        {
          id: 'm1',
          conversation_id: mocks.conv,
          role: 'assistant',
          content: 'Review and finalize it here: https://app.roas.io/request-review/token',
          metadata: {},
          created_at: '2026-08-17T00:00:00.000Z',
        },
      ],
    })

    renderHook(() => useWorkRequestHomeChatSeed())

    await waitFor(() => expect(mocks.setMessages).toHaveBeenCalled())
    expect(mocks.setActiveConversationId).toHaveBeenCalledWith(mocks.conv)
    expect(mocks.setMessages.mock.calls[0]?.[0]).toBe(mocks.conv)
    expect(mocks.setMessages.mock.calls[0]?.[1]).toHaveLength(1)
  })

  it('does not refetch when the conversation already has messages', async () => {
    mocks.cachedCount = 2
    renderHook(() => useWorkRequestHomeChatSeed())
    await waitFor(() => expect(fetchWorkRequestReviewChat).not.toHaveBeenCalled())
  })
})
