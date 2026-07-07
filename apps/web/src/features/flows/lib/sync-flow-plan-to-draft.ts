import type { FlowBuildPlan, FlowBuildSessionSummary } from '@vibey/api-shared/types/flow-builder'
import {
  isPlaceholderFlowDraftName,
  planHasExecutableSteps,
  resolveFlowDraftNameFromPlan,
} from '@vibey/api-shared/types/flow-builder'
import { isFlowDraftPlaceholder } from '@/lib/flows/automation-publishable'
import { flowBuildPlanToAutomationRule } from '@/lib/flows/flow-build-plan-automation.utils'
import { compileFlowPlan, updateFlowDraft } from '../services/flows.service'
import type { FlowAutomation, FlowAutomationSummary } from '../types/flow-automation.types'

function resolveSessionAutomationId(summary: FlowBuildSessionSummary): string | null {
  const plan = summary.plan
  const session = summary.session
  const raw =
    plan?.automation_id ??
    plan?.target_automation_id ??
    (typeof session?.automation_id === 'string' ? session.automation_id : null) ??
    (typeof session?.target_automation_id === 'string' ? session.target_automation_id : null)
  return typeof raw === 'string' ? raw : null
}

function resolveSessionSpaceId(
  summary: FlowBuildSessionSummary,
  fallbackSpaceId: string | null,
): string | null {
  const sessionSpaceId = summary.session?.space_id
  if (typeof sessionSpaceId === 'string' && sessionSpaceId.length > 0) return sessionSpaceId
  return fallbackSpaceId
}

function resolveSessionId(summary: FlowBuildSessionSummary): string | null {
  const raw = summary.session?.id
  return typeof raw === 'string' ? raw : null
}

export function planTargetsFlow(
  plan: FlowBuildPlan,
  flow: Pick<FlowAutomationSummary, 'id' | 'automation_id'>,
): boolean {
  const planFlowId = plan.automation_id ?? plan.target_automation_id ?? null
  if (!planFlowId) return true
  return planFlowId === flow.id || planFlowId === flow.automation_id
}

export function flowNeedsPlanSync(
  flow: Pick<FlowAutomationSummary, 'trigger' | 'actions'> | null | undefined,
  plan: FlowBuildPlan | null | undefined,
): boolean {
  if (!plan || !planHasExecutableSteps(plan)) return false
  if (!flow) return true
  return isFlowDraftPlaceholder(flow.trigger, flow.actions)
}

export function mergeFlowWithBuildPlan(
  flow: FlowAutomation,
  plan: FlowBuildPlan | null | undefined,
): FlowAutomation {
  if (!plan || !planHasExecutableSteps(plan)) return flow
  if (!planTargetsFlow(plan, flow)) return flow
  if (!isFlowDraftPlaceholder(flow.trigger, flow.actions)) return flow

  const { trigger, actions } = flowBuildPlanToAutomationRule(plan)
  const derivedName = resolveFlowDraftNameFromPlan(plan)

  return {
    ...flow,
    name:
      derivedName && isPlaceholderFlowDraftName(flow.name) ? derivedName : flow.name,
    trigger: trigger as FlowAutomation['trigger'],
    actions: actions as FlowAutomation['actions'],
  }
}

export async function syncBuildPlanToDraft(input: {
  summary: FlowBuildSessionSummary
  flow: FlowAutomationSummary | null
  fallbackSpaceId: string | null
}): Promise<string | null> {
  const { summary, flow, fallbackSpaceId } = input
  const plan = summary.plan
  if (!plan || !planHasExecutableSteps(plan)) {
    return resolveSessionAutomationId(summary)
  }

  const automationId = flow?.id ?? resolveSessionAutomationId(summary)
  const spaceId = flow?.space_id ?? resolveSessionSpaceId(summary, fallbackSpaceId)
  const sessionId = resolveSessionId(summary)
  if (!spaceId) return automationId

  const derivedName = resolveFlowDraftNameFromPlan(plan)
  const namePatch =
    derivedName && (!flow || isPlaceholderFlowDraftName(flow.name))
      ? { name: derivedName }
      : {}

  let parsedRule: Pick<FlowAutomation, 'trigger' | 'actions'>
  try {
    parsedRule = flowBuildPlanToAutomationRule(plan)
  } catch {
    return automationId
  }

  if (automationId) {
    if (flow && !planTargetsFlow(plan, flow)) {
      return automationId
    }
    if (flow && !flowNeedsPlanSync(flow, plan)) {
      return automationId
    }

    try {
      const updated = await updateFlowDraft(spaceId, automationId, {
        ...namePatch,
        trigger: parsedRule.trigger,
        actions: parsedRule.actions,
      })
      return updated.id
    } catch {
      return automationId
    }
  }

  if (sessionId) {
    try {
      const result = await compileFlowPlan(spaceId, sessionId, { allow_invalid_draft: true })
      return result.automation?.id ?? result.plan?.automation_id ?? null
    } catch {
      return null
    }
  }

  return null
}
