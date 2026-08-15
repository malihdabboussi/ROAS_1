import { describe, expect, it } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import { groupScopeCampaignsByProgram } from './conversation-scope-groups'

describe('groupScopeCampaignsByProgram', () => {
  it('places campaigns under named programs and leftover General', () => {
    const groups = groupScopeCampaignsByProgram(
      [
        { id: 'c1', name: 'Launch', program_id: 'p1' } as Campaign,
        { id: 'c2', name: 'Ops', program_id: null } as Campaign,
      ],
      [{ id: 'p1', name: 'Growth' } as Program],
    )

    expect(groups.map((group) => group.label)).toEqual(['General', 'Growth'])
    expect(groups[0]?.campaigns.map((row) => row.id)).toEqual(['c2'])
    expect(groups[1]?.campaigns.map((row) => row.id)).toEqual(['c1'])
  })
})
