import { describe, expect, it } from 'vitest'
import { buildUpdatedCanvasContent } from './canvas-node-content'

describe('buildUpdatedCanvasContent', () => {
  it('preserves campaign blueprint metadata while editing visible content', () => {
    expect(
      buildUpdatedCanvasContent(
        {
          kind: 'card',
          title: 'Reminder sequence',
          text: 'Three emails',
          semantic_type: 'asset_placeholder',
          blueprint_id: 'blueprint-1',
          stage_key: 'reminder',
          status: 'missing',
          placeholder: { asset_type: 'email_sequence', brief: 'Create three emails.' },
        },
        { title: 'Webinar reminder sequence' },
      ),
    ).toMatchObject({
      title: 'Webinar reminder sequence',
      semantic_type: 'asset_placeholder',
      blueprint_id: 'blueprint-1',
      stage_key: 'reminder',
      status: 'missing',
      placeholder: { asset_type: 'email_sequence' },
    })
  })
})
