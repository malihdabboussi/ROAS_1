import { describe, expect, it } from 'vitest'
import {
  filterFlowSpacePickerGroups,
  groupFlowSpacesByCampaign,
  type FlowSpacePickerItem,
} from './flow-space-picker.utils'

const spaces: FlowSpacePickerItem[] = [
  { id: 'space-1', title: 'Lead intake', campaign_id: 'campaign-1' },
  { id: 'space-2', title: 'Marketing ops', campaign_id: 'campaign-2' },
  { id: 'space-3', title: 'Standalone', campaign_id: null },
]

const campaigns = [
  {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'Summer campaign',
    campaign_type: 'marketing',
    status: 'active',
    config: { system_kind: 'general' },
    metrics: {},
    created_at: '2026-06-23T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
  },
  {
    id: 'campaign-2',
    user_id: 'user-1',
    name: 'Marketing',
    campaign_type: 'marketing',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-23T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
  },
] as const

describe('flow-space-picker.utils', () => {
  it('groups spaces by campaign with general first and other spaces last', () => {
    const groups = groupFlowSpacesByCampaign(spaces, [...campaigns])

    expect(groups.map((group) => group.heading)).toEqual([
      'Summer campaign',
      'Marketing',
      'Other spaces',
    ])
    expect(groups[0]?.spaces.map((space) => space.id)).toEqual(['space-1'])
    expect(groups[2]?.spaces.map((space) => space.id)).toEqual(['space-3'])
  })

  it('filters groups by campaign name or space title', () => {
    const groups = groupFlowSpacesByCampaign(spaces, [...campaigns])

    expect(filterFlowSpacePickerGroups(groups, 'marketing').map((group) => group.heading)).toEqual([
      'Marketing',
    ])
    expect(
      filterFlowSpacePickerGroups(groups, 'lead').flatMap((group) => group.spaces.map((s) => s.id)),
    ).toEqual(['space-1'])
  })
})
