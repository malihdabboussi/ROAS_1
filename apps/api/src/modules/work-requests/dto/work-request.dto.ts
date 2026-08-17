import { z } from 'zod'

export const WorkRequestTypeSchema = z.enum([
  'design',
  'copy',
  'funnel',
  'ghl',
  'ad',
  'video',
  'other',
  'general',
])
export const WorkRequestPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const WorkRequestTokenParamSchema = z
  .object({
    token: z
      .string()
      .min(40)
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict()

const DueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()

const StructuredValueSchema = z.union([
  z.string().max(10_000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(2000), z.number().finite(), z.boolean()])).max(50),
])

const StructuredFieldsSchema = z
  .record(z.string().min(1).max(120), StructuredValueSchema)
  .refine((value) => Object.keys(value).length <= 100, 'Too many structured fields')
  .refine(
    (value) =>
      Object.keys(value).every(
        (key) => !/(?:secret|password|api[_-]?key|access[_-]?token|credential)/i.test(key),
      ),
    'Credential fields are not allowed',
  )

const AssetSchema = z
  .object({
    name: z.string().min(1).max(300),
    url: z.string().url().max(2000),
    kind: z.string().min(1).max(80).optional(),
  })
  .strict()

const DependencySchema = z
  .object({
    title: z.string().min(1).max(500),
    url: z.string().url().max(2000).optional(),
  })
  .strict()

const SourceContextSchema = z
  .record(z.string().min(1).max(120), z.unknown())
  .refine((value) => !containsCredentialKey(value), 'Credential fields are not allowed')
  .refine(payloadSize(100_000), 'Source context is too large')

function payloadSize(maxBytes: number) {
  return (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= maxBytes
}

export const UpdateWorkRequestDraftSchema = z
  .object({
    client_workspace_id: z.string().uuid().optional(),
    campaign_space_id: z.string().uuid().nullable().optional(),
    request_type: WorkRequestTypeSchema.optional(),
    assignee_name: z.string().trim().min(1).max(300).nullable().optional(),
    title: z.string().trim().min(1).max(1000).optional(),
    description: z.string().max(20_000).nullable().optional(),
    due_date: DueDateSchema.optional(),
    priority: WorkRequestPrioritySchema.optional(),
    links: z.array(z.string().url().max(2000)).max(25).optional(),
    assets: z.array(AssetSchema).max(25).optional(),
    dependencies: z.array(DependencySchema).max(25).optional(),
    structured_fields: StructuredFieldsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one update is required')
  .refine(payloadSize(100_000), 'Update payload is too large')

export type UpdateWorkRequestDraftDto = z.infer<typeof UpdateWorkRequestDraftSchema>

export const CreateWorkRequestDraftWebhookSchema = z
  .object({
    page_grader_client_id: z.string().uuid(),
    page_grader_client_name: z.string().trim().min(1).max(500),
    page_grader_campaign_id: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(1000),
    body: z.string().max(20_000).nullable().optional(),
    task_type: WorkRequestTypeSchema,
    assignee_name: z.string().trim().min(1).max(300).nullable().optional(),
    due_date: DueDateSchema.optional(),
    priority: z.enum(['low', 'normal', 'medium', 'high', 'urgent']).optional().default('normal'),
    source_context: SourceContextSchema.optional().default({}),
    /** Explicit ROAS conversation to resume from the public review link. */
    conversation_id: z.string().uuid().optional(),
    idempotency_key: z.string().trim().min(1).max(255),
  })
  .strict()
  .refine(payloadSize(150_000), 'Draft payload is too large')
  .transform((input) => {
    const source: Record<string, unknown> = { ...input.source_context }
    if (input.conversation_id) source.conversation_id = input.conversation_id
    const requester = readRecord(source.requester)
    const originalAuthor = readRecord(source.original_author)
    const forwardingUser = readRecord(source.forwarding_user)
    const links = readStringArray(source.links)
    const assets = readAssets(source.assets)
    const dependencies = readDependencies(source.dependencies)
    const campaignId = input.page_grader_campaign_id ?? undefined
    return {
      client_id: input.page_grader_client_id,
      client_name: input.page_grader_client_name,
      campaign_id: campaignId,
      request_type: input.task_type,
      assignee_name: input.assignee_name ?? null,
      title: input.title,
      description: input.body ?? null,
      due_date: input.due_date,
      priority: input.priority === 'normal' ? ('medium' as const) : input.priority,
      structured_fields: links.length ? { links } : {},
      required_fields: ['title', 'description'],
      assets,
      dependencies,
      provenance: {
        source: readString(source.source) || 'page_grader_mcp',
        channel_id: readString(source.channel_id),
        thread_ts: readString(source.thread_ts),
        message_ts: readString(source.message_ts),
        source_url: readString(source.source_url),
        conversation_id:
          readString(source.conversation_id) || readString(source.conversationId) || undefined,
        context: source,
      },
      requester: {
        external_user_id:
          readString(requester.external_user_id) ||
          readString(originalAuthor.id) ||
          readString(forwardingUser.id),
        name:
          readString(requester.name) ||
          readString(originalAuthor.name) ||
          readString(forwardingUser.name),
        email: readEmail(requester.email),
      },
      work_scope: campaignId ? ('campaign' as const) : ('general' as const),
      idempotency_key: input.idempotency_key,
    }
  })

export type CreateWorkRequestDraftWebhookDto = z.infer<typeof CreateWorkRequestDraftWebhookSchema>

export const RefreshWorkRequestDraftWebhookSchema = z
  .object({
    draft_id: z.string().uuid(),
    client_id: z.string().uuid(),
    idempotency_key: z.string().trim().min(1).max(255),
  })
  .strict()

export type RefreshWorkRequestDraftWebhookDto = z.infer<typeof RefreshWorkRequestDraftWebhookSchema>

export const SendWorkRequestReviewChatSchema = z
  .object({
    content: z.string().trim().min(1).max(20_000),
  })
  .strict()

export type SendWorkRequestReviewChatDto = z.infer<typeof SendWorkRequestReviewChatSchema>

function containsCredentialKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsCredentialKey)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, child]) =>
      /(?:secret|password|api[_-]?key|access[_-]?token|credential)/i.test(key) ||
      containsCredentialKey(child),
  )
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readEmail(value: unknown): string | undefined {
  const email = readString(value)
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 320) : undefined
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .flatMap((item) => {
          const text = readString(item)
          return text ? [text] : []
        })
        .slice(0, 25)
    : []
}

function readAssets(value: unknown): Array<z.infer<typeof AssetSchema>> {
  if (!Array.isArray(value)) return []
  return value
    .flatMap((item) => {
      const parsed = AssetSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
    .slice(0, 25)
}

function readDependencies(value: unknown): Array<z.infer<typeof DependencySchema>> {
  if (!Array.isArray(value)) return []
  return value
    .flatMap((item) => {
      const parsed = DependencySchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
    .slice(0, 25)
}
