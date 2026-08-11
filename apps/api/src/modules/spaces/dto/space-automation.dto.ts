import { z } from 'zod'
import {
  AutomationActionSchema,
  validatePublishedAutomationActionRules,
} from './space-automation-action.dto'
import { LooseAutomationActionSchema } from './space-automation-draft-action.dto'
import {
  AutomationTriggerSchema,
  LooseAutomationTriggerSchema,
} from './space-automation-trigger.dto'

export const RecentAutomationRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  feed_scope: z.enum(['workspace', 'personal', 'all', 'org']).optional(),
  feed_org_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  /** When true (default), only runs triggered by the current user are returned. */
  mine_only: z.coerce.boolean().optional().default(true),
})
export type RecentAutomationRunsQuery = z.infer<typeof RecentAutomationRunsQuerySchema>

export const SpaceAutomationSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).nullable().optional(),
    enabled: z.boolean(),
    is_draft: z.boolean().optional(),
    trigger: AutomationTriggerSchema,
    actions: z.array(AutomationActionSchema).min(1).max(20),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.is_draft !== true) validatePublishedAutomationActionRules(value.actions, ctx)
  })
export type SpaceAutomationDto = z.infer<typeof SpaceAutomationSchema>

export const CreatePublishedAutomationSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).nullable().optional(),
    enabled: z.boolean().optional().default(true),
    trigger: AutomationTriggerSchema,
    actions: z.array(AutomationActionSchema).min(1).max(20),
  })
  .superRefine((value, ctx) => validatePublishedAutomationActionRules(value.actions, ctx))

export const CreateDraftAutomationSchema = z.object({
  is_draft: z.literal(true),
  name: z.string().max(200),
  description: z.string().max(1000).nullable().optional(),
  enabled: z.boolean().optional().default(false),
  trigger: LooseAutomationTriggerSchema,
  actions: z.array(LooseAutomationActionSchema).max(20),
})

export const CreateAutomationSchema = z.union([
  CreateDraftAutomationSchema,
  CreatePublishedAutomationSchema,
])
export type CreateAutomationDto = z.infer<typeof CreateAutomationSchema>

export const UpdatePublishedAutomationSchema = z
  .object({
    is_draft: z.literal(false).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    enabled: z.boolean().optional(),
    trigger: AutomationTriggerSchema.optional(),
    actions: z.array(AutomationActionSchema).min(1).max(20).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.enabled !== undefined ||
      v.trigger !== undefined ||
      v.actions !== undefined ||
      v.is_draft !== undefined,
    { message: 'At least one update field is required' },
  )
  .superRefine((value, ctx) => validatePublishedAutomationActionRules(value.actions, ctx))

export const UpdateDraftAutomationSchema = z
  .object({
    is_draft: z.literal(true),
    name: z.string().max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    enabled: z.boolean().optional(),
    trigger: LooseAutomationTriggerSchema.optional(),
    actions: z.array(LooseAutomationActionSchema).max(20).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.enabled !== undefined ||
      v.trigger !== undefined ||
      v.actions !== undefined,
    { message: 'At least one update field is required' },
  )

export const UpdateAutomationSchema = z.union([
  UpdateDraftAutomationSchema,
  UpdatePublishedAutomationSchema,
])
export type UpdateAutomationDto = z.infer<typeof UpdateAutomationSchema>

export const AutomationIdParamSchema = z.object({
  automationId: z.string().uuid(),
})
export type AutomationIdParam = z.infer<typeof AutomationIdParamSchema>

export const TemplateKeyParamSchema = z.object({
  templateKey: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})
export type TemplateKeyParam = z.infer<typeof TemplateKeyParamSchema>

export const TestAutomationSchema = z.object({
  item_id: z.string().uuid().optional(),
})
export type TestAutomationDto = z.infer<typeof TestAutomationSchema>

export const PreviewAutomationQuerySchema = z.object({
  preview: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .default('false'),
})
export type PreviewAutomationQuery = z.infer<typeof PreviewAutomationQuerySchema>
