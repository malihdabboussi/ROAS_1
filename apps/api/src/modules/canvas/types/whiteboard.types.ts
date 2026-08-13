export interface WhiteboardNodeData {
  kind: 'note' | 'text' | 'card' | 'shape'
  title: string
  text: string
  resource_type?: string
  resource_id?: string
}

export interface WhiteboardGraph {
  nodes: Array<{
    id: string
    type: 'whiteboard'
    position: { x: number; y: number }
    data: WhiteboardNodeData
  }>
  edges: Array<{ id: string; source: string; target: string }>
}

export interface CampaignWhiteboardRow {
  id: string
  campaign_id: string
  user_id: string
  graph: WhiteboardGraph
  viewport: { x: number; y: number; zoom: number }
  title: string
  revision: number
  created_at: string
  updated_at: string
}

export interface CanvasItemRow {
  id: string
  board_id: string
  kind: 'sticky_note' | 'text' | 'shape' | 'frame' | 'card' | 'resource_card'
  position_x: number
  position_y: number
  width: number
  height: number
  rotation: number
  z_index: number
  parent_id: string | null
  content: Record<string, unknown>
  style: Record<string, unknown>
  resource_type: string | null
  resource_id: string | null
  locked: boolean
}

export interface CanvasConnectorRow {
  id: string
  board_id: string
  source_item_id: string
  target_item_id: string
  source_handle: string | null
  target_handle: string | null
  label: string
  style: Record<string, unknown>
}
