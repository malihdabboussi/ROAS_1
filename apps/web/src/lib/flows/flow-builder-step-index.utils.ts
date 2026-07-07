import type { AutomationAction } from '@/features/spaces/types/space-schema'

/** Trigger is always step 1 on the flow builder canvas. */
export const FLOW_BUILDER_TRIGGER_STEP_NUMBER = 1

/** Action array index → user-facing canvas step number. */
export function flowBuilderActionIndexToStepNumber(actionIndex: number): number {
  return actionIndex + 2
}

/** User-facing canvas step number → action array index. Returns null for the trigger. */
export function flowBuilderStepNumberToActionIndex(stepNumber: number): number | null {
  if (stepNumber <= FLOW_BUILDER_TRIGGER_STEP_NUMBER) return null
  return stepNumber - 2
}

function formatActionStepLabel(action: AutomationAction, actionIndex: number): string {
  const stepNumber = flowBuilderActionIndexToStepNumber(actionIndex)
  const detail =
    action.type === 'choose_action' ? 'Choose action' : action.type.replace(/_/g, ' ')
  return `Step ${stepNumber}: ${detail}`
}

/** Prior action steps (for loop-back targets). */
export function buildFlowBuilderPriorActionStepOptions(
  actions: AutomationAction[],
  beforeActionIndex: number,
): Array<{ value: string; label: string }> {
  return actions.slice(0, beforeActionIndex).map((action, priorIndex) => ({
    value: String(priorIndex),
    label: formatActionStepLabel(action, priorIndex),
  }))
}

/** All action steps (for branch then/else targets). */
export function buildFlowBuilderActionStepOptions(
  actions: AutomationAction[],
): Array<{ value: string; label: string }> {
  return actions.map((action, index) => ({
    value: String(index),
    label: formatActionStepLabel(action, index),
  }))
}
