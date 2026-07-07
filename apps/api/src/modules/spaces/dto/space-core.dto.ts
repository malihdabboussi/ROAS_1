import { z } from 'zod'
import { ARTIFACT_VIEW_TYPES } from '../lib/build-artifact-view-def'
import { RecurrenceSpecSchema } from './space-recurrence.dto'

export const SpaceStatusSchema = z.enum(['todo', 'in_progress', 'in_review', 'done'])
/** Task row status: built-ins, archived, or custom ids from the space schema (e.g. Kanban columns). */
export const WritableSpaceItemStatusSchema = z.union([
  SpaceStatusSchema,
  z.literal('archived'),
  z.string().min(1).max(120),
])
export const SpacePrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const AssigneeTypeSchema = z.enum(['human', 'agent', 'unassigned'])
export const SpaceItemAssigneeSchema = z.object({
  type: z.enum(['human', 'agent']),
  id: z.string().min(1).max(255),
})
export const SpaceSourceSchema = z.enum([
  'manual',
  'agent',
  'agent_suggested',
  'template',
  'fathom',
])
const SPACE_ITEM_NOTES_MAX_CHARS = 200000
const SPACE_ITEM_DOC_BODY_MAX_CHARS = 200000
const ChannelsViewConfigSchema = z
  .object({
    channel_ids: z.array(z.string().uuid()),
    active_channel_id: z.string().uuid().optional(),
  })
  .passthrough()

const ChannelViewConfigSchema = z
  .object({
    channel_id: z.string().uuid(),
  })
  .passthrough()

const SpaceViewTypeSchema = z.enum([
  'list',
  'table',
  'kanban',
  'gallery',
  'missions',
  'instagram_research',
  'tiktok_research',
  'youtube_research',
  'twitter_research',
  'all_social_research',
  'ads_research',
  'all_artifacts',
  'docs',
  'contacts',
  'channels',
  'channel',
  'calendar',
  'media',
  'form_responses',
  'campaign_overview',
  'social_reporting',
  'funnel_analytics',
  'email_analytics',
  'ads_performance',
  'finance_overview',
  'funnels',
  'forms',
  'emails',
  'offers',
  'ads',
  'ad_campaigns',
  'sequences',
  'presentations',
  'avatars',
  'social_posts',
  'websites',
])

const SpaceViewDefSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: SpaceViewTypeSchema,
    name: z.string().min(1).max(200),
    channels_config: ChannelsViewConfigSchema.optional(),
    channel_config: ChannelViewConfigSchema.optional(),
  })
  .passthrough()

export const SpaceSchemaDtoSchema = z.record(z.string(), z.unknown()).superRefine((value, ctx) => {
  if ('automations' in value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['automations'],
      message: 'Automations are now managed at /api/spaces/:id/automations',
    })
  }
  if (value.views === undefined) return
  if (!Array.isArray(value.views)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['views'],
      message: 'views must be an array',
    })
    return
  }
  value.views.forEach((view, index) => {
    const parsed = SpaceViewDefSchema.safeParse(view)
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['views', index],
        message: 'Invalid space view',
      })
    }
  })
})

export const CreateSpaceSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  campaign_id: z.string().uuid().optional(),
  is_template: z.boolean().optional(),
  visibility: z.enum(['private', 'team']).optional(),
  schema: SpaceSchemaDtoSchema.optional(),
  default_share_level: z.enum(['admin', 'edit', 'view']).optional(),
})
export type CreateSpaceDto = z.infer<typeof CreateSpaceSchema>

export const UpdateSpaceSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).nullable().optional(),
    campaign_id: z.string().uuid().nullable().optional(),
    is_template: z.boolean().optional(),
    visibility: z.enum(['private', 'team']).optional(),
    schema: SpaceSchemaDtoSchema.optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.campaign_id !== undefined ||
      v.is_template !== undefined ||
      v.visibility !== undefined ||
      v.schema !== undefined,
    { message: 'At least one update field is required' },
  )
export type UpdateSpaceDto = z.infer<typeof UpdateSpaceSchema>

export const CreateSpaceItemSchema = z.object({
  title: z.string().min(1).max(1000),
  status: WritableSpaceItemStatusSchema.optional(),
  priority: SpacePrioritySchema.nullable().optional(),
  assignee_type: AssigneeTypeSchema.optional(),
  assignee_id: z.string().max(255).nullable().optional(),
  assignees: z.array(SpaceItemAssigneeSchema).max(50).optional(),
  start_date: z.string().datetime().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  recurrence: RecurrenceSpecSchema.nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  notes: z.string().max(SPACE_ITEM_NOTES_MAX_CHARS).nullable().optional(),
  doc_body: z.string().max(SPACE_ITEM_DOC_BODY_MAX_CHARS).nullable().optional(),
  source: SpaceSourceSchema.optional(),
  sort_order: z.number().int().min(0).optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  parent_item_id: z.string().uuid().nullable().optional(),
  form_id: z.string().uuid().nullable().optional(),
})
export type CreateSpaceItemDto = z.infer<typeof CreateSpaceItemSchema>

export const UpdateSpaceItemSchema = z
  .object({
    title: z.string().min(1).max(1000).optional(),
    status: WritableSpaceItemStatusSchema.optional(),
    priority: SpacePrioritySchema.nullable().optional(),
    assignee_type: AssigneeTypeSchema.optional(),
    assignee_id: z.string().max(255).nullable().optional(),
    assignees: z.array(SpaceItemAssigneeSchema).max(50).optional(),
    start_date: z.string().datetime().nullable().optional(),
    due_date: z.string().datetime().nullable().optional(),
    recurrence: RecurrenceSpecSchema.nullable().optional(),
    description: z.string().max(20000).nullable().optional(),
    notes: z.string().max(SPACE_ITEM_NOTES_MAX_CHARS).nullable().optional(),
    doc_body: z.string().max(SPACE_ITEM_DOC_BODY_MAX_CHARS).nullable().optional(),
    sort_order: z.number().int().min(0).optional(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
    parent_item_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.status !== undefined ||
      v.priority !== undefined ||
      v.assignee_type !== undefined ||
      v.assignee_id !== undefined ||
      v.assignees !== undefined ||
      v.start_date !== undefined ||
      v.due_date !== undefined ||
      v.recurrence !== undefined ||
      v.description !== undefined ||
      v.notes !== undefined ||
      v.doc_body !== undefined ||
      v.sort_order !== undefined ||
      v.custom_data !== undefined ||
      v.parent_item_id !== undefined,
    { message: 'At least one update field is required' },
  )
export type UpdateSpaceItemDto = z.infer<typeof UpdateSpaceItemSchema>

/** One entry of PATCH /spaces/:id/items/batch — same payload rules as a single item PATCH. */
export const BatchUpdateSpaceItemEntrySchema = z.object({
  item_id: z.string().uuid(),
  payload: UpdateSpaceItemSchema,
})
export const BatchUpdateSpaceItemsSchema = z.object({
  /** 500 covers a full renumber of large list reorders (one update per shifted row). */
  updates: z.array(BatchUpdateSpaceItemEntrySchema).min(1).max(500),
})
export type BatchUpdateSpaceItemsDto = z.infer<typeof BatchUpdateSpaceItemsSchema>

export const SpaceQuerySchema = z.object({
  campaign_id: z.string().uuid().optional(),
  cursor: z.string().max(500).optional(),
  general: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  paginated: z.coerce.boolean().optional().default(false),
})
export type SpaceQuery = z.infer<typeof SpaceQuerySchema>

export const SpaceItemQuerySchema = z.object({
  item_kind: z.enum(['all', 'task', 'doc', 'view_item']).optional().default('all'),
  parent_scope: z.enum(['all', 'top_level', 'children']).optional().default('all'),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})
export type SpaceItemQuery = z.infer<typeof SpaceItemQuerySchema>

export const TransferSpaceItemSchema = z.object({
  target_space_id: z.string().uuid(),
  mode: z.enum(['move', 'copy']),
})
export type TransferSpaceItemDto = z.infer<typeof TransferSpaceItemSchema>

export const DuplicateSpaceItemIncludeSchema = z
  .object({
    status: z.boolean().optional(),
    priority: z.boolean().optional(),
    assignees: z.boolean().optional(),
    start_date: z.boolean().optional(),
    due_date: z.boolean().optional(),
    description: z.boolean().optional(),
    notes: z.boolean().optional(),
    /** Keys to copy from `custom_data` (e.g. tags + each user-defined field). */
    custom_field_ids: z.array(z.string().min(1).max(120)).max(200).optional(),
    subtasks: z.boolean().optional(),
    recurrence: z.boolean().optional(),
    mission: z.boolean().optional(),
    /** Copy comment text / mentions / link previews from comment activity rows. */
    comments: z.boolean().optional(),
    /** Copy attachment files referenced in comment activity rows. */
    documents: z.boolean().optional(),
    /** Copy agent task execution activity rows (deliverables / agent outputs). */
    deliverables: z.boolean().optional(),
  })
  .default({})

export const DuplicateSpaceItemSchema = z.object({
  include: DuplicateSpaceItemIncludeSchema.optional().default({}),
  /** When omitted, the API uses `"{source title} (copy)"`. */
  title: z.string().min(1).max(1000).optional(),
})
export type DuplicateSpaceItemDto = z.infer<typeof DuplicateSpaceItemSchema>

export const EnsureSpaceViewSchema = z.object({
  campaign_id: z.string().uuid().nullable(),
  view_type: z.enum(ARTIFACT_VIEW_TYPES),
  view_name: z.string().min(1).max(200).optional(),
  pinned_to_start: z.boolean().optional(),
})
export type EnsureSpaceViewDto = z.infer<typeof EnsureSpaceViewSchema>

export const SpaceIdParamSchema = z.object({ id: z.string().uuid() })
export type SpaceIdParam = z.infer<typeof SpaceIdParamSchema>

export const SpaceItemIdParamSchema = z.object({ itemId: z.string().uuid() })
export type SpaceItemIdParam = z.infer<typeof SpaceItemIdParamSchema>

export const UndoAgentTaskEditsSchema = z
  .object({
    agent_message_id: z.string().uuid(),
    direction: z.enum(['undo', 'redo']).default('undo'),
    mode: z.enum(['strict', 'force']).default('strict'),
  })
  .strict()
export type UndoAgentTaskEditsDto = z.infer<typeof UndoAgentTaskEditsSchema>
