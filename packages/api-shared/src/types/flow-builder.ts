import type { FlowCapability, FlowCapabilityKind } from './flow-capabilities'
import type { WorkflowCapabilitySearchResult } from './workflow-capabilities'

export type FlowBuilderScopeKind = 'brain' | 'agent' | 'space' | 'integration' | 'platform'

export type FlowBuilderFieldOptionRef = {
  id: string
  label: string
  value?: string | null
  key?: string | null
  color?: string | null
}

export type FlowBuilderFieldRef = {
  id: string
  key: string
  label: string
  type: string
  view_id?: string | null
  required?: boolean
  custom?: boolean
  options?: string[]
  option_refs?: FlowBuilderFieldOptionRef[]
}

export type FlowBuilderViewRef = {
  id: string
  title: string
  type: string
  fields: FlowBuilderFieldRef[]
}

export type FlowBuilderTemplateToken = {
  token: string
  label: string
  source: FlowBuilderScopeKind
  description: string
}

export type FlowBuilderCapabilityBucket = {
  category: string
  triggers: number
  actions: number
}

export type FlowBuilderExistingFlowRef = {
  id: string
  name: string
  enabled: boolean
  is_draft: boolean
  trigger_type: string | null
  action_types: string[]
  updated_at?: string | null
}

export type FlowActionBlueprintStatus = 'draft' | 'active' | 'archived'

export type FlowActionBlueprint = {
  id: string
  org_id?: string | null
  space_id?: string | null
  created_by?: string | null
  name: string
  description?: string | null
  category: string
  status: FlowActionBlueprintStatus
  input_schema: Record<string, unknown>
  action_template: Record<string, unknown>
  required_contexts: string[]
  output_contexts: string[]
  promotion_score?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type FlowBuilderContext = {
  space: {
    id: string
    title: string
    org_id?: string | null
  }
  views: FlowBuilderViewRef[]
  fields: FlowBuilderFieldRef[]
  capabilities: {
    buckets: FlowBuilderCapabilityBucket[]
    sample: FlowCapability[]
    total: number
  }
  workflow_capabilities?: WorkflowCapabilitySearchResult & {
    flow_capability_total?: number
    agent_action_total?: number
  }
  existing_flows: FlowBuilderExistingFlowRef[]
  blueprints: FlowActionBlueprint[]
  template_tokens: FlowBuilderTemplateToken[]
  context_hash: string
}

export type FlowBuildStepSource = 'premade' | 'custom_blueprint' | 'unsupported_candidate'
export type FlowBuildStepKind = FlowCapabilityKind | 'custom_blueprint'

export type FlowBuildPlanStep = {
  id: string
  kind: FlowBuildStepKind
  title: string
  description: string
  source: FlowBuildStepSource
  capability_id?: string | null
  blueprint_id?: string | null
  action_type?: string | null
  payload: Record<string, unknown>
  missing_fields: string[]
  compatibility_warnings: string[]
}

export type FlowClarificationTarget = {
  kind: FlowBuildStepKind | 'field' | 'integration' | 'plan'
  step_id?: string | null
  field_key?: string | null
}

export type FlowClarificationQuestion = {
  id: string
  text: string
  type: 'single_choice' | 'multiple_choice'
  options: Array<{
    id: string
    label: string
    description?: string
  }>
  required: boolean
  target?: FlowClarificationTarget
  label?: string
  question?: string
  suggested_answers?: string[]
}

export type FlowBuildClarificationStatus = 'open' | 'answered' | 'dismissed'

export type FlowBuildClarification = {
  id: string
  session_id: string
  org_id?: string | null
  space_id: string
  created_by?: string | null
  question: FlowClarificationQuestion
  answer?: Record<string, unknown> | null
  status: FlowBuildClarificationStatus
  created_at?: string | null
  updated_at?: string | null
}

export type FlowBuildTraceEventType =
  | 'context_loaded'
  | 'capabilities_searched'
  | 'premade_capability_selected'
  | 'custom_blueprint_selected'
  | 'custom_blueprint_drafted'
  | 'clarification_required'
  | 'clarification_answered'
  | 'schema_validation_failed'
  | 'schema_validation_passed'
  | 'unsupported_request_detected'
  | 'flow_draft_compiled'
  | 'publish_validation_passed'
  | 'publish_validation_failed'

export type FlowBuildTraceEvent = {
  type: FlowBuildTraceEventType
  message: string
  at?: string
  data?: Record<string, unknown>
}

export type FlowBuildSessionStatus =
  | 'intake'
  | 'clarifying'
  | 'planning'
  | 'planned'
  | 'validated'
  | 'compiled'
  | 'blocked'

export type FlowBuildPlanStatus = 'planned' | 'validated' | 'compiled' | 'blocked'

export type FlowBuildPlan = {
  id?: string
  name: string
  description?: string | null
  intent: string
  status: FlowBuildPlanStatus
  trigger: FlowBuildPlanStep | null
  actions: FlowBuildPlanStep[]
  trace_events: FlowBuildTraceEvent[]
  validation_errors: string[]
  context_hash?: string | null
  automation_id?: string | null
  target_automation_id?: string | null
}

export type FlowBuildEvaluationRank = 'A' | 'B' | 'C' | 'D' | 'F'

export type FlowBuildEvaluationInput = {
  plan: FlowBuildPlan
  trace_events?: FlowBuildTraceEvent[]
  required_clarifications?: number
  schema_validation_errors?: number
  unsupported_action_attempts?: number
  hallucinated_capability_ids?: number
  compiled_without_validation?: boolean
}

export type FlowBuildEvaluationSummary = {
  score: number
  rank: FlowBuildEvaluationRank
  capability_searches: number
  premade_steps: number
  custom_steps: number
  unsupported_action_attempts: number
  schema_validation_errors: number
  hallucinated_capability_ids: number
  clarification_questions: number
  missing_fields: number
  unresolved_missing_fields: number
  premade_reuse_rate: number
  strengths: string[]
  risks: string[]
}

export type FlowBuildRequiredNextAction =
  | 'draft_flow_plan'
  | 'answer_clarification'
  | 'validate_flow_plan'
  | 'update_flow_plan_or_clarify'
  | 'compile_flow_plan'
  | 'evaluate_flow_plan'
  | 'ready_for_user_review'
  | 'blocked'

export type FlowBuildInspectorStage =
  | 'target_selected'
  | 'needs_clarification'
  | 'plan_ready'
  | 'validation_failed'
  | 'validated'
  | 'compiled'
  | 'evaluated'
  | 'blocked'

export type FlowBuildSessionSummary = {
  session: Record<string, unknown> & { status?: FlowBuildSessionStatus }
  plan: FlowBuildPlan | null
  clarifications: FlowBuildClarification[]
  evaluation?: FlowBuildEvaluationSummary | null
  required_next_action: FlowBuildRequiredNextAction
  inspector_stage: FlowBuildInspectorStage
}

export function resolveFlowBuildRequiredNextAction(input: {
  plan: FlowBuildPlan | null
  sessionStatus?: FlowBuildSessionStatus | null
  evaluation?: FlowBuildEvaluationSummary | null
  openClarifications?: number
}): FlowBuildRequiredNextAction {
  const sessionStatus = input.sessionStatus ?? input.plan?.status ?? 'intake'
  if (sessionStatus === 'blocked') return 'blocked'
  if (sessionStatus === 'clarifying' || (input.openClarifications ?? 0) > 0) {
    return 'answer_clarification'
  }
  if (sessionStatus === 'intake' || sessionStatus === 'planning' || !input.plan) {
    return 'draft_flow_plan'
  }
  const validationFailed = input.plan.validation_errors.length > 0
  const hasDraftedSteps = !!input.plan.trigger || input.plan.actions.length > 0
  if (!hasDraftedSteps && !validationFailed) return 'draft_flow_plan'
  if (validationFailed) return 'update_flow_plan_or_clarify'
  if (input.plan.status === 'planned') return 'validate_flow_plan'
  if (input.plan.status === 'validated') return 'compile_flow_plan'
  if (input.plan.status === 'compiled') {
    return input.evaluation ? 'ready_for_user_review' : 'evaluate_flow_plan'
  }
  return 'validate_flow_plan'
}

export function resolveFlowBuildInspectorStage(input: {
  plan: FlowBuildPlan | null
  sessionStatus?: FlowBuildSessionStatus | null
  evaluation?: FlowBuildEvaluationSummary | null
  openClarifications?: number
}): FlowBuildInspectorStage {
  const sessionStatus = input.sessionStatus ?? input.plan?.status ?? 'intake'
  if (sessionStatus === 'blocked') return 'blocked'
  if (sessionStatus === 'clarifying' || (input.openClarifications ?? 0) > 0) {
    return 'needs_clarification'
  }
  if (!input.plan) return 'target_selected'
  const hasDraftedSteps = !!input.plan.trigger || input.plan.actions.length > 0
  if (!hasDraftedSteps && input.plan.validation_errors.length === 0) return 'target_selected'
  if (input.plan.validation_errors.length > 0) return 'validation_failed'
  if (input.plan.status === 'validated') return 'validated'
  if (input.plan.status === 'compiled') return input.evaluation ? 'evaluated' : 'compiled'
  return 'plan_ready'
}

export const FLOW_BUILDER_TEMPLATE_TOKENS: FlowBuilderTemplateToken[] = [
  {
    token: '{{task.title}}',
    label: 'Task title',
    source: 'space',
    description: 'Title of the triggering or created task.',
  },
  {
    token: '{{task.description}}',
    label: 'Task description',
    source: 'space',
    description: 'Description or notes for the task in context.',
  },
  {
    token: '{{contact.email}}',
    label: 'Contact email',
    source: 'space',
    description: 'Email for the contact in context.',
  },
  {
    token: '{{trigger.payload}}',
    label: 'Trigger payload',
    source: 'integration',
    description: 'Raw payload from an external connected-app trigger.',
  },
  {
    token: '{{steps.1.output}}',
    label: 'Previous step output',
    source: 'platform',
    description: 'Output from the prior flow step (use Step 1, Step 2, … in the editor).',
  },
]

export function createFlowBuildContextHash(input: {
  space_id: string
  view_count: number
  field_count: number
  capability_total: number
  blueprint_count: number
}): string {
  return [
    input.space_id,
    input.view_count,
    input.field_count,
    input.capability_total,
    input.blueprint_count,
  ].join(':')
}

const PLACEHOLDER_FLOW_DRAFT_NAMES = new Set([
  'untitled flow draft',
  'untitled flow',
  'untitled',
  'new flow build',
])

export function isPlaceholderFlowDraftName(name: unknown): boolean {
  const normalized = typeof name === 'string' ? name.trim().toLowerCase() : ''
  return normalized.length === 0 || PLACEHOLDER_FLOW_DRAFT_NAMES.has(normalized)
}

export function planHasExecutableSteps(plan: FlowBuildPlan): boolean {
  return !!plan.trigger || plan.actions.length > 0
}

export function resolveFlowDraftNameFromPlan(plan: FlowBuildPlan): string | null {
  if (!planHasExecutableSteps(plan)) return null

  const explicitName = plan.name?.trim()
  if (explicitName && !isPlaceholderFlowDraftName(explicitName)) {
    return explicitName.slice(0, 200)
  }

  const triggerTitle = plan.trigger?.title?.trim()
  const actionTitles = plan.actions
    .map((step) => step.title?.trim())
    .filter((title): title is string => Boolean(title))

  if (triggerTitle && actionTitles.length > 0) {
    return `${triggerTitle}: ${actionTitles.join(' → ')}`.slice(0, 200)
  }
  if (triggerTitle) return triggerTitle.slice(0, 200)
  if (actionTitles.length > 0) return actionTitles.join(' → ').slice(0, 200)

  const intent = plan.intent?.trim()
  if (intent && intent.length >= 4 && !isPlaceholderFlowDraftName(intent)) {
    return intent.slice(0, 80)
  }

  return null
}

export function evaluateFlowBuild(input: FlowBuildEvaluationInput): FlowBuildEvaluationSummary {
  const traceEvents = input.trace_events ?? input.plan.trace_events ?? []
  const planSteps = [input.plan.trigger, ...input.plan.actions].filter(
    (step): step is FlowBuildPlanStep => !!step,
  )
  const capabilitySearches = traceEvents.filter(
    (event) => event.type === 'capabilities_searched',
  ).length
  const premadeSteps = planSteps.filter((step) => step.source === 'premade').length
  const customSteps = input.plan.actions.filter((step) => step.source === 'custom_blueprint').length
  const unsupportedSteps = planSteps.filter(
    (step) => step.source === 'unsupported_candidate',
  ).length
  const missingFields = planSteps.reduce((count, step) => count + step.missing_fields.length, 0)
  const requiredClarifications = input.required_clarifications ?? 0
  const unresolvedMissingFields = Math.max(0, missingFields - requiredClarifications)
  const unsupportedActionAttempts =
    input.unsupported_action_attempts ??
    unsupportedSteps +
      traceEvents.filter((event) => event.type === 'unsupported_request_detected').length
  const schemaValidationErrors =
    input.schema_validation_errors ??
    input.plan.validation_errors.length +
      traceEvents.filter((event) => event.type === 'schema_validation_failed').length
  const hallucinatedCapabilityIds = input.hallucinated_capability_ids ?? 0
  const clarificationQuestions = requiredClarifications
  const totalSteps = (input.plan.trigger ? 1 : 0) + input.plan.actions.length
  const premadeReuseRate = totalSteps === 0 ? 0 : premadeSteps / totalSteps

  let score = 100
  if (capabilitySearches === 0) score -= 25
  if (premadeSteps === 0 && totalSteps > 0) score -= 15
  if (premadeReuseRate < 0.5 && totalSteps > 1) score -= 10
  score -= Math.min(customSteps * 15, 30)
  if (requiredClarifications > 0 && clarificationQuestions === 0) score -= 20
  if (input.compiled_without_validation) score -= 20
  score -= Math.min(unresolvedMissingFields * 8, 32)
  score -= Math.min(schemaValidationErrors * 8, 32)
  score -= Math.min(unsupportedActionAttempts * 15, 45)
  score -= Math.min(hallucinatedCapabilityIds * 25, 50)
  score = Math.max(0, Math.min(100, score))

  const strengths: string[] = []
  const risks: string[] = []
  if (capabilitySearches > 0) strengths.push('searched capabilities before planning')
  else risks.push('planned without capability search evidence')
  if (premadeReuseRate >= 0.5) strengths.push('reused premade capabilities first')
  else risks.push('low premade reuse rate')
  if (clarificationQuestions > 0) strengths.push('asked clarifying questions for missing inputs')
  if (missingFields > 0 && unresolvedMissingFields === 0) {
    strengths.push('tracked missing fields with clarifications')
  }
  if (unresolvedMissingFields > 0) risks.push('missing fields were not fully clarified')
  if (customSteps > 0)
    risks.push('custom blueprint steps need stricter validation than premade steps')
  if (schemaValidationErrors > 0) risks.push('schema validation errors need repair')
  if (unsupportedActionAttempts > 0) risks.push('unsupported requests were attempted or detected')
  if (hallucinatedCapabilityIds > 0) risks.push('referenced capabilities outside the catalog')

  return {
    score,
    rank: rankFlowBuildScore(score),
    capability_searches: capabilitySearches,
    premade_steps: premadeSteps,
    custom_steps: customSteps,
    unsupported_action_attempts: unsupportedActionAttempts,
    schema_validation_errors: schemaValidationErrors,
    hallucinated_capability_ids: hallucinatedCapabilityIds,
    clarification_questions: clarificationQuestions,
    missing_fields: missingFields,
    unresolved_missing_fields: unresolvedMissingFields,
    premade_reuse_rate: Number(premadeReuseRate.toFixed(2)),
    strengths,
    risks,
  }
}

function rankFlowBuildScore(score: number): FlowBuildEvaluationRank {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 65) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}
