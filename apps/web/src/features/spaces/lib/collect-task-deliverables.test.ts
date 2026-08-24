import { describe, expect, it } from 'vitest'
import type { SpaceItemActivity } from '../services/spaces.service'
import { collectTaskDeliverablesFromActivity } from './collect-task-deliverables'
import { resolveMultiSelectOptions } from './field-activity-value'

describe('collectTaskDeliverablesFromActivity', () => {
  it('includes mirrored ClickUp attachments in task deliverables', () => {
    const rows = [
      {
        id: 'activity-1',
        item_id: 'task-1',
        space_id: 'space-1',
        user_id: 'user-1',
        org_id: null,
        actor_kind: 'system',
        event_type: 'field_change',
        created_at: '2026-08-24T12:00:00.000Z',
        payload: {
          field: 'attachments',
          from: [],
          to: [
            {
              id: 'clickup-attachment-1',
              name: 'creative.png',
              url: 'https://example.com/creative.png',
              mime_type: 'image/png',
              thumbnail_url: 'https://example.com/creative-thumb.png',
            },
          ],
        },
      } as SpaceItemActivity,
    ]

    expect(collectTaskDeliverablesFromActivity(rows)).toEqual([
      expect.objectContaining({
        id: 'activity-1-external-att-clickup-attachment-1',
        agent_key: 'clickup',
        type: 'image',
        title: 'creative.png',
        file_url: 'https://example.com/creative.png',
        mime_type: 'image/png',
        metadata: expect.objectContaining({
          source: 'external_task_attachment',
          provider: 'clickup',
        }),
      }),
    ])
  })

  it('does not turn attachment records into multi-select labels', () => {
    expect(resolveMultiSelectOptions([{ name: 'creative.png' }])).toEqual([])
  })

  it('deduplicates the same ClickUp attachment across activity records', () => {
    const attachment = {
      id: 'clickup-attachment-1',
      name: 'creative.png',
      url: 'https://example.com/creative.png',
      mime_type: 'image/png',
    }
    const activity = (id: string) =>
      ({
        id,
        item_id: 'task-1',
        space_id: 'space-1',
        user_id: 'user-1',
        org_id: null,
        actor_kind: 'system',
        event_type: 'field_change',
        created_at: '2026-08-24T12:00:00.000Z',
        payload: { field: 'attachments', from: [], to: [attachment] },
      }) as SpaceItemActivity

    expect(
      collectTaskDeliverablesFromActivity([activity('activity-1'), activity('activity-2')]),
    ).toHaveLength(1)
  })
})
