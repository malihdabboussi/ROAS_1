import type {
  CanvasConnector,
  CanvasItem,
  PersistedWhiteboardNodeData,
  WhiteboardEdge,
  WhiteboardNode,
  WhiteboardNodeData,
} from '../types/whiteboard.types'

function toWhiteboardKind(kind: CanvasItem['kind']): PersistedWhiteboardNodeData['kind'] {
  if (kind === 'sticky_note') return 'note'
  if (kind === 'text') return 'text'
  if (kind === 'frame') return 'frame'
  if (kind === 'shape') return 'shape'
  return 'card'
}

export function hydrateWhiteboardItems(
  items: CanvasItem[],
  connectors: CanvasConnector[],
  onContentChange: WhiteboardNodeData['onContentChange'],
  onSizeChange: WhiteboardNodeData['onSizeChange'],
): { nodes: WhiteboardNode[]; edges: WhiteboardEdge[] } {
  return {
    nodes: items.map((item) => ({
      id: item.id,
      type: 'whiteboard',
      position: { x: item.position_x, y: item.position_y },
      width: item.width,
      height: item.height,
      parentId: item.parent_id ?? undefined,
      zIndex: item.z_index,
      draggable: !item.locked,
      data: {
        kind: toWhiteboardKind(item.kind),
        title: item.content.title ?? '',
        text: item.content.text ?? '',
        ...(item.resource_type ? { resource_type: item.resource_type } : {}),
        ...(item.resource_id ? { resource_id: item.resource_id } : {}),
        locked: item.locked,
        width: item.width,
        height: item.height,
        onContentChange,
        onSizeChange,
      },
    })),
    edges: connectors.map((connector) => ({
      id: connector.id,
      source: connector.source_item_id,
      target: connector.target_item_id,
      sourceHandle: connector.source_handle,
      targetHandle: connector.target_handle,
      label: connector.label,
    })),
  }
}

export function createWhiteboardNodeData(
  kind: PersistedWhiteboardNodeData['kind'],
  onContentChange: WhiteboardNodeData['onContentChange'],
  onSizeChange: WhiteboardNodeData['onSizeChange'],
): WhiteboardNodeData {
  const content = {
    note: { title: 'Sticky note', text: 'Start typing...' },
    text: { title: '', text: 'Add text' },
    card: { title: 'Card title', text: 'Add details or paste a link' },
    shape: { title: 'Section', text: '' },
    frame: { title: 'Frame', text: '' },
  }[kind]
  return { kind, ...content, onContentChange, onSizeChange }
}
