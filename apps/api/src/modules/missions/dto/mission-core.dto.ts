import { z } from 'zod'
import { MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH } from '../constants/field-limits'

export const MissionStatusSchema = z.enum([
  'inbox',
  'planning',
  'todo',
  'in_progress',
  'review',
  'blocked',
  'done',
  'error',
  'failed',
  'backlog',
  'pending_approval',
  'awaiting_access_approval',
])

export const AgentKeySchema = z.string().min(1).max(100)
export const MissionPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const OrgIdSchema = z.string().uuid().nullable().optional()

export const CreateMissionDtoSchema = z.object({
  title: z.string().min(1).max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH),
  brief: z.string().max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).optional(),
  description: z.string().max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).optional(),
  priority: MissionPrioritySchema.optional(),
  assigned_agent_key: AgentKeySchema.optional(),
  input: z.record(z.unknown()).optional(),
  idempotency_key: z.string().min(8).max(255).optional(),
  parent_mission_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  source_space_item_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
})

export type CreateMissionDto = z.infer<typeof CreateMissionDtoSchema>

export const UpdateMissionStatusDtoSchema = z.object({
  status: MissionStatusSchema,
  error: z.string().max(4000).nullable().optional(),
  output: z.record(z.unknown()).optional(),
  current_agent_key: AgentKeySchema.optional(),
  retry_count: z.number().int().min(0).optional(),
})

export type UpdateMissionStatusDto = z.infer<typeof UpdateMissionStatusDtoSchema>

export const InternalMissionCallbackDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  status: MissionStatusSchema,
  current_agent_key: AgentKeySchema.optional(),
  retry_count: z.number().int().min(0).optional(),
  error: z.string().max(4000).nullable().optional(),
  output: z.record(z.unknown()).optional(),
  event_type: z.string().min(1).max(120).optional(),
  event_payload: z.record(z.unknown()).optional(),
})

export type InternalMissionCallbackDto = z.infer<typeof InternalMissionCallbackDtoSchema>

export const MissionIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type MissionIdParam = z.infer<typeof MissionIdParamSchema>

export const SubtaskIdParamSchema = z.object({
  subtaskId: z.string().uuid(),
})

export type SubtaskIdParam = z.infer<typeof SubtaskIdParamSchema>

export const MissionListQuerySchema = z.object({
  status: MissionStatusSchema.optional(),
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  agent_keys: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .transform((v) => (Array.isArray(v) ? v : v.split(',')))
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
})

export type MissionListQuery = z.infer<typeof MissionListQuerySchema>

export const UpdateMissionDtoSchema = z
  .object({
    title: z.string().min(1).max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).optional(),
    brief: z.string().max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    priority: MissionPrioritySchema.optional(),
    assigned_agent_key: AgentKeySchema.nullable().optional(),
    scheduled_at: z.string().datetime().nullable().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.brief !== undefined ||
      value.priority !== undefined ||
      value.assigned_agent_key !== undefined ||
      value.scheduled_at !== undefined,
    {
      message: 'At least one update field is required',
    },
  )

export type UpdateMissionDto = z.infer<typeof UpdateMissionDtoSchema>

export const PromoteVibeyDtoSchema = z.object({
  archetype: z.literal('ceo'),
})

export type PromoteVibeyDto = z.infer<typeof PromoteVibeyDtoSchema>

export const RateMissionDtoSchema = z
  .object({
    thumbs_up: z.boolean().optional(),
    rating: z.number().int().min(1).max(10).optional(),
    feedback: z.string().max(4000).optional(),
  })
  .refine((v) => v.thumbs_up !== undefined || v.rating !== undefined, {
    message: 'At least one of thumbs_up or rating is required',
  })

export type RateMissionDto = z.infer<typeof RateMissionDtoSchema>
