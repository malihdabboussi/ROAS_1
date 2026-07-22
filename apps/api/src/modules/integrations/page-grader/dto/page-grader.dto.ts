import { z } from 'zod'

export const ConnectPageGraderSchema = z.object({
  baseUrl: z.string().url().min(1),
  apiKey: z.string().min(1),
})

export type ConnectPageGraderDto = z.infer<typeof ConnectPageGraderSchema>

export const ListPageGraderClientsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).max(10_000).optional(),
  /** When true (default for settings), page until all clients are returned. */
  all: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      if (typeof value === 'boolean') return value
      return value === 'true'
    }),
})

export type ListPageGraderClientsDto = z.infer<typeof ListPageGraderClientsSchema>

export const PageGraderWorkKindSchema = z.enum(['task', 'task_request'])

export const PageGraderTaskTypeIdSchema = z.enum([
  'design',
  'copy',
  'funnel',
  'ghl',
  'ad',
  'video',
  'other',
  'general',
])

export const SendPageGraderWorkSchema = z.object({
  client_id: z.string().uuid(),
  note: z.string().max(4000).optional(),
  /** YYYY-MM-DD — applied to Page Grader due_date and written back to Space item due_date */
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be YYYY-MM-DD')
    .optional(),
  space_id: z.string().uuid(),
  space_item_ids: z.array(z.string().uuid()).min(1).max(50),
  work_kind: PageGraderWorkKindSchema.optional().default('task_request'),
  task_type: PageGraderTaskTypeIdSchema,
  task_subtype: z.string().min(1).max(160).optional(),
  source_excerpt: z.string().max(4000).optional(),
  open_questions: z.array(z.string().min(1).max(500)).max(20).optional(),
  client_tag_id: z.string().min(1).max(120).optional(),
  client_tag_label: z.string().min(1).max(120).optional(),
  assignee: z
    .object({
      page_grader_user_id: z.string().uuid().optional(),
      email: z.string().email().optional(),
      name: z.string().min(1).max(200).optional(),
    })
    .optional(),
})

export type SendPageGraderWorkDto = z.infer<typeof SendPageGraderWorkSchema>

export const ListPageGraderAssigneesSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
})

export type ListPageGraderAssigneesDto = z.infer<typeof ListPageGraderAssigneesSchema>

export const PageGraderClientScopeMappingSchema = z.object({
  client_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  campaign_name: z.string().min(1).max(200).optional(),
  space_id: z.string().uuid().nullable().optional(),
  space_title: z.string().min(1).max(200).nullable().optional(),
})

export const UpsertPageGraderClientScopeMapSchema = z.object({
  mappings: z.array(PageGraderClientScopeMappingSchema).max(200),
})

export type UpsertPageGraderClientScopeMapDto = z.infer<typeof UpsertPageGraderClientScopeMapSchema>

export const ImportPageGraderClientBrainSchema = z.object({
  client_id: z.string().uuid(),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
  campaignId: z.string().uuid().optional(),
  campaignName: z.string().min(1).max(500).optional(),
  campaignHint: z.string().min(1).max(200).optional(),
  spaceId: z.string().uuid().optional(),
  spaceTitle: z.string().min(1).max(500).optional(),
})

export type ImportPageGraderClientBrainDto = z.infer<typeof ImportPageGraderClientBrainSchema>

export const PageGraderBrainPackageWebhookSchema = z.object({
  client_id: z.string().uuid(),
  content_hash: z.string().min(8).max(128).optional(),
  exported_at: z.string().optional(),
  force: z.boolean().optional(),
})

export type PageGraderBrainPackageWebhookDto = z.infer<typeof PageGraderBrainPackageWebhookSchema>

export const PageGraderWorkStatusWebhookSchema = z.object({
  client_id: z.string().uuid(),
  space_item_id: z.string().uuid(),
  work_id: z.string().uuid(),
  clickup_task_id: z.string().min(1).max(120).nullable().optional(),
  clickup_task_url: z.string().url().nullable().optional(),
  status: z.string().min(1).max(120).nullable().optional(),
  status_color: z.string().max(40).nullable().optional(),
  updated_at: z.string().datetime().optional(),
})

export type PageGraderWorkStatusWebhookDto = z.infer<typeof PageGraderWorkStatusWebhookSchema>

export const SyncPageGraderMeetingSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1).max(20),
})

export type SyncPageGraderMeetingDto = z.infer<typeof SyncPageGraderMeetingSchema>
