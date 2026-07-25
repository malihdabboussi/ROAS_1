import { describe, expect, it } from 'vitest'
import type { FunnelHistoryEntry } from '@/features/studio/services/funnel-history.service'
import { groupFunnelHistoryEntries } from './FunnelHistoryMenu'

function entry(id: string, createdAt: string): FunnelHistoryEntry {
  return {
    id,
    source: 'studio',
    action: 'write_funnel_file',
    label: `Edit ${id}`,
    status: 'applied',
    created_at: createdAt,
    updated_at: createdAt,
  }
}

describe('groupFunnelHistoryEntries', () => {
  it('groups a revision timeline into human-readable dates without reordering it', () => {
    const groups = groupFunnelHistoryEntries(
      [
        entry('today-2', '2026-07-25T18:00:00.000Z'),
        entry('today-1', '2026-07-25T17:00:00.000Z'),
        entry('yesterday', '2026-07-24T17:00:00.000Z'),
        entry('older', '2026-07-20T17:00:00.000Z'),
      ],
      new Date('2026-07-25T20:00:00.000Z'),
    )

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', 'July 20'])
    expect(groups[0]?.entries.map((item) => item.id)).toEqual(['today-2', 'today-1'])
  })
})
