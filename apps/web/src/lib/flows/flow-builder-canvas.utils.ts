import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Brain,
  Filter,
  GitBranch,
  Layers,
  MessageSquare,
  Plug,
  Sparkles,
  SquareKanban,
  User,
  Webhook,
  Zap,
} from 'lucide-react'
import type { FlowBuildPlan, FlowBuildPlanStep } from '@vibey/api-shared/types/flow-builder'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
} from '@/features/spaces/types/space-schema'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { getFlowBuilderStepLabel, getFlowBuilderStepSummary } from '@/lib/flows/automation-flow-step-summary.utils'
import { getActionAgentAvatarSrc } from '@/lib/flows/flow-builder-agent-avatar.utils'
import { getTriggerIntegrationLogoSrc } from '@/lib/flows/flow-builder-connected-app-trigger.utils'
import type { FlowBuilderStepConfigurationStatus } from '@/lib/flows/flow-builder-step-phase.utils'
import { resolveFlowBuilderStepConfigurationStatus } from '@/lib/flows/flow-builder-step-phase.utils'
import { flowBuilderActionIndexToStepNumber } from '@/lib/flows/flow-builder-step-index.utils'
import type { FlowBuilderTestSession } from '@/lib/flows/flow-builder-test.utils'
import { isFlowBuilderStepTested } from '@/lib/flows/flow-builder-test.utils'

export type FlowBuilderBadgeVariant =
  | 'blue'
  | 'green'
  | 'purple'
  | 'yellow'
  | 'orange'
  | 'cyan'
  | 'muted'

export type FlowBuilderCanvasStep = {
  id: string
  stepNumber: number
  label: string
  config: string
  typeLabel: string
  badgeVariant: FlowBuilderBadgeVariant
  icon: LucideIcon
  selection: { kind: 'trigger' } | { kind: 'action'; index: number }
  isHumanGate?: boolean
  isCondition?: boolean
  isLoopStep?: boolean
  isBranchStep?: boolean
  loopTargetStepNumber?: number
  branchThenStepNumber?: number
  branchElseStepNumber?: number
  /** Unconfigured trigger — canvas shows empty + slot instead of a filled step card. */
  isPlaceholder?: boolean
  /** Brand logo for connected-app triggers and actions. */
  logoSrc?: string | null
  /** Agent avatar for send_to_agent and related action steps. */
  avatarSrc?: string | null
  /** Setup/configure completeness for canvas status indicators. */
  configurationStatus?: FlowBuilderStepConfigurationStatus
}

const BADGE_BY_VARIANT: Record<FlowBuilderBadgeVariant, string> = {
  blue: 'badge-glass-blue',
  green: 'badge-glass-green',
  purple: 'badge-glass-purple',
  yellow: 'badge-glass-yellow',
  orange: 'badge-glass-orange',
  cyan: 'badge-glass-cyan',
  muted: 'badge-glass-muted',
}

export function flowBuilderBadgeClass(variant: FlowBuilderBadgeVariant): string {
  return BADGE_BY_VARIANT[variant]
}

function visualFromPlanStep(step: FlowBuildPlanStep): {
  typeLabel: string
  badgeVariant: FlowBuilderBadgeVariant
  icon: LucideIcon
  isHumanGate?: boolean
  isCondition?: boolean
  isLoopStep?: boolean
  isBranchStep?: boolean
} {
  const payloadType = String(step.payload.type ?? '')
  const actionType = String(step.action_type ?? payloadType ?? step.kind ?? '')

  if (step.kind === 'trigger') {
    if (
      payloadType.includes('external') ||
      payloadType.includes('form') ||
      payloadType.includes('contact') ||
      payloadType.includes('email') ||
      payloadType.includes('slack') ||
      payloadType.includes('fathom')
    ) {
      return { typeLabel: 'Integration', badgeVariant: 'blue', icon: Plug }
    }
    return { typeLabel: 'Space', badgeVariant: 'yellow', icon: Layers }
  }

  if (actionType.includes('trigger') || actionType.includes('external')) {
    return { typeLabel: 'Integration', badgeVariant: 'blue', icon: Plug }
  }
  if (actionType.includes('human') || actionType.includes('gate') || actionType.includes('approval')) {
    return { typeLabel: 'Human Gate', badgeVariant: 'purple', icon: User, isHumanGate: true }
  }
  if (actionType.includes('flow_branch') || (actionType.includes('branch') && !actionType.includes('base_branch'))) {
    return { typeLabel: 'Branch', badgeVariant: 'muted', icon: GitBranch, isCondition: true, isBranchStep: true }
  }
  if (actionType.includes('flow_loop') || (actionType.includes('loop') && !actionType.includes('flow_branch'))) {
    return { typeLabel: 'Loop', badgeVariant: 'muted', icon: Filter, isCondition: true, isLoopStep: true }
  }
  if (actionType.includes('brain')) {
    return { typeLabel: 'Brain', badgeVariant: 'purple', icon: Brain }
  }
  if (actionType.includes('agent') || actionType.includes('send_to_agent')) {
    return { typeLabel: 'Agent', badgeVariant: 'green', icon: Bot }
  }
  if (actionType.includes('skill') || actionType.includes('cursor')) {
    return { typeLabel: 'Skill', badgeVariant: 'green', icon: Sparkles }
  }
  if (
    actionType.includes('task') ||
    actionType.includes('status') ||
    actionType.includes('space') ||
    actionType.includes('comment')
  ) {
    if (actionType.includes('comment')) {
      return { typeLabel: 'Action', badgeVariant: 'yellow', icon: MessageSquare }
    }
    return { typeLabel: 'Space', badgeVariant: 'yellow', icon: Layers }
  }
  if (actionType.includes('email') || actionType.includes('slack') || actionType.includes('message')) {
    return { typeLabel: 'Action', badgeVariant: 'yellow', icon: Zap }
  }
  return { typeLabel: 'Action', badgeVariant: 'yellow', icon: Zap }
}

function visualFromTrigger(trigger: AutomationTrigger): ReturnType<typeof visualFromPlanStep> {
  switch (trigger.type) {
    case 'external_app_event':
    case 'external_email_received':
    case 'external_slack_message_received':
    case 'external_fathom_recording_ready':
    case 'form_submitted':
      return { typeLabel: 'Integration', badgeVariant: 'blue', icon: Plug }
    case 'webhook_received':
      return { typeLabel: 'Webhook', badgeVariant: 'cyan', icon: Webhook }
    case 'status_change':
    case 'task_created':
    case 'field_changed':
    case 'priority_changed':
    case 'assignee_changed':
    case 'tag_added':
    case 'tag_removed':
      return { typeLabel: 'Space', badgeVariant: 'yellow', icon: Layers }
    case 'contact_created':
    case 'contact_updated':
    case 'contact_tag_added':
    case 'contact_tag_removed':
    case 'contact_type_changed':
    case 'contact_source_changed':
      return { typeLabel: 'Integration', badgeVariant: 'blue', icon: Plug }
    case 'mission_completed':
    case 'mission_failed':
      return { typeLabel: 'Agent', badgeVariant: 'green', icon: Bot }
    case 'choose_action':
      return { typeLabel: 'Trigger', badgeVariant: 'muted', icon: Zap }
    default:
      return { typeLabel: 'Trigger', badgeVariant: 'muted', icon: Zap }
  }
}

function visualFromAction(action: AutomationAction): ReturnType<typeof visualFromPlanStep> {
  switch (action.type) {
    case 'send_to_agent':
    case 'send_to_agents':
    case 'agent_suggest_tasks':
      return { typeLabel: 'Agent', badgeVariant: 'green', icon: Bot }
    case 'add_brain_context_to_task':
    case 'ingest_youtube_channel_to_agent_brain':
      return { typeLabel: 'Brain', badgeVariant: 'purple', icon: Brain }
    case 'send_to_cursor':
      return { typeLabel: 'Skill', badgeVariant: 'cyan', icon: Sparkles }
    case 'create_task':
    case 'change_status':
    case 'change_priority':
    case 'assign_to':
    case 'create_subtask':
      return { typeLabel: 'Space', badgeVariant: 'yellow', icon: SquareKanban }
    case 'add_comment':
      return { typeLabel: 'Action', badgeVariant: 'orange', icon: MessageSquare }
    case 'human_gate':
      return { typeLabel: 'Human Gate', badgeVariant: 'purple', icon: User, isHumanGate: true }
    case 'flow_loop':
      return {
        typeLabel: 'Loop',
        badgeVariant: 'muted',
        icon: Filter,
        isCondition: true,
        isLoopStep: true,
      }
    case 'flow_branch':
      return {
        typeLabel: 'Branch',
        badgeVariant: 'muted',
        icon: GitBranch,
        isCondition: true,
        isBranchStep: true,
      }
    case 'choose_action':
      return { typeLabel: 'Action', badgeVariant: 'muted', icon: Zap }
    case 'send_email':
    case 'send_slack_message':
    case 'send_channel_message':
      return { typeLabel: 'Action', badgeVariant: 'orange', icon: Zap }
    case 'create_contact':
    case 'update_contact_field':
    case 'add_contact_tag':
    case 'remove_contact_tag':
    case 'sync_social_research':
    case 'select_social_outliers':
    case 'enrich_social_research_items':
      return { typeLabel: 'Integration', badgeVariant: 'blue', icon: Plug }
    default:
      return { typeLabel: 'Action', badgeVariant: 'orange', icon: Zap }
  }
}

export function buildFlowBuilderCanvasSteps(input: {
  plan?: FlowBuildPlan | null
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  flowSpaceIsConceptSandbox?: boolean
  testSession?: FlowBuilderTestSession
  stepLabelOverrides?: Record<string, string>
}): FlowBuilderCanvasStep[] {
  const steps: FlowBuilderCanvasStep[] = []
  const planTrigger = input.plan?.trigger ?? null

  if (planTrigger) {
    const isTriggerPlaceholder = input.trigger.type === 'choose_action'
    const visual = visualFromTrigger(input.trigger)
    const planPayloadType =
      planTrigger.payload && typeof planTrigger.payload === 'object' && 'type' in planTrigger.payload
        ? String(planTrigger.payload.type)
        : null
    const usePlanTitle = planPayloadType === input.trigger.type
    steps.push({
      id: planTrigger.id,
      stepNumber: 1,
      label: getFlowBuilderStepLabel({
        selection: { kind: 'trigger' },
        trigger: input.trigger,
        actions: input.actions,
        fields: input.fields,
        roster: input.roster,
        planTriggerTitle: usePlanTitle ? planTrigger.title : undefined,
      }),
      config: getFlowBuilderStepSummary({
        selection: { kind: 'trigger' },
        trigger: input.trigger,
        actions: input.actions,
        fields: input.fields,
        roster: input.roster,
        fallback: planTrigger.description,
      }),
      typeLabel: visual.typeLabel,
      badgeVariant: visual.badgeVariant,
      icon: visual.icon,
      selection: { kind: 'trigger' },
      isHumanGate: visual.isHumanGate,
      isCondition: visual.isCondition,
      isPlaceholder: isTriggerPlaceholder,
      logoSrc: getTriggerIntegrationLogoSrc(input.trigger),
    })
  } else {
    const isTriggerPlaceholder = input.trigger.type === 'choose_action'
    const visual = visualFromTrigger(input.trigger)
    steps.push({
      id: 'trigger',
      stepNumber: 1,
      label: getFlowBuilderStepLabel({
        selection: { kind: 'trigger' },
        trigger: input.trigger,
        actions: input.actions,
        fields: input.fields,
        roster: input.roster,
      }),
      config: getFlowBuilderStepSummary({
        selection: { kind: 'trigger' },
        trigger: input.trigger,
        actions: input.actions,
        fields: input.fields,
        roster: input.roster,
      }),
      typeLabel: visual.typeLabel,
      badgeVariant: visual.badgeVariant,
      icon: visual.icon,
      selection: { kind: 'trigger' },
      isPlaceholder: isTriggerPlaceholder,
      logoSrc: getTriggerIntegrationLogoSrc(input.trigger),
    })
  }

  const planActions = input.plan?.actions ?? []
  input.actions.forEach((action, index) => {
    const planStep = planActions[index] ?? null
    const visual = visualFromAction(action)
    steps.push({
      id: planStep?.id ?? `action-${index}`,
      stepNumber: steps.length + 1,
      label: getFlowBuilderStepLabel({
        selection: { kind: 'action', index },
        trigger: input.trigger,
        actions: input.actions,
        fields: input.fields,
        roster: input.roster,
      }),
      config: getFlowBuilderStepSummary({
        selection: { kind: 'action', index },
        trigger: input.trigger,
        actions: input.actions,
        fields: input.fields,
        roster: input.roster,
        fallback: planStep?.description ?? action.type.replace(/_/g, ' '),
      }),
      typeLabel: visual.typeLabel,
      badgeVariant: visual.badgeVariant,
      icon: visual.icon,
      selection: { kind: 'action', index },
      isHumanGate: visual.isHumanGate,
      isCondition: visual.isCondition,
      isLoopStep: visual.isLoopStep,
      isBranchStep: visual.isBranchStep,
      loopTargetStepNumber:
        action.type === 'flow_loop'
          ? flowBuilderActionIndexToStepNumber(action.target_step_index ?? 0)
          : action.type === 'human_gate' && typeof action.on_reject_goto_step_index === 'number'
            ? flowBuilderActionIndexToStepNumber(action.on_reject_goto_step_index)
            : undefined,
      branchThenStepNumber:
        action.type === 'flow_branch'
          ? flowBuilderActionIndexToStepNumber(action.then_step_index ?? 0)
          : undefined,
      branchElseStepNumber:
        action.type === 'flow_branch' && typeof action.else_step_index === 'number'
          ? flowBuilderActionIndexToStepNumber(action.else_step_index)
          : undefined,
      avatarSrc: getActionAgentAvatarSrc(action, input.roster),
    })
  })

  return steps.map((step) => ({
    ...step,
    label: input.stepLabelOverrides?.[step.id] ?? step.label,
    configurationStatus: resolveFlowBuilderStepConfigurationStatus({
      step,
      trigger: input.trigger,
      actions: input.actions,
      flowSpaceIsConceptSandbox: input.flowSpaceIsConceptSandbox,
      tested: input.testSession ? isFlowBuilderStepTested(input.testSession, step.id) : false,
    }),
  }))
}
