import type { AutomationAction } from '@/features/spaces/types/space-schema'

export type FlowBuilderStepCloneMode = 'single' | 'this_and_below'

export function cloneFlowBuilderActions(input: {
  actions: AutomationAction[]
  sourceActionIndex: number
  mode: FlowBuilderStepCloneMode
  insertAfterActionIndex: number
}): AutomationAction[] {
  const source = input.actions[input.sourceActionIndex]
  if (!source) return input.actions

  const slice =
    input.mode === 'single'
      ? [source]
      : input.actions.slice(input.sourceActionIndex)
  const cloned = slice.map((action) => structuredClone(action))
  const next = [...input.actions]
  next.splice(input.insertAfterActionIndex + 1, 0, ...cloned)
  return next
}

export function deleteFlowBuilderAction(
  actions: AutomationAction[],
  actionIndex: number,
): AutomationAction[] {
  return actions.filter((_, index) => index !== actionIndex)
}
