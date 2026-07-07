import { describe, expect, it } from 'vitest'
import * as dto from '../index'
import { CreatePublishedAutomationSchema, UpdateSpaceSchema } from '../index'

describe('spaces dto barrel exports', () => {
  it('keeps existing runtime export names available from ../dto', () => {
    expect(Object.keys(dto).sort()).toEqual(
      [
        'ActivityMentionSchema',
        'AgentCollaborationSchema',
        'AssigneeTypeSchema',
        'AutomationActionSchema',
        'AutomationIdParamSchema',
        'AutomationTriggerSchema',
        'BatchUpdateSpaceItemEntrySchema',
        'BatchUpdateSpaceItemsSchema',
        'ContinuationSchema',
        'CreateAutomationSchema',
        'CreateDraftAutomationSchema',
        'CreateItemActivitySchema',
        'CreatePublishedAutomationSchema',
        'CreateSpaceItemSchema',
        'CreateSpaceSchema',
        'CustomUnitSchema',
        'DuplicateSpaceItemIncludeSchema',
        'DuplicateSpaceItemSchema',
        'EnsureSpaceViewSchema',
        'FathomSourceSchema',
        'InviteSpaceItemByEmailSchema',
        'InvokeTaskAgentBodySchema',
        'LooseAutomationActionSchema',
        'LooseAutomationTriggerSchema',
        'MonthlyAnchorSchema',
        'PushToAgentBodySchema',
        'RecentAutomationRunsQuerySchema',
        'RecurrenceCloneIncludeSchema',
        'RecurrenceEndSchema',
        'RecurrenceFrequencySchema',
        'RecurrenceModeSchema',
        'RecurrenceResetStatusSchema',
        'RecurrenceSpecSchema',
        'RecurrenceTriggerSchema',
        'RecurrenceTriggerStatusSchema',
        'ScheduleConfigSchema',
        'SpaceAutomationSchema',
        'SpaceIdParamSchema',
        'SpaceItemActivityIdParamSchema',
        'SpaceItemAssigneeSchema',
        'SpaceItemIdParamSchema',
        'SpaceItemQuerySchema',
        'SpacePrioritySchema',
        'SpaceQuerySchema',
        'SpaceSchemaDtoSchema',
        'SpaceShareEntityTypeSchema',
        'SpaceShareIdParamSchema',
        'SpaceShareLevelSchema',
        'SpaceShareTokenParamSchema',
        'SpaceSourceSchema',
        'SpaceStatusSchema',
        'SpaceViewIdParamSchema',
        'TemplateKeyParamSchema',
        'TestAutomationSchema',
        'TransferSpaceItemSchema',
        'UndoAgentTaskEditsSchema',
        'UpdateAutomationSchema',
        'UpdateDraftAutomationSchema',
        'UpdateItemActivityCommentSchema',
        'UpdatePublishedAutomationSchema',
        'UpdateSpaceItemSchema',
        'UpdateSpaceSchema',
        'UpsertSpaceItemShareSchema',
        'UpsertSpaceShareSchema',
        'UpsertSpaceViewShareSchema',
        'ViewIdParamSchema',
        'ViewOverrideBodySchema',
        'VisualizeDocBodySchema',
        'WritableSpaceItemStatusSchema',
      ].sort(),
    )
  })
})

describe('SpaceSchemaDtoSchema', () => {
  it('rejects generic schema patches that include automations', () => {
    const result = UpdateSpaceSchema.safeParse({
      schema: {
        version: 1,
        fields: [],
        views: [],
        automations: [],
      },
    })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((issue) => issue.path.join('.') === 'schema.automations'),
    ).toBe(true)
  })

  it('accepts youtube_research views with youtube_research_config', () => {
    const result = UpdateSpaceSchema.safeParse({
      schema: {
        version: 1,
        fields: [],
        views: [
          {
            id: 'youtube_research',
            type: 'youtube_research',
            name: 'YouTube Research',
            youtube_research_config: { tracked_accounts: [{ handle: 'doacbehindthediary' }] },
          },
        ],
      },
    })

    expect(result.success).toBe(true)
  })

  it('accepts twitter_research views with twitter_research_config', () => {
    const result = UpdateSpaceSchema.safeParse({
      schema: {
        version: 1,
        fields: [],
        views: [
          {
            id: 'twitter_research',
            type: 'twitter_research',
            name: 'X Research',
            twitter_research_config: { tracked_accounts: [{ handle: 'elonmusk' }] },
          },
        ],
      },
    })

    expect(result.success).toBe(true)
  })

  it('accepts ads_research views with ads_research_config', () => {
    const result = UpdateSpaceSchema.safeParse({
      schema: {
        version: 1,
        fields: [],
        views: [
          {
            id: 'ads_research',
            type: 'ads_research',
            name: 'Ads Research',
            ads_research_config: {
              display_mode: 'grid',
              sort_by: 'days_running',
              sort_dir: 'desc',
            },
          },
        ],
      },
    })

    expect(result.success).toBe(true)
  })
})

describe('automation email artifact schema', () => {
  it('accepts send_to_agent email artifact output and send_email artifact source', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Draft and send',
      trigger: { type: 'task_created', in_status: 'todo' },
      actions: [
        {
          type: 'send_to_agent',
          agent_key: 'copywriter',
          prompt_template: 'Draft a reply',
          output_type: 'email_artifact',
          continuation: 'after_task_completes',
        },
        {
          type: 'send_email',
          tool_slug: 'GMAIL_SEND_EMAIL',
          connected_account_id: 'ca_123',
          to: '{{trigger.email}}',
          subject_source: 'artifact',
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('rejects manual send_email without subject or body', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Incomplete email',
      trigger: { type: 'task_created', in_status: 'todo' },
      actions: [
        {
          type: 'send_email',
          tool_slug: 'GMAIL_SEND_EMAIL',
          connected_account_id: 'ca_123',
          to: 'lead@example.com',
        },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain(
      'actions.0.subject_template',
    )
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain(
      'actions.0.body_template',
    )
  })

  it('rejects after_task_completes on create_task', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Create then wait',
      trigger: { type: 'task_created', in_status: 'todo' },
      actions: [
        {
          type: 'create_task',
          title_template: 'Follow up',
          continuation: 'after_task_completes',
        },
        {
          type: 'add_comment',
          message_template: 'Next',
        },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain(
      'actions.0.continuation',
    )
  })

  it('accepts send_to_cursor automation action', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Bug to Cursor PR',
      trigger: { type: 'status_change', to: 'ready_for_dev' },
      actions: [
        {
          type: 'send_to_cursor',
          repo_url: 'https://github.com/org/repo',
          base_branch: 'main',
          prompt_template: '{{task.title}}\n{{task.description}}',
          completed_status: 'in_review',
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('accepts send_to_agents with collaboration disabled', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Parallel review',
      trigger: { type: 'task_created', in_status: 'todo' },
      actions: [
        {
          type: 'send_to_agents',
          prompt_template: 'Review this task from your specialty.',
          agent_tasks: [
            { agent_key: 'strategist' },
            { agent_key: 'copywriter', prompt_template: 'Focus on messaging.' },
          ],
          agent_collaboration: 'disabled',
          continuation: 'after_task_completes',
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('rejects send_to_agents with fewer than two agents', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Incomplete parallel review',
      trigger: { type: 'task_created', in_status: 'todo' },
      actions: [
        {
          type: 'send_to_agents',
          prompt_template: 'Review this task.',
          agent_tasks: [{ agent_key: 'strategist' }],
        },
      ],
    })

    expect(result.success).toBe(false)
  })
})
