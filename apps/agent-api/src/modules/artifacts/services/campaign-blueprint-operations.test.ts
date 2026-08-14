import { describe, expect, it } from 'vitest'
import { buildCampaignBlueprintOperations } from './campaign-blueprint-operations'

describe('buildCampaignBlueprintOperations', () => {
  it('builds a webinar journey with URLs, gaps, and valid topology', () => {
    let index = 0
    const operations = buildCampaignBlueprintOperations({
      blueprintId: 'launch-1',
      campaignType: 'webinar',
      assets: [{ title: 'Registration', stage_key: 'registration', url: 'https://example.com' }],
      gaps: [
        {
          title: 'Reminder sequence',
          stage_key: 'reminder',
          asset_type: 'sequence',
          brief: 'Create reminders.',
        },
      ],
      createId: () => `00000000-0000-4000-8000-${String(index++).padStart(12, '0')}`,
    })

    expect(operations).toHaveLength(17)
    expect(operations[8]).toMatchObject({
      op: 'create_item',
      item: { content: { semantic_type: 'external_url', source: { url: 'https://example.com' } } },
    })
    expect(operations[9]).toMatchObject({
      op: 'create_item',
      item: { content: { semantic_type: 'asset_placeholder', status: 'missing' } },
    })
    expect(operations[10]).toMatchObject({ op: 'create_connector' })
  })

  it('rejects entries assigned outside the selected archetype', () => {
    expect(() =>
      buildCampaignBlueprintOperations({
        blueprintId: 'bad',
        campaignType: 'vsl_call_booking',
        assets: [{ title: 'Unknown', stage_key: 'webinar' }],
        gaps: [],
      }),
    ).toThrow('Unknown campaign blueprint stage: webinar')
  })

  it.each([
    ['webinar', 8, 7],
    ['vsl_call_booking', 7, 6],
    ['free_skool_community', 7, 6],
  ] as const)('builds the complete %s archetype', (campaignType, itemCount, connectorCount) => {
    const operations = buildCampaignBlueprintOperations({
      blueprintId: `${campaignType}-proof`,
      campaignType,
      assets: [],
      gaps: [],
    })

    expect(operations.filter((operation) => operation.op === 'create_item')).toHaveLength(itemCount)
    expect(operations.filter((operation) => operation.op === 'create_connector')).toHaveLength(
      connectorCount,
    )
  })
})
