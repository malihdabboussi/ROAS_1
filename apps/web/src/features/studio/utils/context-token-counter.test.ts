import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../types'

const tokenMocks = vi.hoisted(() => ({
  countTextTokens: vi.fn((text: string) => text.length),
  countJsonTokens: vi.fn((value: unknown) => JSON.stringify(value).length),
}))

vi.mock('@vibey/context-breakdown', () => ({
  countTextTokens: tokenMocks.countTextTokens,
  countJsonTokens: tokenMocks.countJsonTokens,
}))

import {
  countMessagesTokens,
  getMessagesTokenSignature,
  resetContextTokenCounterCacheForTests,
} from './context-token-counter'

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'user',
    content: 'hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-23T00:00:00.000Z',
    ...overrides,
  }
}

describe('context-token-counter', () => {
  beforeEach(() => {
    resetContextTokenCounterCacheForTests()
    tokenMocks.countTextTokens.mockClear()
    tokenMocks.countJsonTokens.mockClear()
  })

  it('reuses message token counts for equivalent message objects', () => {
    const first = message()
    const clone = message()

    expect(countMessagesTokens([first])).toBe(countMessagesTokens([clone]))
    expect(tokenMocks.countTextTokens).toHaveBeenCalledTimes(1)
  })

  it('recounts when a cached message changes token-affecting content', () => {
    const first = message({ content: 'hello' })
    const changed = message({ content: 'hello world' })

    countMessagesTokens([first])
    countMessagesTokens([changed])

    expect(tokenMocks.countTextTokens).toHaveBeenCalledTimes(2)
  })

  it('builds the same signature for cloned messages with the same token-affecting data', () => {
    expect(getMessagesTokenSignature([message()])).toBe(getMessagesTokenSignature([message()]))
  })
})
