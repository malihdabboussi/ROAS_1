import { describe, expect, it } from 'vitest'
import { asCampaignRows, sortCampaignMentionRows } from './use-chat-input-at-mention-data.helpers'

describe('campaign mention rows', () => {
  it('maps campaign rows, untitled names, and system flags', () => {
    expect(
      asCampaignRows([
        { id: 'campaign-1', name: 'Launch', updated_at: '2026-08-14T10:00:00Z', config: {} },
        { id: 'campaign-2', name: null, updated_at: '2026-08-13T10:00:00Z' },
        {
          id: 'personal',
          name: 'Personal',
          updated_at: '2026-08-15T10:00:00Z',
          config: { system_kind: 'personal', isSystem: true },
        },
        { name: 'Missing id' },
      ]),
    ).toEqual([
      {
        id: 'campaign-1',
        name: 'Launch',
        updatedAt: '2026-08-14T10:00:00Z',
        isSystem: false,
      },
      {
        id: 'campaign-2',
        name: 'Untitled',
        updatedAt: '2026-08-13T10:00:00Z',
        isSystem: false,
      },
      {
        id: 'personal',
        name: 'Personal',
        updatedAt: '2026-08-15T10:00:00Z',
        isSystem: true,
      },
    ])
  })

  it('sorts work campaigns ahead of system campaigns, newest first', () => {
    expect(
      sortCampaignMentionRows([
        {
          id: 'personal',
          name: 'Personal',
          updatedAt: '2026-08-15T10:00:00Z',
          isSystem: true,
        },
        {
          id: 'older',
          name: 'Older work',
          updatedAt: '2026-08-01T10:00:00Z',
          isSystem: false,
        },
        {
          id: 'newer',
          name: 'Newer work',
          updatedAt: '2026-08-14T10:00:00Z',
          isSystem: false,
        },
      ]).map((row) => row.id),
    ).toEqual(['newer', 'older', 'personal'])
  })
})
