import { getActionContract, isAction, type Action, type ActionContract } from '@vibey/agent-policy'
import {
  FLOW_WORKFLOW_CAPABILITIES,
  type WorkflowCapability,
  type WorkflowCapabilityApprovalPolicy,
  type WorkflowCapabilityKind,
  type WorkflowCapabilitySearchInput,
  type WorkflowCapabilitySearchResult,
  type WorkflowCapabilitySideEffect,
  type WorkflowCapabilityUiControl,
  type WorkflowCapabilityUiField,
} from '@vibey/api-shared/types/workflow-capabilities'
import { ACTIVE_PROMPTMODE_ACTIONS } from './artifact-action-lifecycle'
import { ACTION_SCHEMAS, type ActionParamType, type ActionSchema } from './artifact-action-schemas'

export const AGENT_ACTION_WORKFLOW_CAPABILITY_PREFIX = 'agent_action.'

export type ArtifactWorkflowCapabilitySearchResult = WorkflowCapabilitySearchResult & {
  flow_capability_total: number
  agent_action_total: number
}

export const AGENT_ACTION_WORKFLOW_CAPABILITIES: WorkflowCapability[] =
  buildAgentActionWorkflowCapabilities()

export const ARTIFACT_WORKFLOW_CAPABILITY_GRAPH: WorkflowCapability[] = [
  ...FLOW_WORKFLOW_CAPABILITIES,
  ...AGENT_ACTION_WORKFLOW_CAPABILITIES,
]

export function searchArtifactWorkflowCapabilities(
  input: WorkflowCapabilitySearchInput = {},
): ArtifactWorkflowCapabilitySearchResult {
  const normalizedQuery = input.query?.trim().toLowerCase() ?? ''
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50)
  const offset = parseCursor(input.cursor)

  const filtered = ARTIFACT_WORKFLOW_CAPABILITY_GRAPH.filter((capability) => {
    if (input.kind && capability.kind !== input.kind) return false
    if (input.category && capability.category !== input.category) return false
    if (!normalizedQuery) return true

    return [
      capability.id,
      capability.type,
      capability.label,
      capability.category,
      capability.description,
      capability.input_schema.required_fields.flat().join(' '),
      capability.input_schema.optional_fields.join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const results = filtered.slice(offset, offset + limit)
  const nextOffset = offset + results.length

  return {
    results,
    total: filtered.length,
    limit,
    next_cursor: nextOffset < filtered.length ? String(nextOffset) : null,
    flow_capability_total: FLOW_WORKFLOW_CAPABILITIES.length,
    agent_action_total: AGENT_ACTION_WORKFLOW_CAPABILITIES.length,
  }
}

export function getArtifactWorkflowCapability(capabilityId: string): WorkflowCapability | null {
  return (
    ARTIFACT_WORKFLOW_CAPABILITY_GRAPH.find((capability) => capability.id === capabilityId) ?? null
  )
}

function buildAgentActionWorkflowCapabilities(): WorkflowCapability[] {
  return ACTIVE_PROMPTMODE_ACTIONS.filter(isAction).map((action) =>
    agentActionToWorkflowCapability(action),
  )
}

function agentActionToWorkflowCapability(action: Action): WorkflowCapability {
  const contract = getActionContract(action)
  const schema = ACTION_SCHEMAS[action] ?? { required: [] }
  const kind = resolveWorkflowKind(contract)
  const sideEffect = resolveAgentActionSideEffect(contract, action)
  const label = humanizeAction(action)

  return {
    id: `${AGENT_ACTION_WORKFLOW_CAPABILITY_PREFIX}${action}`,
    source_capability_id: action,
    kind,
    type: action,
    label,
    category: contract.family,
    description: buildDescription(contract, schema),
    contract_quality: 'schema_backed',
    input_schema: {
      source: 'agent_action_schema',
      required_fields: schema.required.map((requirement) =>
        Array.isArray(requirement) ? [...requirement] : requirement,
      ),
      optional_fields: [...(schema.optional ?? [])],
      example: firstExample(schema),
    },
    ui_schema: buildAgentActionUiSchema(label, schema),
    execution: {
      executor: 'agent_action',
      status: kind === 'action' ? 'needs_executor' : 'available',
    },
    side_effect: sideEffect,
    approval_policy: resolveAgentActionApproval(contract, sideEffect),
    contract_gaps: resolveAgentActionContractGaps(kind),
  }
}

function resolveWorkflowKind(contract: ActionContract): WorkflowCapabilityKind {
  if (contract.family === 'flow') return 'control'
  if (contract.operation === 'read' || contract.operation === 'search') return 'context_reader'
  return 'action'
}

function buildDescription(contract: ActionContract, schema: ActionSchema): string {
  const firstUseWhen = schema.useWhen?.[0]
  return firstUseWhen
    ? `${contract.userVisibleResult}. ${firstUseWhen}`
    : contract.userVisibleResult
}

function firstExample(schema: ActionSchema): Record<string, unknown> {
  const example = schema.examples?.[0]?.data
  return example && typeof example === 'object' && !Array.isArray(example) ? { ...example } : {}
}

function buildAgentActionUiSchema(label: string, schema: ActionSchema) {
  return {
    source: 'derived_default' as const,
    display: 'form' as const,
    fields: buildAgentActionUiFields(schema),
    summary_template: buildSummaryTemplate(label, schema),
  }
}

function buildAgentActionUiFields(schema: ActionSchema): WorkflowCapabilityUiField[] {
  const requiredSingles = new Set<string>()
  const requiredGroups = new Map<string, string[]>()

  for (const requirement of schema.required) {
    if (Array.isArray(requirement)) {
      for (const field of requirement) requiredGroups.set(field, [...requirement])
    } else {
      requiredSingles.add(requirement)
    }
  }

  const fieldNames = [
    ...schema.required.flatMap((requirement) =>
      Array.isArray(requirement) ? requirement : [requirement],
    ),
    ...(schema.optional ?? []),
  ]
  const uniqueNames = [...new Set(fieldNames)]

  return uniqueNames.map((field) => {
    const requiredGroup = requiredGroups.get(field)
    return {
      field,
      label: humanizeFieldName(field),
      required: requiredSingles.has(field),
      required_group: requiredGroup,
      control: resolveUiControl(field, schema.types?.[field]),
    }
  })
}

function resolveUiControl(
  field: string,
  type: ActionParamType | undefined,
): WorkflowCapabilityUiControl {
  if (field === 'agent_key' || field === 'target_agent_key') return 'agent_picker'
  if (field === 'connected_account_id') return 'connected_account_picker'
  if (field === 'field_id' || field.endsWith('_field_id')) return 'field_picker'
  if (field === 'schedule') return 'schedule_builder'
  if (field === 'timezone') return 'timezone_picker'
  if (field.endsWith('_email') || field === 'email') return 'email'
  if (type === 'number') return 'number'
  if (type === 'platform' || type === 'boolean') return 'select'
  if (type === 'object' || type === 'object_array' || type === 'string_array') return 'textarea'
  if (field.includes('template') || field.includes('message') || field.includes('prompt')) {
    return 'template_text'
  }
  if (
    field.endsWith('_id') ||
    field === 'id' ||
    field === 'uri' ||
    field === 'path' ||
    field === 'url'
  ) {
    return 'resource_picker'
  }
  if (field.includes('description') || field.includes('content') || field.includes('notes')) {
    return 'textarea'
  }
  return 'text'
}

function resolveAgentActionSideEffect(
  contract: ActionContract,
  action: Action,
): WorkflowCapabilitySideEffect {
  if (contract.operation === 'read' || contract.operation === 'search') return 'read_only'
  if (
    contract.operation === 'delete' ||
    action.startsWith('delete_') ||
    action.startsWith('archive_')
  ) {
    return 'destructive'
  }
  if (contract.operation === 'send' || action.startsWith('send_')) return 'external_communication'
  if (
    contract.operation === 'publish' ||
    action.startsWith('publish_') ||
    action.startsWith('schedule_')
  ) {
    return 'public_publish'
  }
  if (contract.domain === 'use_integrations' || contract.family.startsWith('integration')) {
    return 'integration_write'
  }
  if (contract.family.startsWith('brain')) return 'knowledge_write'
  return 'platform_write'
}

function resolveAgentActionApproval(
  contract: ActionContract,
  sideEffect: WorkflowCapabilitySideEffect,
): WorkflowCapabilityApprovalPolicy {
  if (sideEffect === 'read_only') return 'none'
  if (sideEffect === 'destructive') return 'admin_review'
  if (
    sideEffect === 'external_communication' ||
    sideEffect === 'public_publish' ||
    sideEffect === 'integration_write' ||
    sideEffect === 'knowledge_write'
  ) {
    return 'user_review'
  }
  return contract.requiresExplicitUserIntent ? 'user_review' : 'none'
}

function resolveAgentActionContractGaps(kind: WorkflowCapabilityKind): string[] {
  const gaps = ['output_context_contract', 'idempotency_contract', 'authored_ui_schema']
  if (kind === 'action') gaps.push('flow_runtime_executor_bridge')
  if (kind === 'context_reader') gaps.push('context_output_mapping')
  return gaps
}

function buildSummaryTemplate(label: string, schema: ActionSchema): string {
  const firstRequirement = schema.required[0]
  const field = Array.isArray(firstRequirement) ? firstRequirement[0] : firstRequirement
  return field ? `${label}: {{${field}}}` : label
}

function humanizeAction(action: string): string {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function humanizeFieldName(field: string): string {
  return field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0
  const parsed = Number.parseInt(cursor, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}
