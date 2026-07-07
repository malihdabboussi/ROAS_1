import { describe, expect, it } from 'vitest'
import {
  resolveFlowScopeLocations,
  summarizeFlowScopeLocations,
} from '../resolve-flow-scope-locations'

describe('resolveFlowScopeLocations', () => {
  it('returns campaign and space from a single-space flow', () => {
    const locations = resolveFlowScopeLocations(
      {
        id: 'flow-1',
        name: 'Follow up task',
        enabled: true,
        is_draft: false,
        trigger: { type: 'task_created' },
        actions: [],
        space_id: 'space-1',
        space_title: 'Sales pipeline',
        campaign_id: 'campaign-1',
        campaign_name: 'Revenue',
      },
      [{ id: 'space-1', title: 'Sales pipeline', campaign_id: 'campaign-1' }],
    )

    expect(locations).toEqual([
      {
        spaceId: 'space-1',
        spaceTitle: 'Sales pipeline',
        campaignId: 'campaign-1',
        campaignName: 'Revenue',
        isConceptSandbox: false,
      },
    ])
  })

  it('marks concept sandbox flows as create anything', () => {
    const locations = resolveFlowScopeLocations(
      {
        id: 'draft-1',
        name: 'Draft loop',
        enabled: false,
        is_draft: true,
        trigger: { type: 'choose_action' },
        actions: [],
        space_id: 'concept-1',
        space_title: 'Flow concepts',
      },
      [
        {
          id: 'concept-1',
          title: 'Flow concepts',
          schema: { custom_data: { vibey_flows_concept_space: true } },
        },
      ],
    )

    expect(locations[0]?.isConceptSandbox).toBe(true)
    expect(summarizeFlowScopeLocations(locations).campaignLabel).toBe('Create anything')
  })
})
