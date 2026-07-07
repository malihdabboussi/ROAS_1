import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from './conversation.types'
import {
  getAgentInitial,
  getConversationAgentDisplay,
  getConversationSection,
  groupConversationsBySection,
  isConversationArchived,
  isConversationPinned,
} from './conversation-list-sections'

function conversation(overrides: Partial<Conversation> & { id: string }): Conversation {
  const { id, ...rest } = overrides
  return {
    id,
    user_id: 'user-1',
    campaign_id: null,
    title: null,
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    created_at: '2026-06-23T12:00:00.000Z',
    updated_at: '2026-06-23T12:00:00.000Z',
    ...rest,
  }
}

describe('conversation list sections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('classifies pinned, archived, recent, and older conversations', () => {
    expect(getConversationSection('2026-06-23T08:00:00.000Z', false)).toBe('today')
    expect(getConversationSection('2026-06-22T08:00:00.000Z', false)).toBe('yesterday')
    expect(getConversationSection('2026-06-18T08:00:00.000Z', false)).toBe('last7')
    expect(getConversationSection('2026-06-01T08:00:00.000Z', false)).toBe('last30')
    expect(getConversationSection('2026-05-01T08:00:00.000Z', false)).toBe('older')
    expect(getConversationSection('not-a-date', false)).toBe('older')
    expect(getConversationSection('2026-05-01T08:00:00.000Z', true)).toBe('pinned')
  })

  it('groups conversations in newest-first order with pinned and archived overrides', () => {
    const grouped = groupConversationsBySection([
      conversation({
        id: 'older',
        updated_at: '2026-05-01T08:00:00.000Z',
      }),
      conversation({
        id: 'today-newer',
        updated_at: '2026-06-23T11:00:00.000Z',
      }),
      conversation({
        id: 'archived',
        status: 'archived',
        updated_at: '2026-06-23T12:00:00.000Z',
      }),
      conversation({
        id: 'pinned',
        metadata: { pinned: true },
        updated_at: '2026-05-01T08:00:00.000Z',
      }),
      conversation({
        id: 'today-older',
        updated_at: '2026-06-23T09:00:00.000Z',
      }),
    ])

    expect(grouped.pinned.map((item) => item.id)).toEqual(['pinned'])
    expect(grouped.today.map((item) => item.id)).toEqual(['today-newer', 'today-older'])
    expect(grouped.older.map((item) => item.id)).toEqual(['older'])
    expect(grouped.archived.map((item) => item.id)).toEqual(['archived'])
  })

  it('resolves conversation flags and agent display fallbacks', () => {
    const row = conversation({ id: 'agent-row', agent_id: 'atlas', metadata: { pinned: true } })

    expect(isConversationPinned(row)).toBe(true)
    expect(isConversationArchived(row)).toBe(false)
    expect(getConversationAgentDisplay(row, { atlas: { name: 'Atlas', avatarUrl: null } })).toEqual(
      { name: 'Atlas', avatarUrl: null },
    )
    expect(getConversationAgentDisplay(conversation({ id: 'fallback', agent_id: '' }))).toEqual({
      name: 'vibey',
      avatarUrl: null,
    })
    expect(getAgentInitial(' atlas')).toBe('A')
    expect(getAgentInitial('')).toBe('?')
  })
})
