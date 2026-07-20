import { z } from 'zod'
import {
  AgentCollaborationSchema,
  ArtifactKindSchema,
  AutomationAssigneeTargetSchema,
  BrainImportDomainSchema,
  ContinuationSchema,
  EmailArtifactSourceSchema,
  SendToAgentOutputTypeSchema,
  SocialResearchAutomationEnrichmentSchema,
  SocialResearchAutomationPlatformSchema,
  SocialResearchAutomationSyncModeSchema,
} from './space-automation-shared.dto'
import { SpacePrioritySchema } from './space-core.dto'

export const AutomationActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create_task'),
    title_template: z.string().min(1).max(1000),
    status: z.string().optional(),
    assignees: z.array(AutomationAssigneeTargetSchema).min(1).max(50).optional(),
    assignee_type: z.enum(['human', 'agent', 'unassigned']).optional(),
    assignee_id: z.string().optional(),
    priority: SpacePrioritySchema.optional(),
    notes_template: z.string().max(20000).optional(),
    field_values: z.record(z.string(), z.unknown()).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('send_to_agent'),
    agent_key: z.string().min(1),
    prompt_template: z.string().min(1).max(20000),
    inject_fields: z.array(z.string()).optional(),
    output_type: SendToAgentOutputTypeSchema.optional(),
    target_item_ref: z.string().optional(),
    extended_brain_knowledge: z.boolean().optional(),
    agent_collaboration: AgentCollaborationSchema.optional(),
    priority: SpacePrioritySchema.optional(),
    continuation: ContinuationSchema,
    completed_status: z.string().min(1).max(200).optional(),
  }),
  z.object({
    type: z.literal('send_to_agents'),
    prompt_template: z.string().min(1).max(20000),
    agent_tasks: z
      .array(
        z.object({
          agent_key: z.string().min(1),
          prompt_template: z.string().max(20000).optional(),
        }),
      )
      .min(2)
      .max(10),
    inject_fields: z.array(z.string()).optional(),
    target_item_ref: z.string().optional(),
    extended_brain_knowledge: z.boolean().optional(),
    agent_collaboration: AgentCollaborationSchema.optional(),
    priority: SpacePrioritySchema.optional(),
    continuation: ContinuationSchema,
    completed_status: z.string().min(1).max(200).optional(),
  }),
  z.object({
    type: z.literal('send_to_cursor'),
    connection_id: z.string().uuid().optional(),
    repo_url: z
      .string()
      .url()
      .refine((u) => /github\.com\//.test(u), 'GitHub URL required'),
    base_branch: z.string().min(1).max(200).default('main'),
    branch_name: z.string().max(200).optional(),
    prompt_template: z.string().min(1).max(20000),
    model_id: z.string().min(1).default('composer-2'),
    inject_fields: z.array(z.string()).optional(),
    target_item_ref: z.string().optional(),
    priority: SpacePrioritySchema.optional(),
    continuation: ContinuationSchema,
    completed_status: z.string().min(1).max(200).optional(),
  }),
  z.object({
    type: z.literal('add_brain_context_to_task'),
    target_item_ref: z.string().optional(),
    query_template: z.string().max(2000).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('agent_suggest_tasks'),
    agent_key: z.string().min(1).optional(),
    max_suggestions: z.number().int().min(1).max(20).optional(),
    instructions: z.string().max(4000).optional(),
    extended_brain_knowledge: z.boolean().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('assign_to'),
    assignees: z.array(AutomationAssigneeTargetSchema).min(1).max(50).optional(),
    assignee_type: z.enum(['human', 'agent']).optional(),
    assignee_id: z.string().min(1).optional(),
    target_item_ref: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('change_status'),
    status: z.string().min(1),
    target_item_ref: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('change_priority'),
    priority: SpacePrioritySchema,
    target_item_ref: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('add_comment'),
    message_template: z.string().min(1).max(10000),
    target_item_ref: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('human_gate'),
    target_item_ref: z.string().optional(),
    assignees: z.array(AutomationAssigneeTargetSchema).min(1).max(50).optional(),
    assignee_type: z.enum(['human', 'agent']).optional(),
    assignee_id: z.string().min(1).optional(),
    waiting_status: z.string().min(1).max(200).default('in_review').optional(),
    resume_on_status: z.string().min(1).max(200).default('done').optional(),
    reject_on_status: z.string().min(1).max(200).default('needs_revision').optional(),
    on_reject_goto_step_index: z.number().int().min(0).optional(),
    message_template: z.string().max(10000).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('flow_loop'),
    target_step_index: z.number().int().min(0),
    when: z.enum(['on_reject', 'always']).default('on_reject').optional(),
    max_iterations: z.number().int().min(1).max(20).default(3).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('flow_branch'),
    field_id: z.string().min(1).max(200),
    operator: z
      .enum(['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'])
      .default('equals')
      .optional(),
    value: z.string().max(1000).optional(),
    then_step_index: z.number().int().min(0),
    else_step_index: z.number().int().min(0).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('send_email'),
    tool_slug: z.string().min(1),
    connected_account_id: z.string().min(1),
    to: z.string().min(1).max(1000),
    subject_template: z.string().max(1000).optional(),
    body_template: z.string().max(20000).optional(),
    subject_source: EmailArtifactSourceSchema.optional(),
    email_artifact_id: z.string().uuid().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('send_slack_message'),
    channel_id: z.string().min(1),
    text_template: z.string().min(1).max(12000),
    thread_ts: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('request_slack_follow_up_confirm'),
    dm_email: z.string().email().optional(),
    confirm_reaction: z.string().min(1).max(80).optional(),
    page_grader_client_id: z.string().uuid().optional(),
    page_grader_task_type: z
      .enum(['design', 'copy', 'funnel', 'ghl', 'ad', 'video', 'other', 'general'])
      .optional(),
    suggestion_ids: z.array(z.string().uuid()).max(50).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('send_channel_message'),
    channel_id: z.string().min(1),
    content_template: z.string().min(1).max(12000),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('create_contact'),
    email_template: z.string().min(1).max(1000),
    name_template: z.string().max(1000).optional(),
    source: z.string().max(200).optional(),
    field_values: z.record(z.string(), z.string()).optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('update_contact_field'),
    contact_id: z.string().optional(),
    field_id: z.string().min(1),
    value_template: z.string().max(12000),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('add_contact_tag'),
    contact_id: z.string().optional(),
    tag: z.string().min(1),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('remove_contact_tag'),
    contact_id: z.string().optional(),
    tag: z.string().min(1),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('attach_note_to_contact'),
    contact_id: z.string().optional(),
    content_template: z.string().min(1).max(12000),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('link_item_to_contact'),
    contact_id: z.string().min(1),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('create_artifact'),
    artifact_kind: ArtifactKindSchema,
    title_template: z.string().min(1).max(1000),
    campaign_id: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('publish_artifact'),
    artifact_kind: ArtifactKindSchema,
    artifact_id: z.string().min(1),
    target_item_ref: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('unpublish_artifact'),
    artifact_kind: ArtifactKindSchema,
    artifact_id: z.string().min(1),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('ask_agent_to_improve_artifact'),
    artifact_kind: ArtifactKindSchema,
    artifact_id: z.string().min(1),
    agent_key: z.string().min(1),
    prompt_template: z.string().min(1).max(20000),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('attach_artifact_to_item'),
    artifact_kind: ArtifactKindSchema,
    artifact_id: z.string().min(1),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('create_subtask'),
    title_template: z.string().min(1).max(1000),
    assignees: z.array(AutomationAssigneeTargetSchema).min(1).max(50).optional(),
    assignee_type: z.enum(['human', 'agent', 'unassigned']).optional(),
    assignee_id: z.string().optional(),
    target_item_ref: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('sync_social_research'),
    platform: SocialResearchAutomationPlatformSchema.default('both').optional(),
    sync_mode: SocialResearchAutomationSyncModeSchema.default('use_existing').optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('select_social_outliers'),
    platform: SocialResearchAutomationPlatformSchema.default('both').optional(),
    min_outlier_score: z.number().min(0).max(100).default(2).optional(),
    limit: z.number().int().min(1).max(50).default(10).optional(),
    since_days: z.number().int().min(1).max(30).default(30).optional(),
    source_step: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('enrich_social_research_items'),
    enrichments: z
      .array(SocialResearchAutomationEnrichmentSchema)
      .min(1)
      .default(['caption'])
      .optional(),
    source_step: z.string().optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('ingest_youtube_channel_to_agent_brain'),
    agent_key: z.string().min(1).optional(),
    brain_id: z.string().uuid().optional(),
    channel_urls: z.array(z.string().min(1).max(500)).min(1).max(10),
    since_days: z.number().int().min(1).max(30).default(7).optional(),
    max_videos_per_channel: z.number().int().min(1).max(200).default(25).optional(),
    include_shorts: z.boolean().optional(),
    domain: BrainImportDomainSchema.default('strategy').optional(),
    continuation: ContinuationSchema,
  }),
  z.object({
    type: z.literal('meetings_precall_prep'),
    refresh: z.boolean().optional(),
    timezone: z.string().min(1).max(100).optional(),
    continuation: ContinuationSchema,
  }),
])
export type AutomationActionDto = z.infer<typeof AutomationActionSchema>

export function validatePublishedAutomationActionRules(
  actions: Array<Record<string, unknown>> | undefined,
  ctx: z.RefinementCtx,
): void {
  actions?.forEach((action, index) => {
    if (
      action.type === 'send_to_agent' &&
      typeof action.output_type === 'string' &&
      action.output_type !== 'none' &&
      action.continuation !== 'after_task_completes'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actions', index, 'continuation'],
        message: 'artifact output requires after_task_completes continuation',
      })
    }
    if (
      action.type !== 'send_to_agent' &&
      action.type !== 'send_to_agents' &&
      action.type !== 'send_to_cursor' &&
      action.continuation === 'after_task_completes'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actions', index, 'continuation'],
        message: 'after_task_completes is only supported for agent steps',
      })
    }
    if (action.type === 'send_email' && action.subject_source !== 'artifact') {
      if (typeof action.subject_template !== 'string' || action.subject_template.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actions', index, 'subject_template'],
          message: 'Subject is required for manual email content',
        })
      }
      if (typeof action.body_template !== 'string' || action.body_template.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actions', index, 'body_template'],
          message: 'Body is required for manual email content',
        })
      }
    }
    if (action.type === 'ingest_youtube_channel_to_agent_brain') {
      const hasBrainId = typeof action.brain_id === 'string' && action.brain_id.trim().length > 0
      const hasAgentKey = typeof action.agent_key === 'string' && action.agent_key.trim().length > 0
      if (!hasBrainId && !hasAgentKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actions', index, 'agent_key'],
          message: 'Choose an agent',
        })
      }
    }
  })
}
