export type AdCreativeNodeKind =
  | 'brief'
  | 'strategy'
  | 'reference_image'
  | 'image'
  | 'edit'
  | 'variation'
  | 'copy'
  | 'carousel'
  | 'video'
  | 'overlay'
  | 'ad'

export type AdCreativeNodeStatus = 'idle' | 'generating' | 'ready' | 'error'

export interface AdCreativeCanvasRow {
  id: string
  ad_set_id: string
  user_id: string
  org_id: string | null
  default_model_id: string
  graph: ReactFlowGraph
  viewport: ReactFlowViewport
  created_at: string
  updated_at: string
}

export interface AdCreativeNodeRow {
  id: string
  canvas_id: string
  user_id: string
  org_id: string | null
  kind: AdCreativeNodeKind
  status: AdCreativeNodeStatus
  parent_node_id: string | null
  parent_image_node_id: string | null
  ad_id: string | null
  image_asset_id: string | null
  payload: Record<string, unknown>
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface ReactFlowViewport {
  x: number
  y: number
  zoom: number
}

export interface ReactFlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface ReactFlowEdge {
  id: string
  source: string
  target: string
  type?: string
  data?: Record<string, unknown>
}

export interface ReactFlowGraph {
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
}

export interface CreateAdCreativeNodeInput {
  canvas_id: string
  user_id: string
  org_id?: string | null
  kind: AdCreativeNodeKind
  status?: AdCreativeNodeStatus
  parent_node_id?: string | null
  parent_image_node_id?: string | null
  ad_id?: string | null
  image_asset_id?: string | null
  payload?: Record<string, unknown>
  position_x?: number
  position_y?: number
}

export interface UpdateAdCreativeNodePatch {
  kind?: AdCreativeNodeKind
  status?: AdCreativeNodeStatus
  parent_node_id?: string | null
  parent_image_node_id?: string | null
  ad_id?: string | null
  image_asset_id?: string | null
  payload?: Record<string, unknown>
  position_x?: number
  position_y?: number
}
