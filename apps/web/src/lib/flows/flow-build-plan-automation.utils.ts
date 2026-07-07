import type { FlowBuildPlan } from '@vibey/api-shared/types/flow-builder'
import type {
  AutomationAction,
  AutomationTrigger,
} from '@/features/spaces/types/space-schema'

export function flowBuildPlanToAutomationRule(plan: FlowBuildPlan): {
  trigger: AutomationTrigger
  actions: AutomationAction[]
} {
  const rawTrigger = plan.trigger?.payload
  const trigger = (
    rawTrigger &&
    typeof rawTrigger === 'object' &&
    'type' in rawTrigger &&
    typeof rawTrigger.type === 'string'
      ? rawTrigger
      : { type: 'choose_action' }
  ) as AutomationTrigger

  const actions = (plan.actions ?? [])
    .map((step) => step?.payload)
    .filter(
      (payload): payload is AutomationAction =>
        payload != null &&
        typeof payload === 'object' &&
        'type' in payload &&
        typeof payload.type === 'string' &&
        payload.type !== 'choose_action',
    )

  return { trigger, actions }
}
