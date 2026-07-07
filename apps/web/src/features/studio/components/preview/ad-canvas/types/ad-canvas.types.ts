import type { Edge, Node, Viewport } from '@xyflow/react'
import type { AdStrategyKey } from '@vibey/api-shared/ad-strategies'

export type AdCanvasNodeKind =
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

export type AdCanvasNodeStatus = 'idle' | 'generating' | 'ready' | 'error'

export type AdCanvasEdgeKind = 'reference' | 'evolution' | 'conversion'

export type GenerationSource = 'direct' | 'agent'

export interface AdCanvasAgentOption {
  agentKey: string
  displayName: string
  description?: string
  role?: string
}

export type AdCanvasNodeAction = 'generate' | 'edit' | 'variation'

export interface AdCanvasBriefPayload {
  title?: string
  brief?: string
  text?: string
  audience?: string
  offer?: string
  brand_guidelines?: string
  attached_assets?: string
  reference_description?: string
  concepts_text?: string
  concept_text?: string
}

export interface AdCanvasStrategyPayload {
  strategy_key?: AdStrategyKey
  notes?: string
}

export interface AdCanvasReferenceImagePayload {
  image_url?: string
  image_asset_id?: string
  label?: string
}

export interface AdCanvasImagePayload {
  prompt?: string
  image_url?: string
  image_asset_id?: string
  model_id?: string
  aspect_ratio?: string
}

export interface AdCanvasEditPayload {
  prompt?: string
  image_url?: string
  image_asset_id?: string
  model_id?: string
}

export interface AdCanvasVariationPayload {
  prompt?: string
  image_url?: string
  image_asset_id?: string
  model_id?: string
}

export interface AdCanvasCopyPayload {
  primary_text?: string
  headline?: string
  description?: string
}

export interface AdCanvasCarouselPayload {
  cards?: Array<{ image_url?: string; headline?: string }>
}

export interface AdCanvasVideoPayload {
  prompt?: string
  video_url?: string
}

export interface AdCanvasOverlayPayload {
  text?: string
  position?: string
}

export interface AdCanvasAdPayload {
  ad_id?: string
}

export type AdCanvasNodePayload =
  | AdCanvasBriefPayload
  | AdCanvasStrategyPayload
  | AdCanvasReferenceImagePayload
  | AdCanvasImagePayload
  | AdCanvasEditPayload
  | AdCanvasVariationPayload
  | AdCanvasCopyPayload
  | AdCanvasCarouselPayload
  | AdCanvasVideoPayload
  | AdCanvasOverlayPayload
  | AdCanvasAdPayload
  | Record<string, unknown>

export interface AdCanvasNodeRecord {
  id: string
  canvas_id: string
  kind: AdCanvasNodeKind
  status: AdCanvasNodeStatus
  parent_node_id: string | null
  parent_image_node_id: string | null
  ad_id: string | null
  image_asset_id: string | null
  payload: AdCanvasNodePayload
  position_x: number
  position_y: number
  created_at?: string
  updated_at?: string
}

export interface AdCanvasGraphEdge {
  id: string
  source: string
  target: string
  kind: AdCanvasEdgeKind
  source_handle?: string | null
  target_handle?: string | null
}

export interface AdCanvasGraph {
  nodes: Array<{
    id: string
    type?: string
    position?: { x: number; y: number }
    data?: Record<string, unknown>
  }>
  edges: AdCanvasGraphEdge[]
}

export interface AdCreativeCanvas {
  id: string
  ad_set_id: string
  default_model_id: string
  graph: AdCanvasGraph
  viewport: Viewport
  nodes: AdCanvasNodeRecord[]
}

export interface AdCanvasFlowNodeData extends Record<string, unknown> {
  canvas_node_id: string
  kind: AdCanvasNodeKind
  status: AdCanvasNodeStatus
  parent_node_id: string | null
  parent_image_node_id: string | null
  ad_id: string | null
  image_asset_id: string | null
  payload: AdCanvasNodePayload
  generation_source?: GenerationSource
  model_id?: string
  agent_key?: string
}

export type AdCanvasFlowNode = Node<AdCanvasFlowNodeData, AdCanvasNodeKind>

export interface AdCanvasFlowEdgeData extends Record<string, unknown> {
  canvas_edge_id: string
  kind: AdCanvasEdgeKind
}

export type AdCanvasFlowEdge = Edge<AdCanvasFlowEdgeData, AdCanvasEdgeKind>

export interface SaveAdCanvasLayoutInput {
  canvas_id: string
  viewport: Viewport
  default_model_id?: string
  graph: AdCanvasGraph
  node_positions: Array<{ id: string; position_x: number; position_y: number }>
}

export interface CreateCanvasNodeInput {
  kind: AdCanvasNodeKind
  payload?: AdCanvasNodePayload
  position_x?: number
  position_y?: number
  parent_node_id?: string | null
  parent_image_node_id?: string | null
}

export interface UpdateCanvasNodeInput {
  status?: AdCanvasNodeStatus
  payload?: AdCanvasNodePayload
  position_x?: number
  position_y?: number
  ad_id?: string | null
  image_asset_id?: string | null
}

export interface DelegateToAgentBody {
  node_id: string
  canvas_id: string
  agent_key: string
  intent: AdCanvasNodeAction
  user_brief: string
  parent_image_asset_id?: string
  strategy_key?: string
  model?: string
}

export type DelegateAgentStreamCallbacks = {
  onEvent: (event: Record<string, unknown>) => void
  onDone?: () => void
  onError?: (error: Error) => void
}
