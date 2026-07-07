import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Brain,
  Filter,
  GitBranch,
  Home,
  Layers,
  Plug,
  Sparkles,
  User,
  Webhook,
  Zap,
} from 'lucide-react'
import type { AutomationAction, AutomationTrigger } from '@/features/spaces/types/space-schema'
import type { FlowBuilderBadgeVariant } from '@/lib/flows/flow-builder-canvas.utils'

export type FlowBuilderStepCategoryId =
  | 'webhook'
  | 'integration'
  | 'skill'
  | 'brain'
  | 'space'
  | 'human-gate'
  | 'loop'
  | 'branch'
  | 'action'
  | 'agent'

export type FlowBuilderStepCategory = {
  id: FlowBuilderStepCategoryId
  label: string
  description: string
  icon: LucideIcon
  badgeVariant: FlowBuilderBadgeVariant
  /** Trigger categories replace step 1; action categories append a new step. */
  placement: 'trigger' | 'action'
}

export const FLOW_BUILDER_STEP_CATEGORIES: FlowBuilderStepCategory[] = [
  {
    id: 'webhook',
    label: 'Webhook',
    description: 'Start the flow when an HTTP request hits your endpoint',
    icon: Webhook,
    badgeVariant: 'cyan',
    placement: 'trigger',
  },
  {
    id: 'integration',
    label: 'Integration',
    description: 'Pull data from Fathom, Stripe, Slack, etc.',
    icon: Plug,
    badgeVariant: 'blue',
    placement: 'action',
  },
  {
    id: 'skill',
    label: 'Skill',
    description: 'Run any skill from the team',
    icon: Sparkles,
    badgeVariant: 'cyan',
    placement: 'action',
  },
  {
    id: 'brain',
    label: 'Brain',
    description: 'Query or write to a brain',
    icon: Brain,
    badgeVariant: 'purple',
    placement: 'action',
  },
  {
    id: 'space',
    label: 'Space',
    description: 'Create or update items in a space',
    icon: Layers,
    badgeVariant: 'yellow',
    placement: 'action',
  },
  {
    id: 'human-gate',
    label: 'Human Gate',
    description: 'Pause for human approval before continuing',
    icon: User,
    badgeVariant: 'purple',
    placement: 'action',
  },
  {
    id: 'branch',
    label: 'Branch',
    description: 'If-then: jump to different steps based on a field',
    icon: GitBranch,
    badgeVariant: 'muted',
    placement: 'action',
  },
  {
    id: 'loop',
    label: 'Loop',
    description: 'Loop back to an earlier step on reject',
    icon: Filter,
    badgeVariant: 'muted',
    placement: 'action',
  },
  {
    id: 'action',
    label: 'Action',
    description: 'Send email, post message, update task, etc.',
    icon: Zap,
    badgeVariant: 'orange',
    placement: 'action',
  },
  {
    id: 'agent',
    label: 'Agent',
    description: 'Hand off to a specific agent',
    icon: Bot,
    badgeVariant: 'green',
    placement: 'action',
  },
]

export type FlowBuilderStepSidebarId =
  | 'home'
  | 'integrations'
  | 'agents'
  | 'flow_controls'
  | 'utilities'

export const FLOW_BUILDER_STEP_SIDEBAR: Array<{
  id: FlowBuilderStepSidebarId
  label: string
  icon: LucideIcon
  categoryIds: FlowBuilderStepCategoryId[] | 'all'
}> = [
  { id: 'home', label: 'Home', icon: Home, categoryIds: 'all' },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    categoryIds: ['webhook', 'integration'],
  },
  { id: 'agents', label: 'Agents', icon: Bot, categoryIds: ['agent'] },
  {
    id: 'flow_controls',
    label: 'Flow controls',
    icon: Filter,
    categoryIds: ['branch', 'loop', 'human-gate'],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: Sparkles,
    categoryIds: ['skill', 'brain', 'action', 'space'],
  },
]

export function isFlowBuilderTriggerCategory(categoryId: FlowBuilderStepCategoryId): boolean {
  return FLOW_BUILDER_STEP_CATEGORIES.find((row) => row.id === categoryId)?.placement === 'trigger'
}

export function defaultAutomationTriggerForFlowCategory(
  categoryId: FlowBuilderStepCategoryId,
): AutomationTrigger | null {
  if (categoryId === 'webhook') {
    return { type: 'webhook_received', webhook_endpoint_id: '' }
  }
  return null
}

export function defaultAutomationActionForFlowCategory(
  categoryId: FlowBuilderStepCategoryId,
): AutomationAction {
  switch (categoryId) {
    case 'integration':
      return { type: 'choose_action' }
    case 'branch':
      return {
        type: 'flow_branch',
        field_id: 'status',
        operator: 'equals',
        value: '',
        then_step_index: 0,
      }
    case 'loop':
      return {
        type: 'flow_loop',
        target_step_index: 0,
        when: 'on_reject',
        max_iterations: 3,
      }
    case 'human-gate':
      return {
        type: 'human_gate',
        waiting_status: 'in_review',
        resume_on_status: 'done',
        reject_on_status: 'needs_revision',
        message_template: 'Review and approve to continue. Move this task to Done when ready.',
      }
    case 'skill':
      return {
        type: 'send_to_cursor',
        repo_url: '',
        base_branch: 'main',
        prompt_template: '',
      }
    case 'brain':
      return { type: 'add_brain_context_to_task' }
    case 'space':
      return { type: 'create_task', title_template: '' }
    case 'action':
      return { type: 'add_comment', message_template: '' }
    case 'agent':
      return { type: 'send_to_agent', agent_key: '', prompt_template: '' }
    default:
      return { type: 'choose_action' }
  }
}
