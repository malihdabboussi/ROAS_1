import { describe, expect, it } from 'vitest'
import { resolveMissionQualityEvidenceRows } from './mission-quality-evidence.repository'

describe('resolveMissionQualityEvidenceRows', () => {
  it('prefers the canonical Space document over a shortened deliverable snapshot', () => {
    const evidence = resolveMissionQualityEvidenceRows(
      [
        {
          id: 'deliverable-1',
          title: 'Strategy Map',
          type: 'doc',
          content: 'Short snapshot',
          content_json: null,
          file_url: null,
          entity_id: 'space-item-1',
          entity_table: 'space_items',
        },
      ],
      [{ id: 'space-item-1', doc_body: '<h1>Full strategy</h1><p>Verified evidence.</p>' }],
    )

    expect(evidence).toEqual([
      {
        deliverableId: 'deliverable-1',
        title: 'Strategy Map',
        type: 'doc',
        content: '<h1>Full strategy</h1><p>Verified evidence.</p>',
      },
    ])
  })
})
