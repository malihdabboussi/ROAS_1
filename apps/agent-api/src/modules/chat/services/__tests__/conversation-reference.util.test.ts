import { describe, expect, it, vi } from 'vitest'
import {
  buildConversationReferenceLines,
  CONVERSATION_REF_LIMITS,
} from '../conversation-reference.util'

type Row = Record<string, unknown>

function mockClient(opts: { conversations: Row[]; messagesByConversation: Record<string, Row[]> }) {
  return {
    from: vi.fn((table: string) => {
      const chain: Record<string, any> = {
        filters: {} as Record<string, unknown>,
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: unknown) => {
          chain.filters[col] = val
          return chain
        }),
        in: vi.fn((col: string, vals: unknown[]) => {
          chain.filters[`${col}__in`] = vals
          return chain
        }),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          const id = chain.filters.id
          const row = opts.conversations.find((c) => c.id === id) ?? null
          return { data: row, error: null }
        }),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
          if (table === 'messages') {
            const convId = chain.filters.conversation_id as string
            const rows = opts.messagesByConversation[convId] ?? []
            return Promise.resolve(resolve({ data: rows, error: null }))
          }
          return Promise.resolve(resolve({ data: [], error: null }))
        },
      }
      return chain
    }),
  }
}

const OWNED_CONV: Row = {
  id: 'conv-1',
  user_id: 'user-1',
  org_id: 'org-1',
  title: 'Telegram Chat',
  agent_id: 'zara',
  metadata: { source: 'telegram' },
}

function msg(id: string, role: string, content: string, at: string): Row {
  return { id, role, content, created_at: at }
}

describe('buildConversationReferenceLines', () => {
  it('inlines a transcript for an owned conversation', async () => {
    const client = mockClient({
      conversations: [OWNED_CONV],
      messagesByConversation: {
        'conv-1': [
          msg('m2', 'assistant', 'Hi Brian, how can I help?', '2026-06-01T10:01:00Z'),
          msg('m1', 'user', 'I want to book a session', '2026-06-01T10:00:00Z'),
        ],
      },
    })

    const lines = await buildConversationReferenceLines(
      client as never,
      [{ id: 'conv-1', label: 'Telegram Chat' }],
      'user-1',
      'org-1',
    )

    const text = lines.join('\n')
    expect(text).toContain('[Customer conversation] Telegram Chat')
    expect(text.indexOf('I want to book a session')).toBeLessThan(
      text.indexOf('Hi Brian, how can I help?'),
    )
    expect(text).toContain('user: I want to book a session')
    expect(text).toContain('assistant: Hi Brian, how can I help?')
  })

  it('excludes conversations owned by another tenant', async () => {
    const client = mockClient({
      conversations: [{ ...OWNED_CONV, user_id: 'someone-else', org_id: 'org-other' }],
      messagesByConversation: { 'conv-1': [msg('m1', 'user', 'secret', '2026-06-01T10:00:00Z')] },
    })

    const lines = await buildConversationReferenceLines(
      client as never,
      [{ id: 'conv-1', label: 'Telegram Chat' }],
      'user-1',
      'org-1',
    )

    expect(lines.join('\n')).not.toContain('secret')
  })

  it('truncates long messages and caps the transcript size dropping oldest', async () => {
    const longMsg = 'x'.repeat(2_000)
    const messages = Array.from({ length: 30 }, (_, i) =>
      msg(
        `m${i}`,
        i % 2 === 0 ? 'user' : 'assistant',
        `${i}-${longMsg}`,
        `2026-06-01T10:${String(i).padStart(2, '0')}:00Z`,
      ),
    ).reverse() // repo returns desc
    const client = mockClient({
      conversations: [OWNED_CONV],
      messagesByConversation: { 'conv-1': messages },
    })

    const lines = await buildConversationReferenceLines(
      client as never,
      [{ id: 'conv-1', label: 'Telegram Chat' }],
      'user-1',
      'org-1',
    )

    const text = lines.join('\n')
    expect(text.length).toBeLessThanOrEqual(CONVERSATION_REF_LIMITS.transcriptChars + 500)
    expect(text).toContain('[transcript truncated]')
    // newest message survives, oldest dropped
    expect(text).toContain('29-')
    expect(text).not.toContain('\n0-')
  })

  it('caps the number of conversation references', async () => {
    const conversations = ['a', 'b', 'c'].map((id) => ({ ...OWNED_CONV, id: `conv-${id}` }))
    const client = mockClient({
      conversations,
      messagesByConversation: {
        'conv-a': [msg('m1', 'user', 'A', '2026-06-01T10:00:00Z')],
        'conv-b': [msg('m2', 'user', 'B', '2026-06-01T10:00:00Z')],
        'conv-c': [msg('m3', 'user', 'C', '2026-06-01T10:00:00Z')],
      },
    })

    const lines = await buildConversationReferenceLines(
      client as never,
      [
        { id: 'conv-a', label: 'A' },
        { id: 'conv-b', label: 'B' },
        { id: 'conv-c', label: 'C' },
      ],
      'user-1',
      'org-1',
    )

    const text = lines.join('\n')
    expect(CONVERSATION_REF_LIMITS.maxRefs).toBe(2)
    expect(text).toContain('conv-a')
    expect(text).toContain('conv-b')
    expect(text).not.toContain('conv-c')
  })
})
