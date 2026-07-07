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
