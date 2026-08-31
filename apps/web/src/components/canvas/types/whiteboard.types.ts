import type { Edge, Node, Viewport } from '@xyflow/react'

export type WhiteboardNodeKind = 'note' | 'text' | 'card' | 'shape' | 'frame'
export type WhiteboardTool = 'select' | 'hand' | WhiteboardNodeKind | 'connector'
export type CanvasItemKind = 'sticky_note' | 'text' | 'shape' | 'frame' | 'card' | 'resource_card'
export type CampaignBlueprintSemanticType =
  | 'campaign_stage'
  | 'existing_asset'
  | 'external_url'
  | 'asset_placeholder'
  | 'campaign_note'
export type CampaignBlueprintStatus =
  | 'missing'
  | 'planned'
  | 'creating'
  | 'review'
  | 'ready'
  | 'live'
  | 'dismissed'
  | 'blocked'
export type CanvasPlaceholderAction = 'create' | 'attach' | 'assign' | 'dismiss'
export type CanvasVisualRole =
  | 'live'
  | 'complete'
  | 'dead_end'
  | 'changed'
  | 'to_build'
  | 'band'
  | 'frame'
  | 'heading'
  | 'annotation'

export interface CampaignBlueprintSource {
  kind: 'campaign_resource' | 'url' | 'drive' | 'user_input'
  label: string
  url?: string
}

export interface CampaignBlueprintPlaceholder {
  asset_type: string
  brief: string
  missing_fields?: string[]
  suggested_action?: string
}

export interface CampaignBlueprintContent {
  title?: string
  text?: string
  semantic_type?: CampaignBlueprintSemanticType
  blueprint_id?: string
  stage_key?: string
  stage_order?: number
  status?: CampaignBlueprintStatus
  source?: CampaignBlueprintSource
  placeholder?: CampaignBlueprintPlaceholder
  visual_role?: CanvasVisualRole
  metric?: string
}

export interface PersistedWhiteboardNodeData extends Record<string, unknown> {
  kind: WhiteboardNodeKind
  title: string
  text: string
  resource_type?: string
  resource_id?: string
  locked?: boolean
  width?: number
  height?: number
  semantic_type?: CampaignBlueprintSemanticType
  blueprint_id?: string
  stage_key?: string
  stage_order?: number
  status?: CampaignBlueprintStatus
  source?: CampaignBlueprintSource
  placeholder?: CampaignBlueprintPlaceholder
}

export interface WhiteboardNodeData extends PersistedWhiteboardNodeData {
  onContentChange: (nodeId: string, patch: Partial<PersistedWhiteboardNodeData>) => void
  onSizeChange: (nodeId: string, width: number, height: number) => void
  onPlaceholderAction?: (nodeId: string, action: CanvasPlaceholderAction) => void
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
  content: CampaignBlueprintContent
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
  board: CampaignWhiteboard
  items: CanvasItem[]
  connectors: CanvasConnector[]
}

export interface CampaignWhiteboard {
  id: string
  campaign_id: string
  title: string
  revision: number
  viewport: Viewport
  is_default: boolean
}

export interface CampaignWhiteboardListResponse {
  boards: CampaignWhiteboard[]
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
