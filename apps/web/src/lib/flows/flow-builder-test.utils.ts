import type { AutomationAction, AutomationTrigger } from '@/features/spaces/types/space-schema'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import type { SpaceItem } from '@/lib/spaces/space-item-types'
import { renderFlowAutomationTemplate,
  type FlowTemplateContext,
} from '@/lib/flows/flow-automation-template-preview'
import { flowBuilderActionIndexToStepNumber } from '@/lib/flows/flow-builder-step-index.utils'
import { isTaskShapedAutomationTrigger } from '@/lib/flows/flow-trigger-context-space.utils'

export type FlowBuilderTestOutputLine = {
  key: string
  value: string
  href?: string
}

export type FlowBuilderTestStepResult = {
  status: 'pass' | 'fail'
  message: string
  outputLines: FlowBuilderTestOutputLine[]
}

export type FlowBuilderTestSession = {
  sampleItem: SpaceItem | null
  sampleSpaceId: string | null
  stepResults: Record<string, FlowBuilderTestStepResult>
}

export function createEmptyFlowBuilderTestSession(): FlowBuilderTestSession {
  return {
    sampleItem: null,
    sampleSpaceId: null,
    stepResults: {},
  }
}

export const FLOW_BUILDER_SAMPLE_TASK_ID = '__flow_builder_sample_task__'

export function isFlowBuilderSampleTask(item: SpaceItem): boolean {
  return item.id === FLOW_BUILDER_SAMPLE_TASK_ID
}

export function buildFlowBuilderSampleTask(input: {
  spaceId: string
  trigger: AutomationTrigger
}): SpaceItem {
  let status: SpaceItem['status'] = 'todo'
  if (input.trigger.type === 'task_created' && input.trigger.in_status) {
    status = input.trigger.in_status
  } else if (input.trigger.type === 'status_change') {
    status = input.trigger.from ?? input.trigger.to ?? 'todo'
  }
  const now = new Date().toISOString()
  return {
    id: FLOW_BUILDER_SAMPLE_TASK_ID,
    space_id: input.spaceId,
    org_id: 'sample',
    user_id: 'sample',
    title: 'Sample task',
    status,
    priority: 'medium',
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    description: 'Preview-only sample task for flow testing.',
    notes: null,
    doc_body: null,
    source: 'manual',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    sort_order: 0,
    custom_data: {},
    created_at: now,
    updated_at: now,
  }
}

export function filterSpaceItemsForTrigger(
  items: SpaceItem[],
  trigger: AutomationTrigger,
): SpaceItem[] {
  if (trigger.type === 'task_created' && trigger.in_status) {
    return items.filter((item) => item.status === trigger.in_status)
  }
  if (trigger.type === 'status_change' && trigger.from) {
    return items.filter((item) => item.status === trigger.from)
  }
  return items
}

export function buildFlowTestTemplateContext(input: {
  item: SpaceItem
  spaceTitle: string
  roster: TeamRosterEntry[]
  trigger: AutomationTrigger
  priorStepOutputs?: Record<string, unknown>[]
}): FlowTemplateContext {
  const itemRecord = input.item as unknown as Record<string, unknown>
  return {
    item: itemRecord,
    space: { title: input.spaceTitle },
    event: {
      type: input.trigger.type,
      ...itemRecord,
    },
    steps: input.priorStepOutputs,
    roster: input.roster.map((member) => ({
      id: member.participant_id,
      display_name: member.display_name ?? undefined,
      email: undefined,
    })),
  }
}

export function buildTriggerSampleOutputLines(input: {
  item: SpaceItem
  spaceId: string
}): FlowBuilderTestOutputLine[] {
  const isSample = isFlowBuilderSampleTask(input.item)
  const href = isSample ? undefined : `/spaces/${input.spaceId}/${input.item.id}`
  return [
    { key: 'Task', value: input.item.title, href },
    { key: 'Status', value: String(input.item.status) },
    { key: 'Priority', value: input.item.priority ? String(input.item.priority) : 'None' },
    { key: 'Task ID', value: isSample ? 'Sample (preview only)' : input.item.id },
  ]
}

export function previewAutomationActionOutput(
  action: AutomationAction,
  ctx: FlowTemplateContext,
): FlowBuilderTestOutputLine[] {
  switch (action.type) {
    case 'send_to_agent':
      return [
        { key: 'Agent', value: action.agent_key },
        {
          key: 'Prompt preview',
          value: renderFlowAutomationTemplate(action.prompt_template ?? '', ctx),
        },
      ]
    case 'send_to_agents':
      return [
        {
          key: 'Prompt preview',
          value: renderFlowAutomationTemplate(action.prompt_template ?? '', ctx),
        },
        {
          key: 'Agents',
          value: action.agent_tasks.map((row) => row.agent_key).join(', '),
        },
      ]
    case 'add_comment':
      return [
        {
          key: 'Comment preview',
          value: renderFlowAutomationTemplate(action.message_template ?? '', ctx),
        },
      ]
    case 'create_task':
      return [
        {
          key: 'Title preview',
          value: renderFlowAutomationTemplate(action.title_template ?? '', ctx),
        },
        ...(action.notes_template
          ? [
              {
                key: 'Notes preview',
                value: renderFlowAutomationTemplate(action.notes_template, ctx),
              },
            ]
          : []),
        ...(action.status ? [{ key: 'Status', value: action.status }] : []),
      ]
    case 'change_status':
      return [{ key: 'New status', value: action.status }]
    case 'flow_loop':
      return [
        {
          key: 'Loop target',
          value: `Step ${flowBuilderActionIndexToStepNumber(action.target_step_index ?? 0)}`,
        },
        { key: 'When', value: action.when === 'always' ? 'Always' : 'On reject' },
      ]
    case 'flow_branch':
      return [
        {
          key: 'If',
          value: `${action.field_id} ${action.operator ?? 'equals'} ${action.value ?? ''}`.trim(),
        },
        {
          key: 'Then',
          value: `Step ${flowBuilderActionIndexToStepNumber(action.then_step_index ?? 0)}`,
        },
        ...(typeof action.else_step_index === 'number'
          ? [
              {
                key: 'Else',
                value: `Step ${flowBuilderActionIndexToStepNumber(action.else_step_index)}`,
              },
            ]
          : []),
      ]
    case 'assign_to':
      return [
        {
          key: 'Assignees',
          value: action.assignees.map((row) => `${row.type}:${row.id}`).join(', '),
        },
      ]
    default:
      return [{ key: 'Action', value: action.type }]
  }
}

export function stepRequiresTaskSample(input: {
  stepKind: 'trigger' | 'action'
  trigger: AutomationTrigger
}): boolean {
  if (input.stepKind === 'trigger') return isTaskShapedAutomationTrigger(input.trigger)
  return isTaskShapedAutomationTrigger(input.trigger)
}

export function isFlowBuilderStepTested(
  session: FlowBuilderTestSession,
  stepId: string,
): boolean {
  return session.stepResults[stepId]?.status === 'pass'
}
