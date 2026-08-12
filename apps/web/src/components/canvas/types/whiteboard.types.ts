import type { Edge, Node, Viewport } from '@xyflow/react'

export type WhiteboardNodeKind = 'note' | 'text' | 'card' | 'shape' | 'frame'
export type WhiteboardTool = 'select' | 'hand' | WhiteboardNodeKind | 'connector'
export type CanvasItemKind = 'sticky_note' | 'text' | 'shape' | 'frame' | 'card' | 'resource_card'

export interface PersistedWhiteboardNodeData extends Record<string, unknown> {
  kind: WhiteboardNodeKind
  title: string
  text: string
  resource_type?: string
  resource_id?: string
  locked?: boolean
  width?: number
  height?: number
}

export interface WhiteboardNodeData extends PersistedWhiteboardNodeData {
  onContentChange: (nodeId: string, patch: Partial<PersistedWhiteboardNodeData>) => void
  onSizeChange: (nodeId: string, width: number, height: number) => void
}

export type WhiteboardNode = Node<WhiteboardNodeData, 'whiteboard'>
export type WhiteboardEdge = Edge

export interface CanvasItem {
  id: string
  board_id: string
  kind: CanvasItemKind
  position_x: number
  position_y: number
  width: number
  height: number
  rotation: number
  z_index: number
  parent_id: string | null
  content: { title?: string; text?: string }
  style: Record<string, unknown>
  resource_type: string | null
  resource_id: string | null
  locked: boolean
}

export interface CanvasConnector {
  id: string
  source_item_id: string
  target_item_id: string
  source_handle: string | null
  target_handle: string | null
  label: string
  style: Record<string, unknown>
}

export interface CampaignWhiteboardResponse {
  board: {
    id: string
    campaign_id: string
    title: string
    revision: number
    viewport: Viewport
  }
  items: CanvasItem[]
  connectors: CanvasConnector[]
}

export type CanvasOperation =
  | { op: 'create_item'; item: Record<string, unknown> & { id: string; kind: CanvasItemKind } }
  | { op: 'update_item'; item_id: string; patch: Record<string, unknown> }
  | { op: 'delete_item'; item_id: string }
  | { op: 'create_connector'; connector: Record<string, unknown> & { id: string } }
  | { op: 'delete_connector'; connector_id: string }
  | { op: 'update_viewport'; viewport: Viewport }

export interface ApplyCanvasOperationsResult {
  operation_id: string
  committed_revision: number
  idempotent_replay: boolean
  affected_bounds?: { x: number; y: number; width: number; height: number } | null
}
