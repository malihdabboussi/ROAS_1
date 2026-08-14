import { describe, expect, it, vi } from 'vitest'
import { hydrateWhiteboardItems } from './whiteboard-graph'

describe('hydrateWhiteboardItems', () => {
  it('maps normalized items and connectors into editable flow objects', () => {
    const onContentChange = vi.fn()
    const onSizeChange = vi.fn()
    const hydrated = hydrateWhiteboardItems(
      [
        {
          id: 'item-1',
          board_id: 'board-1',
          kind: 'sticky_note',
          position_x: 10,
          position_y: 20,
          width: 240,
          height: 160,
          rotation: 0,
          z_index: 0,
          parent_id: null,
          content: { title: 'Idea', text: 'Launch email' },
          style: {},
          resource_type: null,
          resource_id: null,
          locked: false,
        },
      ],
      [],
      onContentChange,
      onSizeChange,
    )

    expect(hydrated.nodes[0]).toMatchObject({
      id: 'item-1',
      position: { x: 10, y: 20 },
      data: {
        kind: 'note',
        title: 'Idea',
        text: 'Launch email',
        onContentChange,
        onSizeChange,
      },
    })
  })

  it('preserves campaign blueprint semantics when hydrating a placeholder', () => {
    const onPlaceholderAction = vi.fn()
    const hydrated = hydrateWhiteboardItems(
      [
        {
          id: 'gap-1',
          board_id: 'board-1',
          kind: 'card',
          position_x: 10,
          position_y: 20,
          width: 240,
          height: 160,
          rotation: 0,
          z_index: 0,
          parent_id: null,
          content: {
            title: 'Reminder sequence',
            text: 'Three reminder emails are missing.',
            semantic_type: 'asset_placeholder',
            blueprint_id: 'blueprint-1',
            stage_key: 'reminder',
            status: 'missing',
            placeholder: { asset_type: 'email_sequence', brief: 'Create three emails.' },
          },
          style: {},
          resource_type: null,
          resource_id: null,
          locked: false,
        },
      ],
      [],
      vi.fn(),
      vi.fn(),
      onPlaceholderAction,
    )

    expect(hydrated.nodes[0]?.data).toMatchObject({
      semantic_type: 'asset_placeholder',
      blueprint_id: 'blueprint-1',
      stage_key: 'reminder',
      status: 'missing',
      onPlaceholderAction,
    })
  })
})
