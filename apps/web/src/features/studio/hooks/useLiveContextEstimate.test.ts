import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContextBreakdown } from '@vibey/context-breakdown'
import type { Message } from '../types'

const counterMocks = vi.hoisted(() => ({
  countMessagesTokens: vi.fn(() => 12),
}))

vi.mock('../utils/context-token-counter', async () => {
  const actual =
    await vi.importActual<typeof import('../utils/context-token-counter')>(
      '../utils/context-token-counter',
    )
  return {
    ...actual,
    countMessagesTokens: counterMocks.countMessagesTokens,
  }
})

import { useLiveContextEstimate } from './useLiveContextEstimate'

function message(content: string): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'user',
    content,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-08T00:00:00.000Z',
  }
}

describe('useLiveContextEstimate', () => {
  beforeEach(() => {
    counterMocks.countMessagesTokens.mockClear()
    counterMocks.countMessagesTokens.mockReturnValue(12)
  })

  it('preserves the backend conversation slice when local rendered messages are lower', () => {
    const baseline: ContextBreakdown = {
      version: 1,
      source: 'run',
      generatedAt: 1,
      contextWindow: 1_000_000,
      totalTokens: 150,
      slices: [
        { id: 'system', label: 'System', tokens: 50 },
        { id: 'conversation', label: 'Conversation', tokens: 100 },
      ],
    }

    const { result } = renderHook(() =>
      useLiveContextEstimate({
        baseline,
        fallbackContextWindow: 1_000_000,
        fallbackInputTokens: null,
        messages: [message('short')],
        draftText: '',
      }),
    )

    expect(result.current?.totalTokens).toBe(150)
    expect(result.current?.slices.find((slice) => slice.id === 'conversation')?.tokens).toBe(100)
  })

  it('uses fallback input tokens before a backend baseline exists', () => {
    const { result } = renderHook(() =>
      useLiveContextEstimate({
        baseline: null,
        fallbackContextWindow: 1_000_000,
        fallbackInputTokens: 123,
        messages: [message('short')],
        draftText: '',
      }),
    )

    expect(result.current?.totalTokens).toBe(123)
    expect(result.current?.slices.find((slice) => slice.id === 'conversation')?.tokens).toBe(123)
  })

  it('does not recount the full conversation when only the draft changes', () => {
    const messages = [message('short')]
    const { rerender } = renderHook(
      ({ draftText }: { draftText: string }) =>
        useLiveContextEstimate({
          baseline: null,
          fallbackContextWindow: 1_000_000,
          fallbackInputTokens: null,
          messages,
          draftText,
        }),
      { initialProps: { draftText: 'h' } },
    )

    expect(counterMocks.countMessagesTokens).toHaveBeenCalledTimes(1)

    rerender({ draftText: 'hello' })

    expect(counterMocks.countMessagesTokens).toHaveBeenCalledTimes(1)
  })

  it('does not recount the full conversation when message arrays are cloned without content changes', () => {
    const originalMessage = message('short')
    const { rerender } = renderHook(
      ({ messages }: { messages: Message[] }) =>
        useLiveContextEstimate({
          baseline: null,
          fallbackContextWindow: 1_000_000,
          fallbackInputTokens: null,
          messages,
          draftText: '',
        }),
      { initialProps: { messages: [originalMessage] } },
    )

    expect(counterMocks.countMessagesTokens).toHaveBeenCalledTimes(1)

    rerender({ messages: [{ ...originalMessage }] })

    expect(counterMocks.countMessagesTokens).toHaveBeenCalledTimes(1)
  })
})
