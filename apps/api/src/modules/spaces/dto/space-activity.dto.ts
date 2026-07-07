import { z } from 'zod'

export const PushToAgentBodySchema = z
  .object({
    include: z.record(z.boolean()).optional(),
    preferred_agent_keys: z.array(z.string().min(1).max(100)).max(20).optional(),
    extra_notes: z.string().max(10000).optional(),
  })
  .optional()
  .default({})
export type PushToAgentBody = z.infer<typeof PushToAgentBodySchema>

export const VisualizeDocBodySchema = z
  .object({
    style_hint: z.string().max(200).optional(),
    prompt: z.string().max(10000).optional(),
    force: z.boolean().optional(),
  })
  .optional()
  .default({})
export type VisualizeDocBody = z.infer<typeof VisualizeDocBodySchema>

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export const ActivityMentionSchema = z.object({
  type: z.enum([
    'user',
    'agent',
    'task',
    'doc',
    'channel',
    'space',
    'mission',
    'person',
    'conversation',
  ]),
  user_id: z.string().uuid().optional(),
  agent_key: z.string().optional(),
  entity_id: z.string().optional(),
  label: z.string().optional(),
})
export type ActivityMentionDto = z.infer<typeof ActivityMentionSchema>

const ActivitySkillKeysSchema = z
  .array(z.string().min(1).max(100).regex(/^[\w][\w-]*$/))
  .max(20)

// ---------------------------------------------------------------------------
// View Overrides
// ---------------------------------------------------------------------------

export const ViewOverrideBodySchema = z.object({
  overrides: z.record(z.string(), z.unknown()),
})
export type ViewOverrideBodyDto = z.infer<typeof ViewOverrideBodySchema>

export const ViewIdParamSchema = z.object({ viewId: z.string().min(1).max(200) })
export type ViewIdParam = z.infer<typeof ViewIdParamSchema>

export const CreateItemActivitySchema = z.object({
  event_type: z.enum(['comment']),
  message: z.string().min(1).max(10000),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number().optional(),
        fileUrl: z.string().url(),
      }),
    )
    .max(10)
    .optional(),
  mentions: z.array(ActivityMentionSchema).max(20).optional(),
  skill_keys: ActivitySkillKeysSchema.optional(),
})
export type CreateItemActivityDto = z.infer<typeof CreateItemActivitySchema>

export const SpaceItemActivityIdParamSchema = z.object({
  itemId: z.string().uuid(),
  activityId: z.string().uuid(),
})
export type SpaceItemActivityIdParam = z.infer<typeof SpaceItemActivityIdParamSchema>

export const UpdateItemActivityCommentSchema = z
  .object({
    message: z.string().min(1).max(10000).optional(),
    /** Rename one uploaded attachment in this comment (matched by file_url). */
    attachment_rename: z
      .object({
        file_url: z.string().min(1).max(2000),
        filename: z.string().min(1).max(300),
      })
      .optional(),
  })
  .refine((v) => v.message !== undefined || v.attachment_rename !== undefined, {
    message: 'message or attachment_rename is required',
  })
export type UpdateItemActivityCommentDto = z.infer<typeof UpdateItemActivityCommentSchema>

export const InvokeTaskAgentBodySchema = z.object({
  agent_key: z.string().min(1).max(100),
  agent_label: z.string().max(200).optional(),
  include: z.record(z.boolean()).optional(),
  extra_notes: z.string().max(10000).optional(),
  skill_keys: ActivitySkillKeysSchema.optional(),
  mentions: z.array(ActivityMentionSchema).max(20).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number().optional(),
        fileUrl: z.string().url(),
      }),
    )
    .max(10)
    .optional(),
})
export type InvokeTaskAgentBody = z.infer<typeof InvokeTaskAgentBodySchema>
