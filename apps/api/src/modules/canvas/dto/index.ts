import { z } from 'zod'
import { IMAGE_GENERATION_MODEL_IDS } from '../../media/dto'

const adCreativeNodeKindSchema = z.enum([
  'brief',
  'strategy',
  'reference_image',
  'image',
  'edit',
  'variation',
  'copy',
  'carousel',
  'video',
  'overlay',
  'ad',
])

const adCreativeNodeStatusSchema = z.enum(['idle', 'generating', 'ready', 'error'])

const reactFlowViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
})

const reactFlowNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.unknown()).optional().default({}),
})

const reactFlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  data: z.record(z.unknown()).optional(),
})

const reactFlowGraphSchema = z.object({
  nodes: z.array(reactFlowNodeSchema).default([]),
  edges: z.array(reactFlowEdgeSchema).default([]),
})

export const AdSetIdParamSchema = z.object({
  adSetId: z.string().uuid(),
})

export const NodeIdParamSchema = z.object({
  nodeId: z.string().uuid(),
})

export const WhiteboardCampaignParamSchema = z.object({
  campaignId: z.string().uuid(),
})

export const WhiteboardBoardParamSchema = WhiteboardCampaignParamSchema.extend({
  boardId: z.string().uuid(),
})

export const CreateWhiteboardSchema = z.object({
  title: z.string().trim().min(1).max(120),
})

const canvasItemKindSchema = z.enum([
  'sticky_note',
  'text',
  'shape',
  'frame',
  'card',
  'resource_card',
])

const canvasItemSchema = z.object({
  id: z.string().uuid(),
  kind: canvasItemKindSchema,
  position_x: z.number().finite(),
  position_y: z.number().finite(),
  width: z.number().positive().max(10000).optional(),
  height: z.number().positive().max(10000).optional(),
  rotation: z.number().finite().optional(),
  z_index: z.number().int().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  content: z.record(z.unknown()).optional(),
  style: z.record(z.unknown()).optional(),
  resource_type: z.string().max(64).optional(),
  resource_id: z.string().uuid().optional(),
  locked: z.boolean().optional(),
})

const canvasConnectorSchema = z.object({
  id: z.string().uuid(),
  source_item_id: z.string().uuid(),
  target_item_id: z.string().uuid(),
  source_handle: z.string().max(64).nullable().optional(),
  target_handle: z.string().max(64).nullable().optional(),
  label: z.string().max(500).optional(),
  style: z.record(z.unknown()).optional(),
})

const canvasOperationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create_item'), item: canvasItemSchema }),
  z.object({
    op: z.literal('update_item'),
    item_id: z.string().uuid(),
    patch: canvasItemSchema.omit({ id: true, kind: true }).partial(),
  }),
  z.object({ op: z.literal('delete_item'), item_id: z.string().uuid() }),
  z.object({ op: z.literal('create_connector'), connector: canvasConnectorSchema }),
  z.object({ op: z.literal('delete_connector'), connector_id: z.string().uuid() }),
  z.object({
    op: z.literal('update_viewport'),
    viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number().positive().max(10) }),
  }),
])

export const ApplyWhiteboardOperationsSchema = z.object({
  base_revision: z.number().int().nonnegative(),
  idempotency_key: z.string().min(1).max(200),
  operations: z.array(canvasOperationSchema).min(1).max(100),
  actor_agent_key: z.string().min(1).max(64).optional(),
})

export const UndoWhiteboardOperationSchema = z.object({
  operation_id: z.string().uuid(),
})

export const SaveCanvasGraphSchema = z.object({
  graph: reactFlowGraphSchema,
  viewport: reactFlowViewportSchema,
  default_model_id: z.string().optional(),
})

export const CreateCanvasNodeSchema = z.object({
  canvas_id: z.string().uuid(),
  kind: adCreativeNodeKindSchema,
  status: adCreativeNodeStatusSchema.optional(),
  parent_node_id: z.string().uuid().nullable().optional(),
  parent_image_node_id: z.string().uuid().nullable().optional(),
  ad_id: z.string().uuid().nullable().optional(),
  image_asset_id: z.string().uuid().nullable().optional(),
  payload: z.record(z.unknown()).optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
})

export const UpdateCanvasNodeSchema = z.object({
  kind: adCreativeNodeKindSchema.optional(),
  status: adCreativeNodeStatusSchema.optional(),
  parent_node_id: z.string().uuid().nullable().optional(),
  parent_image_node_id: z.string().uuid().nullable().optional(),
  ad_id: z.string().uuid().nullable().optional(),
  image_asset_id: z.string().uuid().nullable().optional(),
  payload: z.record(z.unknown()).optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
})

export const DelegateToAgentSchema = z.object({
  node_id: z.string().uuid(),
  canvas_id: z.string().uuid(),
  agent_key: z.string().min(1).max(64),
  intent: z.string().min(1).max(128),
  user_brief: z.string().min(1).max(12000),
  parent_image_asset_id: z.string().uuid().optional(),
  strategy_key: z.string().max(64).optional(),
  model: z.enum(IMAGE_GENERATION_MODEL_IDS).optional(),
})

export const CanvasNodeActionSchema = z.object({
  prompt: z.string().min(1).max(12000).optional(),
  model: z.enum(IMAGE_GENERATION_MODEL_IDS).optional(),
  model_id: z.enum(IMAGE_GENERATION_MODEL_IDS).optional(),
  aspect_ratio: z.enum(['1:1', '16:9', '9:16', '3:2', '4:3']).optional(),
  campaign_id: z.string().uuid().optional(),
  parent_image_url: z.string().url().optional(),
  parent_image_asset_id: z.string().uuid().optional(),
  base_image_url: z.string().url().optional(),
  base_image_asset_id: z.string().uuid().optional(),
})

export type AdSetIdParam = z.infer<typeof AdSetIdParamSchema>
export type NodeIdParam = z.infer<typeof NodeIdParamSchema>
export type SaveCanvasGraphDto = z.infer<typeof SaveCanvasGraphSchema>
export type CreateCanvasNodeDto = z.infer<typeof CreateCanvasNodeSchema>
export type UpdateCanvasNodeDto = z.infer<typeof UpdateCanvasNodeSchema>
export type DelegateToAgentDto = z.infer<typeof DelegateToAgentSchema>
export type CanvasNodeActionDto = z.infer<typeof CanvasNodeActionSchema>
export type WhiteboardCampaignParam = z.infer<typeof WhiteboardCampaignParamSchema>
export type WhiteboardBoardParam = z.infer<typeof WhiteboardBoardParamSchema>
export type CreateWhiteboardDto = z.infer<typeof CreateWhiteboardSchema>
export type ApplyWhiteboardOperationsDto = z.infer<typeof ApplyWhiteboardOperationsSchema>
export type UndoWhiteboardOperationDto = z.infer<typeof UndoWhiteboardOperationSchema>
