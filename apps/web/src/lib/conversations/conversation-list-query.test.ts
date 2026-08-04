import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CHAT_HISTORY_FILTERS,
  filterConversationsForHistory,
  groupConversationsForHistory,
} from './conversation-list-query'
import type { Conversation } from './conversation.types'

function conversation(overrides: Partial<Conversation> & { id: string }): Conversation {
  const updatedAt = overrides.updated_at ?? '2026-06-23T12:00:00.000Z'
  return {
    user_id: 'user-1',
    campaign_id: null,
    title: null,
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    ...overrides,
    id: overrides.id,
    created_at: overrides.created_at ?? updatedAt,
    updated_at: updatedAt,
    last_message_at:
      overrides.last_message_at !== undefined ? overrides.last_message_at : updatedAt,
  }
}

describe('conversation list query', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to a flat newest-first list when groupBy is none', () => {
    const groups = groupConversationsForHistory(
      [
        conversation({ id: 'old', updated_at: '2026-06-20T12:00:00.000Z' }),
        conversation({ id: 'new', updated_at: '2026-06-23T11:00:00.000Z' }),
      ],
      { groupBy: 'none' },
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('')
    expect(groups[0]?.items.map((row) => row.id)).toEqual(['new', 'old'])
  })

  it('groups by calendar day when groupBy is date', () => {
    const groups = groupConversationsForHistory(
      [
        conversation({ id: 'today', updated_at: '2026-06-23T08:00:00.000Z' }),
        conversation({ id: 'yesterday', updated_at: '2026-06-22T08:00:00.000Z' }),
        conversation({ id: 'older', updated_at: '2026-06-10T08:00:00.000Z' }),
      ],
      { groupBy: 'date' },
    )

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', 'Jun 10'])
  })

  it('filters by status, channel, and last activity', () => {
    const rows = [
      conversation({ id: 'active-slack', metadata: { source: 'slack' } }),
      conversation({
        id: 'archived',
        status: 'archived',
        updated_at: '2026-06-23T10:00:00.000Z',
      }),
      conversation({
        id: 'stale',
        updated_at: '2026-05-01T10:00:00.000Z',
      }),
    ]

    expect(
      filterConversationsForHistory(rows, {
        ...DEFAULT_CHAT_HISTORY_FILTERS,
        status: 'active',
      }).map((row) => row.id),
    ).toEqual(['active-slack', 'stale'])

    expect(
      filterConversationsForHistory(rows, {
        ...DEFAULT_CHAT_HISTORY_FILTERS,
        status: 'all',
        type: 'slack',
      }).map((row) => row.id),
    ).toEqual(['active-slack'])

    expect(
      filterConversationsForHistory(rows, {
        ...DEFAULT_CHAT_HISTORY_FILTERS,
        status: 'all',
        lastActivity: '7d',
      }).map((row) => row.id),
    ).toEqual(['active-slack', 'archived'])
  })

  it('soft-caps campaign groups and parks overflow in Other', () => {
    const rows = Array.from({ length: 7 }, (_, index) =>
      conversation({
        id: `c-${index}`,
        campaign_id: 'camp-1',
        updated_at: `2026-06-23T${String(10 + index).padStart(2, '0')}:00:00.000Z`,
      }),
    )
    rows.push(conversation({ id: 'uncategorized', campaign_id: null }))

    const groups = groupConversationsForHistory(rows, {
      groupBy: 'campaign',
      campaignNameById: { 'camp-1': 'Launch' },
      softCap: 5,
    })

    expect(groups[0]).toMatchObject({ id: 'camp-1', label: 'Launch' })
    expect(groups[0]?.items).toHaveLength(5)
    expect(groups.at(-1)?.id).toBe('other')
    expect(groups.at(-1)?.items.some((row) => row.id === 'uncategorized')).toBe(true)
    expect(groups.at(-1)?.items.length).toBeGreaterThanOrEqual(3)
  })

  it('defaults include no leading icons and flat grouping', () => {
    expect(DEFAULT_CHAT_HISTORY_FILTERS).toMatchObject({
      status: 'active',
      lastActivity: 'all',
      type: 'all',
      groupBy: 'none',
      leadingIcon: 'none',
    })
  })
})
