import {
  type FlowBuildPlan,
  type FlowBuildPlanStatus,
  type FlowBuildPlanStep,
  type FlowBuildTraceEvent,
} from '@vibey/api-shared/types/flow-builder'
import { getFlowCapability } from '@vibey/api-shared/types/flow-capabilities'
import {
  capabilityIdFor,
  missingRequiredFields,
  objectArrayValue,
  objectValue,
  stringArrayValue,
  stringValue,
  type JsonRecord,
} from './artifact-flow-builder-values'

export function normalizePlanStatus(value: unknown): FlowBuildPlanStatus {
  return value === 'planned' ||
    value === 'validated' ||
    value === 'compiled' ||
    value === 'blocked'
    ? value
    : 'planned'
}

const INTENT_SUMMARY_MAX_LENGTH = 320
const STEP_HEADING_IN_INTENT = /\bStep\s+\d+[:.)]/i

export function validatePlanIntentStructure(plan: FlowBuildPlan): string[] {
  const errors: string[] = []
  const intent = plan.intent.trim()
  const hasSteps = !!plan.trigger || plan.actions.length > 0

  if (!hasSteps) {
    errors.push(
      'Plan must include trigger and actions. Put step-by-step workflow detail in trigger/actions, not in intent.',
    )
  }

  if (intent.length > INTENT_SUMMARY_MAX_LENGTH) {
    errors.push(
      `intent exceeds ${INTENT_SUMMARY_MAX_LENGTH} characters. Keep intent to 1-2 sentences; move workflow steps into trigger/actions.`,
    )
  } else if (STEP_HEADING_IN_INTENT.test(intent)) {
    errors.push(
      'intent contains step-by-step workflow text. Move Step headings into trigger/actions instead of intent.',
    )
  }

  return errors
}

export function planFromData(data: JsonRecord, intent: string): FlowBuildPlan {
  const trace: FlowBuildTraceEvent[] = [
    {
      type: 'capabilities_searched',
      message: 'Agent searched or provided capability-backed plan.',
    },
  ]
  const targetAutomationId = stringValue(data.target_automation_id)
  if (targetAutomationId) {
    trace.push({
      type: 'context_loaded',
      message: 'Selected an existing flow as the update target.',
      at: new Date().toISOString(),
      data: { mode: 'update', target_automation_id: targetAutomationId },
    })
  }
  const triggerInput = objectValue(data.trigger)
  const trigger = Object.keys(triggerInput).length ? stepFromPayload('trigger', triggerInput, 0) : null
  const actions = objectArrayValue(data.actions).map((action, index) =>
    stepFromPayload('action', action, index + 1),
  )
  const plan: FlowBuildPlan = {
    name: stringValue(data.name) ?? intent.slice(0, 80),
    intent,
    status: 'planned',
    trigger,
    actions,
    trace_events: objectArrayValue(data.trace_events).length
      ? (objectArrayValue(data.trace_events) as FlowBuildTraceEvent[])
      : trace,
    validation_errors: [],
    target_automation_id: targetAutomationId,
  }
  plan.validation_errors = validatePlanIntentStructure(plan)
  return plan
}

function stepFromPayload(
  kind: 'trigger' | 'action',
  input: JsonRecord,
  index: number,
): FlowBuildPlanStep {
  const existingPayload = objectValue(input.payload)
  const payload = Object.keys(existingPayload).length ? existingPayload : input
  const capabilityId = capabilityIdFor(kind, payload)
  const capability = capabilityId ? getFlowCapability(capabilityId) : null
  const existingMissing = stringArrayValue(input.missing_fields)
  const missingFields = capability
    ? Array.from(new Set([...missingRequiredFields(capability, payload), ...existingMissing]))
    : existingMissing
  const explicitSource = stringValue(input.source)
  const source =
    explicitSource === 'custom_blueprint'
      ? 'custom_blueprint'
      : capability
        ? 'premade'
        : 'unsupported_candidate'
  const compatibilityWarnings = stringArrayValue(input.compatibility_warnings)
  return {
    id: stringValue(input.id) ?? `${kind}-${index}`,
    kind: source === 'custom_blueprint' ? 'custom_blueprint' : kind,
    title: stringValue(input.title) ?? capability?.label ?? `${kind} ${index}`,
    description: stringValue(input.description) ?? capability?.description ?? 'Flow builder step.',
    source,
    capability_id: capability?.id ?? stringValue(input.capability_id),
    blueprint_id: stringValue(input.blueprint_id),
    action_type: kind === 'action' ? stringValue(payload.type) : null,
    payload,
    missing_fields: missingFields,
    compatibility_warnings: capability
      ? compatibilityWarnings
      : compatibilityWarnings.length
        ? compatibilityWarnings
        : [`Capability ${capabilityId ?? 'unknown'} is not in the catalog.`],
  }
}

export function planFromSession(session: JsonRecord): FlowBuildPlan | null {
  const raw = objectValue(session.plan)
  if (typeof raw.name !== 'string' || typeof raw.intent !== 'string') return null
  const status = normalizePlanStatus(raw.status)
  if (raw.status !== status) return null
  return {
    ...raw,
    status,
    trigger: objectValue(raw.trigger).id ? (raw.trigger as FlowBuildPlanStep) : null,
    actions: Array.isArray(raw.actions) ? (raw.actions as FlowBuildPlanStep[]) : [],
    trace_events: Array.isArray(raw.trace_events)
      ? (raw.trace_events as FlowBuildTraceEvent[])
      : Array.isArray(session.trace_events)
        ? (session.trace_events as FlowBuildTraceEvent[])
        : [],
    validation_errors: Array.isArray(raw.validation_errors)
      ? (raw.validation_errors as string[])
      : [],
  } as FlowBuildPlan
}

export function validatePlanShape(plan: FlowBuildPlan) {
  const candidate = planToCandidate(plan)
  const errors: string[] = []
  const triggerId = capabilityIdFor('trigger', objectValue(candidate.trigger))
  const triggerCapability = triggerId ? getFlowCapability(triggerId) : null
  if (!triggerCapability) errors.push('Unsupported or missing trigger capability.')
  else errors.push(...missingRequiredFields(triggerCapability, objectValue(candidate.trigger)))
  candidate.actions.forEach((action, index) => {
    const actionId = capabilityIdFor('action', objectValue(action))
    const capability = actionId ? getFlowCapability(actionId) : null
    if (!capability) errors.push(`Unsupported action ${index + 1}.`)
    else
      errors.push(
        ...missingRequiredFields(capability, objectValue(action)).map(
          (field) => `actions.${index}.${field}`,
        ),
      )
  })
  errors.push(...validatePlanIntentStructure(plan))
  return { valid: errors.length === 0, errors }
}

export function validateActionTemplate(action: JsonRecord) {
  const actionId = capabilityIdFor('action', action)
  const capability = actionId ? getFlowCapability(actionId) : null
  if (!capability) return { valid: false, errors: ['Unsupported action template.'] }
  const missing = missingRequiredFields(capability, action)
  return { valid: missing.length === 0, errors: missing }
}

export function planToCandidate(plan: FlowBuildPlan) {
  return {
    name: plan.name,
    trigger: objectValue((plan.trigger as JsonRecord | null)?.payload ?? plan.trigger),
    actions: objectArrayValue(plan.actions).map((step) => objectValue(step.payload ?? step)),
  }
}
