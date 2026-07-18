import { z } from 'zod'
import { MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH } from '../constants/field-limits'
import { AgentKeySchema, MissionPrioritySchema, OrgIdSchema } from './mission-core.dto'
import { IntentPacketSchema, PlanSubtaskSchema } from './mission-plan.dto'

export const ManagerAmendFieldsDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  title: z.string().min(1).max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).optional(),
  brief: z.string().max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).optional(),
  progress_notes: z.string().max(4000).optional(),
  priority: MissionPrioritySchema.optional(),
  idempotency_key: z.string().min(8).max(255).optional(),
})
export type ManagerAmendFieldsDto = z.infer<typeof ManagerAmendFieldsDtoSchema>

export const ManagerAppendSubtasksDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  subtasks: z.array(PlanSubtaskSchema).min(1).max(5),
  idempotency_key: z.string().min(8).max(255).optional(),
})
export type ManagerAppendSubtasksDto = z.infer<typeof ManagerAppendSubtasksDtoSchema>

export const ManagerPrepareReplanDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  reason: z.string().max(2000).optional(),
  idempotency_key: z.string().min(8).max(255).optional(),
})
export type ManagerPrepareReplanDto = z.infer<typeof ManagerPrepareReplanDtoSchema>

export const ManagerCancelSubtaskDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  subtask_id: z.string().uuid(),
  idempotency_key: z.string().min(8).max(255).optional(),
})
export type ManagerCancelSubtaskDto = z.infer<typeof ManagerCancelSubtaskDtoSchema>

export const ManagerEditSubtaskDtoSchema = z
  .object({
    mission_id: z.string().uuid(),
    user_id: z.string().uuid(),
    org_id: OrgIdSchema,
    subtask_id: z.string().uuid(),
    title: z.string().min(1).max(500).optional(),
    assigned_agent_key: AgentKeySchema.optional(),
    dependsOn: z.array(z.string().uuid()).max(100).optional(),
    intent: IntentPacketSchema.partial().optional(),
    idempotency_key: z.string().min(8).max(255).optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.assigned_agent_key !== undefined ||
      v.dependsOn !== undefined ||
      v.intent !== undefined,
    { message: 'At least one of title, assigned_agent_key, dependsOn, intent is required' },
  )
export type ManagerEditSubtaskDto = z.infer<typeof ManagerEditSubtaskDtoSchema>

export const ManagerRetrySubtaskDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  subtask_id: z.string().uuid(),
  idempotency_key: z.string().min(8).max(255).optional(),
})
export type ManagerRetrySubtaskDto = z.infer<typeof ManagerRetrySubtaskDtoSchema>

export const AwarenessSessionExtensionSchema = z.object({
  awareness_session_id: z.string().uuid().optional(),
})

export const AwarenessAppendSubtasksDtoSchema = ManagerAppendSubtasksDtoSchema.merge(
  AwarenessSessionExtensionSchema,
)
export type AwarenessAppendSubtasksDto = z.infer<typeof AwarenessAppendSubtasksDtoSchema>

export const AwarenessCancelSubtaskDtoSchema = ManagerCancelSubtaskDtoSchema.merge(
  AwarenessSessionExtensionSchema,
)
export type AwarenessCancelSubtaskDto = z.infer<typeof AwarenessCancelSubtaskDtoSchema>

export const AwarenessEditSubtaskDtoSchema = z
  .object({
    mission_id: z.string().uuid(),
    user_id: z.string().uuid(),
    org_id: OrgIdSchema,
    subtask_id: z.string().uuid(),
    title: z.string().min(1).max(500).optional(),
    assigned_agent_key: AgentKeySchema.optional(),
    dependsOn: z.array(z.string().uuid()).max(100).optional(),
    intent: IntentPacketSchema.partial().optional(),
    idempotency_key: z.string().min(8).max(255).optional(),
    awareness_session_id: z.string().uuid().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.assigned_agent_key !== undefined ||
      v.dependsOn !== undefined ||
      v.intent !== undefined,
    { message: 'At least one of title, assigned_agent_key, dependsOn, intent is required' },
  )
export type AwarenessEditSubtaskDto = z.infer<typeof AwarenessEditSubtaskDtoSchema>

export const AwarenessRetrySubtaskDtoSchema = ManagerRetrySubtaskDtoSchema.merge(
  AwarenessSessionExtensionSchema,
)
export type AwarenessRetrySubtaskDto = z.infer<typeof AwarenessRetrySubtaskDtoSchema>

export const AwarenessReplanDtoSchema = ManagerPrepareReplanDtoSchema.merge(
  AwarenessSessionExtensionSchema,
)
export type AwarenessReplanDto = z.infer<typeof AwarenessReplanDtoSchema>

export const AwarenessPauseMissionDtoSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  org_id: OrgIdSchema,
  awareness_session_id: z.string().uuid().optional(),
})

export type AwarenessPauseMissionDto = z.infer<typeof AwarenessPauseMissionDtoSchema>

export const AwarenessAmendDtoSchema = ManagerAmendFieldsDtoSchema.merge(
  AwarenessSessionExtensionSchema,
)
export type AwarenessAmendDto = z.infer<typeof AwarenessAmendDtoSchema>

export const InternalAwarenessRetryDtoSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  org_id: OrgIdSchema,
  awareness_session_id: z.string().uuid().optional(),
})

export type InternalAwarenessRetryDto = z.infer<typeof InternalAwarenessRetryDtoSchema>

export const InternalAwarenessCommentDtoSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  org_id: OrgIdSchema,
  message: z.string().min(1).max(4000),
  awareness_session_id: z.string().uuid().optional(),
})

export type InternalAwarenessCommentDto = z.infer<typeof InternalAwarenessCommentDtoSchema>

export const InternalAwarenessReassignDtoSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  org_id: OrgIdSchema,
  assigned_agent_key: AgentKeySchema,
  awareness_session_id: z.string().uuid().optional(),
})

export type InternalAwarenessReassignDto = z.infer<typeof InternalAwarenessReassignDtoSchema>

export const InternalAwarenessNudgeSubtaskDtoSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  org_id: OrgIdSchema,
  subtask_id: z.string().uuid(),
  awareness_session_id: z.string().uuid().optional(),
})

export type InternalAwarenessNudgeSubtaskDto = z.infer<
  typeof InternalAwarenessNudgeSubtaskDtoSchema
>

export const InternalAwarenessProgressNotesDtoSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  org_id: OrgIdSchema,
  note: z.string().min(1).max(4000),
  awareness_session_id: z.string().uuid().optional(),
})

export type InternalAwarenessProgressNotesDto = z.infer<
  typeof InternalAwarenessProgressNotesDtoSchema
>

export const InternalCreateMissionDtoSchema = z.object({
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  title: z.string().min(1).max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH),
  brief: z.string().max(MISSION_TITLE_BRIEF_DESCRIPTION_MAX_LENGTH).optional(),
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  source_space_item_id: z.string().uuid().optional(),
  assigned_agent_key: AgentKeySchema.optional(),
  idempotency_key: z.string().min(8).max(255).optional(),
  input: z.record(z.unknown()).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
})

export type InternalCreateMissionDto = z.infer<typeof InternalCreateMissionDtoSchema>

export const FireAgentHandoffDtoSchema = z
  .object({
    scope: z.enum(['default', 'agent', 'campaign']),
    agent_key: AgentKeySchema.optional(),
    campaign_id: z.string().uuid().optional(),
  })
  .refine((v) => (v.scope === 'agent' ? !!v.agent_key : true), {
    message: 'handoff.agent_key is required when scope is agent',
  })
  .refine((v) => (v.scope === 'campaign' ? !!v.campaign_id : true), {
    message: 'handoff.campaign_id is required when scope is campaign',
  })

export type FireAgentHandoffDto = z.infer<typeof FireAgentHandoffDtoSchema>

export const FireAgentDtoSchema = z.object({
  handoff: FireAgentHandoffDtoSchema.nullable().optional(),
})

export type FireAgentDto = z.infer<typeof FireAgentDtoSchema>
