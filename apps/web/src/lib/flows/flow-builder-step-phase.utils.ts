import type { AutomationAction, AutomationTrigger } from '@/features/spaces/types/space-schema'
import {
  validateConcreteAction,
  validateTrigger,
} from '@/lib/flows/automation-publishable'
import type { FlowBuilderCanvasStep } from '@/lib/flows/flow-builder-canvas.utils'
import { triggerContextSpaceSetupRequired } from '@/lib/flows/flow-trigger-context-space.utils'

export type FlowBuilderStepPhase = 'setup' | 'configure' | 'test'

export type FlowBuilderStepConfigurationStatus =
  | 'empty'
  | 'needs_setup'
  | 'needs_configure'
  | 'complete'

export function isFlowBuilderStepSetupComplete(input: {
  step: FlowBuilderCanvasStep
  trigger: AutomationTrigger
  actions: AutomationAction[]
  flowSpaceIsConceptSandbox?: boolean
}): boolean {
  if (input.step.selection.kind === 'trigger') {
    if (input.trigger.type === 'choose_action') return false
    if (
      triggerContextSpaceSetupRequired({
        trigger: input.trigger,
        flowSpaceIsConceptSandbox: input.flowSpaceIsConceptSandbox ?? false,
      })
    ) {
      return false
    }
    return true
  }
  const action = input.actions[input.step.selection.index]
  if (!action) return false
  return action.type !== 'choose_action'
}

export function isFlowBuilderStepConfigureComplete(input: {
  step: FlowBuilderCanvasStep
  trigger: AutomationTrigger
  actions: AutomationAction[]
}): boolean {
  if (!isFlowBuilderStepSetupComplete(input)) return false
  if (input.step.selection.kind === 'trigger') {
    return validateTrigger(input.trigger) === null
  }
  const action = input.actions[input.step.selection.index]
  if (!action || action.type === 'choose_action') return false
  return validateConcreteAction(action) === null
}

export function resolveFlowBuilderStepConfigurationStatus(input: {
  step: FlowBuilderCanvasStep
  trigger: AutomationTrigger
  actions: AutomationAction[]
  flowSpaceIsConceptSandbox?: boolean
  tested?: boolean
}): FlowBuilderStepConfigurationStatus {
  if (input.step.isPlaceholder) return 'empty'
  if (
    !isFlowBuilderStepSetupComplete({
      step: input.step,
      trigger: input.trigger,
      actions: input.actions,
      flowSpaceIsConceptSandbox: input.flowSpaceIsConceptSandbox,
    })
  ) {
    return 'needs_setup'
  }
  if (!isFlowBuilderStepConfigureComplete(input)) return 'needs_configure'
  if (!input.tested) return 'needs_configure'
  return 'complete'
}
