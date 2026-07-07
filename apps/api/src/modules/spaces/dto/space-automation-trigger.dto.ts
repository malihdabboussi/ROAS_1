import { z } from 'zod'
import {
  ArtifactKindSchema,
  ConnectedAppFlowProviderSchema,
  ConnectedAppFlowTriggerSlugSchema,
  FathomSourceSchema,
  GmailInboxCategorySchema,
  ScheduleConfigSchema,
  ScheduleTimezoneSchema,
  SlackTriggerSlugSchema,
  TaskScopeSchema,
  validateConnectedAppTriggerConfig,
} from './space-automation-shared.dto'
import { AssigneeTypeSchema, SpacePrioritySchema } from './space-core.dto'

const TriggerContextSpaceIdSchema = z.string().uuid().optional()

const AutomationTriggerUnionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('status_change'),
    from: z.string().optional(),
    to: z.string(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('task_created'),
    in_status: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('mission_completed'),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('mission_failed'),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('field_changed'),
    field_id: z.string(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('priority_changed'),
    from: SpacePrioritySchema.optional(),
    to: SpacePrioritySchema,
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('assignee_changed'),
    assignee_type: AssigneeTypeSchema.optional(),
    assignee_id: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('due_date_changed'),
    from: z.string().optional(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('start_date_changed'),
    from: z.string().optional(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('tag_added'),
    tag: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('tag_removed'),
    tag: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('form_submitted'),
    form_id: z.string().min(1),
    field_id: z.string().optional(),
    field_value: z.string().optional(),
  }),
  z.object({ type: z.literal('contact_created') }),
  z.object({
    type: z.literal('contact_updated'),
    field_id: z.string().optional(),
    to: z.string().optional(),
  }),
  z.object({ type: z.literal('contact_tag_added'), tag: z.string().optional() }),
  z.object({ type: z.literal('contact_tag_removed'), tag: z.string().optional() }),
  z.object({ type: z.literal('contact_type_changed'), to: z.string().optional() }),
  z.object({ type: z.literal('contact_source_changed'), to: z.string().optional() }),
  z.object({
    type: z.literal('artifact_lifecycle'),
    artifact_kind: ArtifactKindSchema.optional(),
    lifecycle_event: z.string().min(1),
    artifact_id: z.string().optional(),
    status: z.string().optional(),
  }),
  z.object({
    type: z.literal('external_email_received'),
    provider: z.enum(['gmail', 'outlook']),
    trigger_slug: z.enum(['GMAIL_NEW_GMAIL_MESSAGE', 'OUTLOOK_MESSAGE_TRIGGER']),
    connected_account_id: z.string().min(1),
    gmail_category: GmailInboxCategorySchema.optional(),
    from_contains: z.string().optional(),
    subject_contains: z.string().optional(),
  }),
  z.object({
    type: z.literal('external_slack_message_received'),
    trigger_slug: SlackTriggerSlugSchema,
    connected_account_id: z.string().min(1),
    channel_id: z.string().optional(),
    from_contains: z.string().optional(),
    text_contains: z.string().optional(),
  }),
  z.object({
    type: z.literal('external_fathom_recording_ready'),
    title_contains: z.string().optional(),
    recorded_by_contains: z.string().optional(),
    source: FathomSourceSchema.optional(),
  }),
  z.object({
    type: z.literal('external_app_event'),
    provider: ConnectedAppFlowProviderSchema,
    trigger_slug: ConnectedAppFlowTriggerSlugSchema,
    connected_account_id: z.string().min(1),
    trigger_config: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('webhook_received'),
    webhook_endpoint_id: z.string().uuid(),
  }),
  z.object({
    type: z.literal('schedule'),
    schedule: ScheduleConfigSchema,
    timezone: ScheduleTimezoneSchema,
  }),
])
export const AutomationTriggerSchema = AutomationTriggerUnionSchema.superRefine((value, ctx) => {
  if (value.type === 'external_app_event') validateConnectedAppTriggerConfig(value, ctx, true)
})
export type AutomationTriggerDto = z.infer<typeof AutomationTriggerSchema>

/** Draft saves: optional fields, UI placeholder action, not executed until published */
const LooseAutomationTriggerUnionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('status_change'),
    from: z.string().optional(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('task_created'),
    in_status: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('mission_completed'),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('mission_failed'),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('field_changed'),
    field_id: z.string().optional(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('priority_changed'),
    from: SpacePrioritySchema.optional(),
    to: SpacePrioritySchema.optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('assignee_changed'),
    assignee_type: AssigneeTypeSchema.optional(),
    assignee_id: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('due_date_changed'),
    from: z.string().optional(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('start_date_changed'),
    from: z.string().optional(),
    to: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('tag_added'),
    tag: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('tag_removed'),
    tag: z.string().optional(),
    task_scope: TaskScopeSchema.optional(),
    context_space_id: TriggerContextSpaceIdSchema,
  }),
  z.object({
    type: z.literal('form_submitted'),
    form_id: z.string().optional(),
    field_id: z.string().optional(),
    field_value: z.string().optional(),
  }),
  z.object({ type: z.literal('contact_created') }),
  z.object({
    type: z.literal('contact_updated'),
    field_id: z.string().optional(),
    to: z.string().optional(),
  }),
  z.object({ type: z.literal('contact_tag_added'), tag: z.string().optional() }),
  z.object({ type: z.literal('contact_tag_removed'), tag: z.string().optional() }),
  z.object({ type: z.literal('contact_type_changed'), to: z.string().optional() }),
  z.object({ type: z.literal('contact_source_changed'), to: z.string().optional() }),
  z.object({
    type: z.literal('artifact_lifecycle'),
    artifact_kind: ArtifactKindSchema.optional(),
    lifecycle_event: z.string().optional(),
    artifact_id: z.string().optional(),
    status: z.string().optional(),
  }),
  z.object({
    type: z.literal('external_email_received'),
    provider: z.enum(['gmail', 'outlook']).optional(),
    trigger_slug: z.enum(['GMAIL_NEW_GMAIL_MESSAGE', 'OUTLOOK_MESSAGE_TRIGGER']).optional(),
    connected_account_id: z.string().optional(),
    gmail_category: GmailInboxCategorySchema.optional(),
    from_contains: z.string().optional(),
    subject_contains: z.string().optional(),
  }),
  z.object({
    type: z.literal('external_slack_message_received'),
    trigger_slug: SlackTriggerSlugSchema.optional(),
    connected_account_id: z.string().optional(),
    channel_id: z.string().optional(),
    from_contains: z.string().optional(),
    text_contains: z.string().optional(),
  }),
  z.object({
    type: z.literal('external_fathom_recording_ready'),
    title_contains: z.string().optional(),
    recorded_by_contains: z.string().optional(),
    source: FathomSourceSchema.optional(),
  }),
  z.object({
    type: z.literal('external_app_event'),
    provider: ConnectedAppFlowProviderSchema.optional(),
    trigger_slug: ConnectedAppFlowTriggerSlugSchema.optional(),
    connected_account_id: z.string().optional(),
    trigger_config: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('webhook_received'),
    webhook_endpoint_id: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal('schedule'),
    schedule: ScheduleConfigSchema.optional(),
    timezone: ScheduleTimezoneSchema.optional(),
  }),
  z.object({ type: z.literal('choose_action') }),
])
export const LooseAutomationTriggerSchema = LooseAutomationTriggerUnionSchema.superRefine(
  (value, ctx) => {
    if (value.type === 'external_app_event') validateConnectedAppTriggerConfig(value, ctx, false)
  },
)
