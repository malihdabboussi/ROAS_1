import { describe, expect, it } from 'vitest'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import type { Program } from '@/lib/programs'
import type { SpaceSummary } from '@/lib/spaces'
import { buildSpaceMappingGroups } from './space-mapping'
import { buildSpaceMappingIndex } from './use-space-mapping-index'

function campaign(overrides: Partial<Campaign>): Campaign {
  return {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'Campaign',
    campaign_type: 'standard',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function space(overrides: Partial<SpaceSummary>): SpaceSummary {
  return {
    id: 'space-1',
    title: 'Space',
    campaign_id: 'campaign-1',
    ...overrides,
  } as SpaceSummary
}

describe('buildSpaceMappingGroups', () => {
  it('orders the General campaign first, then remaining campaigns A–Z', () => {
    const groups = buildSpaceMappingGroups(
      [
        space({ id: 's-a', campaign_id: 'c-alpha' }),
        space({ id: 's-z', campaign_id: 'c-zulu' }),
        space({ id: 's-g', campaign_id: 'c-general' }),
      ],
      [
        campaign({ id: 'c-zulu', name: 'Zulu' }),
        campaign({ id: 'c-general', name: 'Misc', config: { system_kind: 'general' } }),
        campaign({ id: 'c-alpha', name: 'Alpha' }),
      ],
      [],
    )
    expect(groups.map((g) => g.campaignId)).toEqual(['c-general', 'c-alpha', 'c-zulu'])
  })

  it('prefixes the campaign label with its program name', () => {
    const groups = buildSpaceMappingGroups(
      [space({ id: 's-1', campaign_id: 'c-1' })],
      [campaign({ id: 'c-1', name: 'Launch', program_id: 'p-1' })],
      [{ id: 'p-1', name: 'Acme Co' } as Program],
    )
    expect(groups[0]?.label).toBe('Acme Co · Launch')
  })

  it('excludes the source space and drops campaigns with no spaces', () => {
    const groups = buildSpaceMappingGroups(
      [
        space({ id: 's-keep', campaign_id: 'c-1', title: 'Keep' }),
        space({ id: 's-current', campaign_id: 'c-1' }),
      ],
      [campaign({ id: 'c-1', name: 'Has others' }), campaign({ id: 'c-2', name: 'No spaces' })],
      [],
      's-current',
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.spaces.map((s) => s.id)).toEqual(['s-keep'])
  })

  it('flattens groups into a spaceId → label index with full path labels', () => {
    const index = buildSpaceMappingIndex([
      {
        campaignId: 'c-1',
        label: 'Acme Co · Launch',
        spaces: [{ id: 's-1', title: 'Ad Production', visibility: 'team' }],
      },
    ])
    expect(index.get('s-1')).toEqual({
      spaceTitle: 'Ad Production',
      pathLabel: 'Acme Co · Launch · Ad Production',
    })
  })

  it('defaults space visibility to private', () => {
    const groups = buildSpaceMappingGroups(
      [space({ id: 's-1', campaign_id: 'c-1', visibility: undefined })],
      [campaign({ id: 'c-1', name: 'One' })],
      [],
    )
    expect(groups[0]?.spaces[0]?.visibility).toBe('private')
  })
})
