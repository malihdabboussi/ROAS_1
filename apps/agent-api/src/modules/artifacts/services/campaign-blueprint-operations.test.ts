import { describe, expect, it } from 'vitest'
import { buildCampaignBlueprintOperations } from './campaign-blueprint-operations'

const stages = [
  { key: 'traffic', label: 'Traffic' },
  { key: 'signup', label: 'Challenge signup' },
  { key: 'daily', label: 'Five daily lessons' },
  { key: 'offer', label: 'Cohort enrollment' },
]

describe('buildCampaignBlueprintOperations', () => {
  it('builds a chat-derived journey with URLs, gaps, and valid topology', () => {
    let index = 0
    const operations = buildCampaignBlueprintOperations({
      blueprintId: 'launch-1',
      campaignLabel: 'Five-day challenge launch',
      stages,
      assets: [{ title: 'Signup page', stage_key: 'signup', url: 'https://example.com' }],
      gaps: [
        {
          title: 'Daily lesson sequence',
          stage_key: 'daily',
          asset_type: 'sequence',
          brief: 'Create five lessons.',
        },
      ],
      createId: () => `00000000-0000-4000-8000-${String(index++).padStart(12, '0')}`,
    })

    expect(operations).toHaveLength(9)
    expect(operations[4]).toMatchObject({
      op: 'create_item',
      item: { content: { semantic_type: 'external_url', source: { url: 'https://example.com' } } },
    })
    expect(operations[5]).toMatchObject({
      op: 'create_item',
      item: { content: { semantic_type: 'asset_placeholder', status: 'missing' } },
    })
    expect(operations[6]).toMatchObject({ op: 'create_connector' })
  })

  it('supports non-linear branches supplied by the chat plan', () => {
    const operations = buildCampaignBlueprintOperations({
      blueprintId: 'branching-launch',
      campaignLabel: 'Product trial activation',
      stages: [
        { key: 'trial', label: 'Trial signup' },
        { key: 'activated', label: 'Activated users' },
        { key: 'inactive', label: 'Inactive users' },
        { key: 'paid', label: 'Paid conversion' },
      ],
      connections: [
        { source_stage_key: 'trial', target_stage_key: 'activated', label: 'Uses product' },
        { source_stage_key: 'trial', target_stage_key: 'inactive', label: 'No activation' },
        { source_stage_key: 'activated', target_stage_key: 'paid', label: 'Upgrades' },
        { source_stage_key: 'inactive', target_stage_key: 'paid', label: 'Re-engaged' },
      ],
      assets: [],
      gaps: [],
    })

    expect(operations.filter((operation) => operation.op === 'create_item')).toHaveLength(4)
    expect(operations.filter((operation) => operation.op === 'create_connector')).toHaveLength(4)
  })

  it('rejects entries assigned outside the chat-derived stages', () => {
    expect(() =>
      buildCampaignBlueprintOperations({
        blueprintId: 'bad',
        campaignLabel: 'Challenge',
        stages,
        assets: [{ title: 'Unknown', stage_key: 'webinar' }],
        gaps: [],
      }),
    ).toThrow('Unknown campaign blueprint stage: webinar')
  })

  it('rejects duplicate stage keys', () => {
    expect(() =>
      buildCampaignBlueprintOperations({
        blueprintId: 'bad-stages',
        campaignLabel: 'Challenge',
        stages: [
          { key: 'signup', label: 'Signup' },
          { key: 'signup', label: 'Another signup' },
        ],
        assets: [],
        gaps: [],
      }),
    ).toThrow('Duplicate campaign blueprint stage: signup')
  })
})
