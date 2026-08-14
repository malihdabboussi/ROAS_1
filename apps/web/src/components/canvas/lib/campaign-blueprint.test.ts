import { describe, expect, it } from 'vitest'
import { buildCampaignBlueprintOperations } from './campaign-blueprint'

describe('buildCampaignBlueprintOperations', () => {
  it('creates deterministic stage frames, linked assets, gaps, and journey connectors', () => {
    const ids = ['stage-traffic', 'stage-registration', 'journey-connector']
    const operations = buildCampaignBlueprintOperations({
      blueprintId: 'webinar-map',
      stages: [
        { key: 'traffic', label: 'Traffic' },
        { key: 'registration', label: 'Registration' },
      ],
      assets: [
        {
          id: 'webinar-url',
          title: 'Webinar registration page',
          stageKey: 'registration',
          source: { kind: 'url', label: 'webinar.com', url: 'https://webinar.com' },
        },
      ],
      gaps: [
        {
          id: 'traffic-ads',
          title: 'Webinar ads',
          stageKey: 'traffic',
          placeholder: { asset_type: 'ads', brief: 'Create launch ads.' },
        },
      ],
      idFactory: () => ids.shift()!,
    })

    expect(operations).toHaveLength(5)
    expect(operations[0]).toMatchObject({
      op: 'create_item',
      item: { id: 'stage-traffic', kind: 'frame', position_x: 120 },
    })
    expect(operations[2]).toMatchObject({
      op: 'create_item',
      item: {
        id: 'webinar-url',
        parent_id: 'stage-registration',
        content: { semantic_type: 'external_url', status: 'ready' },
      },
    })
    expect(operations[3]).toMatchObject({
      op: 'create_item',
      item: {
        id: 'traffic-ads',
        parent_id: 'stage-traffic',
        content: { semantic_type: 'asset_placeholder', status: 'missing' },
      },
    })
    expect(operations[4]).toMatchObject({
      op: 'create_connector',
      connector: {
        source_item_id: 'stage-traffic',
        target_item_id: 'stage-registration',
      },
    })
  })

  it('rejects assets assigned to an unknown stage', () => {
    expect(() =>
      buildCampaignBlueprintOperations({
        blueprintId: 'bad-map',
        stages: [{ key: 'traffic', label: 'Traffic' }],
        assets: [{ id: 'asset-1', title: 'Asset', stageKey: 'missing-stage' }],
        gaps: [],
      }),
    ).toThrow('Unknown campaign blueprint stage: missing-stage')
  })
})
