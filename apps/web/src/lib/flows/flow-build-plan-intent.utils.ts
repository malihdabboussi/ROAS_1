const INTENT_SUMMARY_MAX_LENGTH = 320
const STEP_HEADING_IN_INTENT = /\bStep\s+\d+[:.)]/i

export function normalizeFlowBuildPlanIntentForDisplay(intent: string): string {
  const trimmed = intent.trim()
  if (!trimmed) return trimmed

  let normalized = trimmed.replace(/\s+(?=Step\s+\d+[:.)])/gi, '\n\n')
  normalized = normalized.replace(/\n{3,}/g, '\n\n')
  return normalized
}

export function isFlowBuildPlanIntentOverloaded(intent: string): boolean {
  const trimmed = intent.trim()
  if (!trimmed) return false
  return trimmed.length > INTENT_SUMMARY_MAX_LENGTH || STEP_HEADING_IN_INTENT.test(trimmed)
}

export function planMissingStructuredSteps(plan: {
  trigger: unknown
  actions: unknown[]
}): boolean {
  return !plan.trigger && plan.actions.length === 0
}
