import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWorkRequestReviewChat, sendWorkRequestReviewChatStream } from '@/lib/work-requests'
import { useWorkRequestReviewChat } from './useWorkRequestReviewChat'

vi.mock('@/lib/work-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/work-requests')>('@/lib/work-requests')
  return {
    ...actual,
    fetchWorkRequestReviewChat: vi.fn(),
    sendWorkRequestReviewChatStream: vi.fn(),
  }
})

describe('useWorkRequestReviewChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads conversation messages for an active review token', async () => {
    vi.mocked(fetchWorkRequestReviewChat).mockResolvedValue({
      conversation_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      messages: [
        {
          id: 'msg-1',
          conversation_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          role: 'assistant',
          content: 'Here is your Service Request review link.',
          metadata: {},
          created_at: '2026-08-17T00:00:00.000Z',
        },
      ],
    })

    const { result } = renderHook(() => useWorkRequestReviewChat('safe-token', true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.conversationId).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'msg-1',
        content: 'Here is your Service Request review link.',
      }),
    ])
    expect(result.current.unavailable).toBe(false)
    expect(sendWorkRequestReviewChatStream).not.toHaveBeenCalled()
  })

  it('marks the chat unavailable when bootstrap fails', async () => {
    vi.mocked(fetchWorkRequestReviewChat).mockRejectedValue(new Error('missing chat'))

    const { result } = renderHook(() => useWorkRequestReviewChat('safe-token', true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.unavailable).toBe(true)
    expect(result.current.error).toBe('missing chat')
  })
})
