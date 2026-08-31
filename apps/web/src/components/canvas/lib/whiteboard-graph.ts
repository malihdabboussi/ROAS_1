import type {
  CanvasConnector,
  CanvasItem,
  PersistedWhiteboardNodeData,
  WhiteboardEdge,
  WhiteboardNode,
  WhiteboardNodeData,
} from '../types/whiteboard.types'

const CONNECTOR_STYLES = {
  spine: { stroke: '#54626F', strokeWidth: 3 },
  complete: { stroke: '#2E6B4F', strokeWidth: 2.5 },
  dead_end: { stroke: '#A8402F', strokeWidth: 2.5 },
  to_build: { stroke: '#A8730F', strokeWidth: 2.5, strokeDasharray: '10 8' },
  loop: { stroke: '#A8730F', strokeWidth: 2.5, strokeDasharray: '10 8' },
  calling: { stroke: '#A8402F', strokeWidth: 2, strokeDasharray: '10 8' },
} as const

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
  onPlaceholderAction?: WhiteboardNodeData['onPlaceholderAction'],
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
        ...item.content,
        onContentChange,
        onSizeChange,
        onPlaceholderAction,
      },
    })),
    edges: connectors.map((connector) => {
      const role = connector.style.role as keyof typeof CONNECTOR_STYLES | undefined
      return {
        id: connector.id,
        source: connector.source_item_id,
        target: connector.target_item_id,
        sourceHandle: connector.source_handle,
        targetHandle: connector.target_handle,
        label: connector.label,
        // React Flow requires connector paint values through its JS style contract.
        style: role ? CONNECTOR_STYLES[role] : undefined,
        labelStyle: { fontFamily: 'monospace', fontSize: 16, fill: '#54626F' },
        animated: role === 'loop',
      }
    }),
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
