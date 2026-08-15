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

  it('lifts pinned chats above Recents when splitPinned is set', () => {
    const groups = groupConversationsForHistory(
      [
        conversation({
          id: 'pinned',
          title: 'ROAS Marketing Strat',
          metadata: { pinned: true },
          updated_at: '2026-06-22T12:00:00.000Z',
        }),
        conversation({ id: 'recent', updated_at: '2026-06-23T11:00:00.000Z' }),
      ],
      { groupBy: 'none', splitPinned: true },
    )

    expect(groups.map((group) => group.id)).toEqual(['pinned', 'recents'])
    expect(groups[0]).toMatchObject({ label: 'Pinned', items: [{ id: 'pinned' }] })
    expect(groups[1]?.items.map((row) => row.id)).toEqual(['recent'])
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

  it('filters Recents by campaign, and by space when a nested space is selected', () => {
    const rows = [
      conversation({ id: 'yasir-general', campaign_id: 'campaign-yasir' }),
      conversation({
        id: 'yasir-workshop',
        campaign_id: 'campaign-yasir',
        metadata: { space_id: 'space-workshop' },
      }),
      conversation({ id: 'other-client', campaign_id: 'campaign-other' }),
    ]

    expect(
      filterConversationsForHistory(rows, {
        ...DEFAULT_CHAT_HISTORY_FILTERS,
        campaignId: 'campaign-yasir',
      }).map((row) => row.id),
    ).toEqual(['yasir-general', 'yasir-workshop'])

    expect(
      filterConversationsForHistory(rows, {
        ...DEFAULT_CHAT_HISTORY_FILTERS,
        campaignId: 'campaign-yasir',
        spaceId: 'space-workshop',
        scopeLabel: 'Speak Like a CEO Workshop',
      }).map((row) => row.id),
    ).toEqual(['yasir-workshop'])
  })

  it('keeps only the newest history row for the same meeting', () => {
    const rows = [
      conversation({
        id: 'meeting-old',
        updated_at: '2026-06-23T09:00:00.000Z',
        metadata: { context_type: 'meeting', meeting_item_id: 'meeting-1' },
      }),
      conversation({
        id: 'meeting-new',
        updated_at: '2026-06-23T11:00:00.000Z',
        metadata: { context_type: 'meeting', meeting_item_id: 'meeting-1' },
      }),
      conversation({ id: 'regular-chat' }),
    ]

    expect(
      filterConversationsForHistory(rows, DEFAULT_CHAT_HISTORY_FILTERS).map((row) => row.id),
    ).toEqual(['meeting-new', 'regular-chat'])
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

  it('defaults to logo identity icons and flat grouping', () => {
    expect(DEFAULT_CHAT_HISTORY_FILTERS).toMatchObject({
      status: 'active',
      lastActivity: 'all',
      type: 'all',
      groupBy: 'none',
      leadingIcon: 'logo',
      campaignId: null,
      spaceId: null,
      scopeLabel: null,
    })
  })
})
