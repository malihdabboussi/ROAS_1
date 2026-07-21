import { z } from 'zod'

export const SlackInstallQuerySchema = z.object({
  agent_key: z.string().min(1),
  return_to: z.string().optional(),
})
export type SlackInstallQuery = z.infer<typeof SlackInstallQuerySchema>

export const SlackChannelMapDtoSchema = z.object({
  agent_key: z.string().min(1),
  channel_id: z.string().min(1),
  channel_name: z.string().min(1),
})
export type SlackChannelMapDto = z.infer<typeof SlackChannelMapDtoSchema>

// Agent tool DTOs — shape mirrors integration_capabilities.parameters for the
// corresponding SLACK_* action slug.

export const SlackSearchQuerySchema = z.object({
  query: z.string().min(1),
  count: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['score', 'timestamp']).optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().optional(),
})
export type SlackSearchQuery = z.infer<typeof SlackSearchQuerySchema>

export const SlackSendMessageDtoSchema = z.object({
  channel_id: z.string().min(1),
  text: z.string().min(1),
  thread_ts: z.string().optional(),
})
export type SlackSendMessageDto = z.infer<typeof SlackSendMessageDtoSchema>

export const SlackUpdateMessageDtoSchema = z.object({
  channel_id: z.string().min(1),
  ts: z.string().min(1),
  text: z.string().min(1),
})
export type SlackUpdateMessageDto = z.infer<typeof SlackUpdateMessageDtoSchema>

export const SlackDeleteMessageDtoSchema = z.object({
  channel_id: z.string().min(1),
  ts: z.string().min(1),
})
export type SlackDeleteMessageDto = z.infer<typeof SlackDeleteMessageDtoSchema>

export const SlackChannelHistoryQuerySchema = z.object({
  channel_id: z.string().min(1),
  limit: z.coerce.number().int().positive().max(200).optional(),
})
export type SlackChannelHistoryQuery = z.infer<typeof SlackChannelHistoryQuerySchema>

export const SlackThreadRepliesQuerySchema = z.object({
  channel_id: z.string().min(1),
  thread_ts: z.string().min(1),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().optional(),
})
export type SlackThreadRepliesQuery = z.infer<typeof SlackThreadRepliesQuerySchema>

export const SlackReactionDtoSchema = z.object({
  channel_id: z.string().min(1),
  ts: z.string().min(1),
  name: z.string().min(1),
})
export type SlackReactionDto = z.infer<typeof SlackReactionDtoSchema>

export const SlackOpenDmDtoSchema = z.object({
  slack_user_id: z.string().min(1),
})
export type SlackOpenDmDto = z.infer<typeof SlackOpenDmDtoSchema>

export const SlackUploadFileDtoSchema = z.object({
  channel_id: z.string().min(1),
  file_url: z.string().url(),
  filename: z.string().min(1),
  thread_ts: z.string().optional(),
})
export type SlackUploadFileDto = z.infer<typeof SlackUploadFileDtoSchema>

export const SlackUserInfoQuerySchema = z.object({
  slack_user_id: z.string().min(1),
})
export type SlackUserInfoQuery = z.infer<typeof SlackUserInfoQuerySchema>

export const SlackUserByEmailQuerySchema = z.object({
  email: z.string().min(1),
})
export type SlackUserByEmailQuery = z.infer<typeof SlackUserByEmailQuerySchema>

export const SlackFileInfoQuerySchema = z.object({
  file_id: z.string().min(1),
})
export type SlackFileInfoQuery = z.infer<typeof SlackFileInfoQuerySchema>

export const SlackBrainTargetKindSchema = z.enum(['user', 'campaign', 'agent', 'customer'])
export const SlackBrainCadenceSchema = z.enum(['daily', 'weekly', 'monthly'])

export const SlackBrainMappingCreateDtoSchema = z
  .object({
    slack_channel_id: z.string().min(1),
    slack_channel_name: z.string().min(1),
    target_kind: SlackBrainTargetKindSchema,
    target_brain_id: z.string().uuid().nullable().optional(),
    target_campaign_id: z.string().uuid().nullable().optional(),
    cadence: SlackBrainCadenceSchema.default('daily'),
  })
  .superRefine((value, ctx) => {
    if (value.target_kind === 'campaign' && !value.target_campaign_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_campaign_id'],
        message: 'target_campaign_id is required for campaign mappings',
      })
    }
    if ((value.target_kind === 'user' || value.target_kind === 'agent') && !value.target_brain_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_brain_id'],
        message: 'target_brain_id is required for user and agent mappings',
      })
    }
    if (value.target_kind === 'customer' && (value.target_brain_id || value.target_campaign_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_kind'],
        message: 'Customer mappings resolve the customer brain automatically',
      })
    }
  })
export type SlackBrainMappingCreateDto = z.infer<typeof SlackBrainMappingCreateDtoSchema>

export const SlackBrainMappingUpdateDtoSchema = z.object({
  cadence: SlackBrainCadenceSchema.optional(),
  enabled: z.boolean().optional(),
})
export type SlackBrainMappingUpdateDto = z.infer<typeof SlackBrainMappingUpdateDtoSchema>

export const SlackBrainMappingIdParamSchema = z.object({
  id: z.string().uuid(),
})
export type SlackBrainMappingIdParam = z.infer<typeof SlackBrainMappingIdParamSchema>

export const SlackBrainAutoIngestDtoSchema = z.object({
  autoIngest: z.boolean(),
})
export type SlackBrainAutoIngestDto = z.infer<typeof SlackBrainAutoIngestDtoSchema>

export const SlackPersonBrainBackfillDtoSchema = z.object({
  lookback_days: z.coerce.number().int().min(1).max(365).default(90),
})
export type SlackPersonBrainBackfillDto = z.infer<typeof SlackPersonBrainBackfillDtoSchema>

export const SlackAttachSenderDtoSchema = z.object({
  slack_user_id: z.string().min(1),
  contact_id: z.string().uuid(),
})
export type SlackAttachSenderDto = z.infer<typeof SlackAttachSenderDtoSchema>

export const SlackPersonIdParamSchema = z.object({
  id: z.string().uuid(),
})
export type SlackPersonIdParam = z.infer<typeof SlackPersonIdParamSchema>

export const SlackDeliveryModeSchema = z.enum(['off', 'shadow', 'active'])
export const SlackDeliveryModeDtoSchema = z.object({
  delivery_mode: SlackDeliveryModeSchema,
})
export type SlackDeliveryModeDto = z.infer<typeof SlackDeliveryModeDtoSchema>

export const SlackRelationshipKindSchema = z.enum(['internal', 'external', 'ignored'])
export const SlackRelationshipKindDtoSchema = z.object({
  relationship_kind: SlackRelationshipKindSchema,
})
export type SlackRelationshipKindDto = z.infer<typeof SlackRelationshipKindDtoSchema>

export const SlackPersonIdentityDtoSchema = z.object({
  vibey_user_id: z.string().uuid(),
})
export type SlackPersonIdentityDto = z.infer<typeof SlackPersonIdentityDtoSchema>

export const SlackShadowProposalDtoSchema = z.object({
  proposed_content: z.string().trim().min(1).max(4000),
})
export type SlackShadowProposalDto = z.infer<typeof SlackShadowProposalDtoSchema>

export const SlackShadowActionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
})
export type SlackShadowActionsQuery = z.infer<typeof SlackShadowActionsQuerySchema>

export const SlackShadowActionIdParamSchema = z.object({
  id: z.string().uuid(),
})
export type SlackShadowActionIdParam = z.infer<typeof SlackShadowActionIdParamSchema>

export const SlackShadowReviewDtoSchema = z.object({
  status: z.enum(['approved', 'dismissed']),
})
export type SlackShadowReviewDto = z.infer<typeof SlackShadowReviewDtoSchema>
