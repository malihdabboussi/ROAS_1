import type {
  FlowActionBlueprint,
  FlowBuilderContext,
  FlowBuildEvaluationSummary,
  FlowBuildPlan,
  FlowBuildSessionSummary,
} from '@vibey/api-shared/types/flow-builder'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import {
  buildFlowsConceptSpaceSchema,
  FLOWS_CONCEPT_SPACE_TITLE,
  matchesFlowsConceptSpace,
} from '@/lib/flows/flows-scope-storage'
import {
  createSpace,
  fetchSpaces,
} from '@/features/spaces/services/spaces.service'
import type { FlowAutomation } from '../types/flow-automation.types'
import type { FlowBuildSessionLink } from '../types/flow-build-session-link.types'

export type FlowCapabilityKind = 'trigger' | 'action'

export interface FlowCapability {
  id: string
  kind: FlowCapabilityKind
  type: string
  label: string
  category: string
  description: string
  requiredFields: string[]
  optionalFields: string[]
  compatibleTriggerTypes?: string[]
  example: Record<string, unknown>
}

export interface FlowCapabilitySearchResult {
  results: FlowCapability[]
  total: number
  limit: number
  next_cursor: string | null
}

export interface FlowValidationResult {
  valid: boolean
  errors: string[]
}

export interface FlowPlanResponse {
  session: Record<string, unknown>
  plan: FlowBuildPlan | null
  context?: FlowBuilderContext
  evaluation?: FlowBuildEvaluationSummary
}

export interface FlowBlueprintResponse {
  blueprint: FlowActionBlueprint
  validation?: FlowValidationResult
}

export async function fetchFlows(spaceId: string): Promise<FlowAutomation[]> {
  return backendGet<FlowAutomation[]>(`/api/spaces/${spaceId}/automations/flows`)
}

export async function fetchOrgFlows(options?: {
  campaignId?: string | null
  spaceId?: string | null
}): Promise<FlowAutomation[]> {
  const params = new URLSearchParams()
  if (options?.campaignId) params.set('campaign_id', options.campaignId)
  if (options?.spaceId) params.set('space_id', options.spaceId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return backendGet<FlowAutomation[]>(`/api/automations/flows${suffix}`)
}

export async function ensureFlowsConceptSpace(): Promise<{
  space_id: string
  title: string
  created: boolean
}> {
  for (const path of [
    '/api/automations/flows/concept-space',
    '/api/spaces/ensure-flows-concept',
  ] as const) {
    try {
      return await backendPost<{ space_id: string; title: string; created: boolean }>(path, {})
    } catch {
      // Try the next provisioning endpoint or fall back to client-side ensure below.
    }
  }

  const spaces = await fetchSpaces({ limit: 100 })
  const existing = spaces.find((space) => matchesFlowsConceptSpace(space))
  if (existing) {
    return {
      space_id: existing.id,
      title: existing.title ?? FLOWS_CONCEPT_SPACE_TITLE,
      created: false,
    }
  }

  const created = await createSpace({
    title: FLOWS_CONCEPT_SPACE_TITLE,
    description: 'Sandbox Space for building and testing flows before assigning them elsewhere.',
    visibility: 'team',
    schema: buildFlowsConceptSpaceSchema(),
  })

  return {
    space_id: created.id,
    title: created.title ?? FLOWS_CONCEPT_SPACE_TITLE,
    created: true,
  }
}

export async function fetchFlow(spaceId: string, automationId: string): Promise<FlowAutomation> {
  return backendGet<FlowAutomation>(`/api/spaces/${spaceId}/automations/flows/${automationId}`)
}

export async function createFlowDraft(
  spaceId: string,
  input: {
    name: string
    description?: string | null
    trigger: FlowAutomation['trigger']
    actions: FlowAutomation['actions']
  },
): Promise<FlowAutomation> {
  return backendPost<FlowAutomation>(`/api/spaces/${spaceId}/automations/flows/drafts`, input)
}

export async function updateFlowDraft(
  spaceId: string,
  automationId: string,
  input: Partial<Pick<FlowAutomation, 'name' | 'description' | 'trigger' | 'actions'>>,
): Promise<FlowAutomation> {
  return backendPatch<FlowAutomation>(
    `/api/spaces/${spaceId}/automations/flows/${automationId}`,
    input,
  )
}

export async function updateFlow(
  spaceId: string,
  automationId: string,
  input: Partial<Pick<FlowAutomation, 'name' | 'description' | 'enabled' | 'trigger' | 'actions'>>,
): Promise<FlowAutomation> {
  return backendPatch<FlowAutomation>(`/api/spaces/${spaceId}/automations/${automationId}`, input)
}

export async function deleteFlow(
  spaceId: string,
  automationId: string,
): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(`/api/spaces/${spaceId}/automations/${automationId}`)
}

export async function validateFlowDraft(
  spaceId: string,
  flow: FlowAutomation,
): Promise<FlowValidationResult> {
  return backendPost<FlowValidationResult>(`/api/spaces/${spaceId}/automations/flows/validate`, {
    flow,
  })
}

export async function publishFlow(
  spaceId: string,
  automationId: string,
): Promise<{ flow: FlowAutomation; validation: FlowValidationResult }> {
  return backendPost<{ flow: FlowAutomation; validation: FlowValidationResult }>(
    `/api/spaces/${spaceId}/automations/flows/${automationId}/publish`,
    {},
  )
}

export async function searchFlowCapabilities(
  spaceId: string,
  input: {
    query?: string
    kind?: FlowCapabilityKind
    category?: string
    limit?: number
    cursor?: string | null
  },
): Promise<FlowCapabilitySearchResult> {
  return backendPost<FlowCapabilitySearchResult>(
    `/api/spaces/${spaceId}/automations/capabilities/search`,
    input,
  )
}

export async function getFlowCapability(
  spaceId: string,
  capabilityId: string,
): Promise<FlowCapability> {
  return backendGet<FlowCapability>(
    `/api/spaces/${spaceId}/automations/capabilities/${encodeURIComponent(capabilityId)}`,
  )
}

export async function fetchFlowBuildContext(spaceId: string): Promise<FlowBuilderContext> {
  return backendGet<FlowBuilderContext>(`/api/spaces/${spaceId}/automations/flows/build-context`)
}

export async function fetchLatestFlowBuildSession(
  spaceId: string,
  options?: { conversationId?: string | null },
): Promise<FlowBuildSessionSummary | null> {
  const params = new URLSearchParams()
  if (options?.conversationId) params.set('conversation_id', options.conversationId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return backendGet<FlowBuildSessionSummary | null>(
    `/api/spaces/${spaceId}/automations/flows/build-sessions/latest${suffix}`,
  )
}

export async function fetchFlowBuildSessionLinks(spaceId: string): Promise<FlowBuildSessionLink[]> {
  return backendGet<FlowBuildSessionLink[]>(
    `/api/spaces/${spaceId}/automations/flows/build-sessions`,
  )
}

export async function fetchFlowBuildSession(
  spaceId: string,
  sessionId: string,
): Promise<FlowBuildSessionSummary> {
  return backendGet<FlowBuildSessionSummary>(
    `/api/spaces/${spaceId}/automations/flows/build-sessions/${sessionId}`,
  )
}

export async function deleteFlowBuildSession(
  spaceId: string,
  sessionId: string,
): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(
    `/api/spaces/${spaceId}/automations/flows/build-sessions/${sessionId}`,
  )
}

export async function createFlowBuildSession(
  spaceId: string,
  input: {
    intent: string
    name?: string
    mode?: 'create' | 'update'
    target_automation_id?: string
    conversation_id?: string
  },
): Promise<FlowBuildSessionSummary> {
  return backendPost<FlowBuildSessionSummary>(
    `/api/spaces/${spaceId}/automations/flows/build-sessions`,
    input,
  )
}

export async function createFlowPlan(
  spaceId: string,
  input: {
    intent: string
    name?: string
    mode?: 'create' | 'update'
    target_automation_id?: string
  },
): Promise<FlowPlanResponse> {
  return backendPost<FlowPlanResponse>(`/api/spaces/${spaceId}/automations/flows/plans`, input)
}

export async function answerFlowClarifications(
  spaceId: string,
  sessionId: string,
  answers: Record<string, unknown>,
): Promise<FlowPlanResponse> {
  return backendPost<FlowPlanResponse>(
    `/api/spaces/${spaceId}/automations/flows/build-sessions/${sessionId}/clarifications/answers`,
    { answers },
  )
}

export async function validateFlowPlan(
  spaceId: string,
  sessionId: string,
): Promise<FlowPlanResponse & { validation: FlowValidationResult }> {
  return backendPost<FlowPlanResponse & { validation: FlowValidationResult }>(
    `/api/spaces/${spaceId}/automations/flows/plans/${sessionId}/validate`,
    {},
  )
}

export async function compileFlowPlan(
  spaceId: string,
  sessionId: string,
  input: { allow_invalid_draft?: boolean } = {},
): Promise<FlowPlanResponse & { automation: FlowAutomation; validation: FlowValidationResult }> {
  return backendPost<
    FlowPlanResponse & { automation: FlowAutomation; validation: FlowValidationResult }
  >(`/api/spaces/${spaceId}/automations/flows/plans/${sessionId}/compile`, input)
}

export async function evaluateFlowPlan(
  spaceId: string,
  sessionId: string,
  input: { scenario_key?: string; prompt?: string } = {},
): Promise<{ evaluation: Record<string, unknown>; summary: FlowBuildEvaluationSummary }> {
  return backendPost<{ evaluation: Record<string, unknown>; summary: FlowBuildEvaluationSummary }>(
    `/api/spaces/${spaceId}/automations/flows/plans/${sessionId}/evaluations`,
    input,
  )
}

export async function listFlowBlueprints(
  spaceId: string,
  input: { status?: FlowActionBlueprint['status']; limit?: number } = {},
): Promise<FlowActionBlueprint[]> {
  const params = new URLSearchParams()
  if (input.status) params.set('status', input.status)
  if (input.limit) params.set('limit', String(input.limit))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return backendGet<FlowActionBlueprint[]>(
    `/api/spaces/${spaceId}/automations/flows/blueprints${suffix}`,
  )
}

export async function createFlowBlueprintDraft(
  spaceId: string,
  input: {
    name: string
    description?: string
    category?: string
    input_schema?: Record<string, unknown>
    action_template: Record<string, unknown>
    required_contexts?: string[]
    output_contexts?: string[]
  },
): Promise<FlowBlueprintResponse> {
  return backendPost<FlowBlueprintResponse>(
    `/api/spaces/${spaceId}/automations/flows/blueprints/drafts`,
    input,
  )
}
