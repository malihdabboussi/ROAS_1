import { normalizeAgentToolFailureFields } from '@vibey/api-shared'
import { isRecord } from '../../shared/ui-block-extractor'

const MAX_KEYS = 24
const MAX_VALUE_LENGTH = 240

const SAFE_SCALAR_KEYS = new Set([
  'action',
  'agent',
  'agent_key',
  'campaign_id',
  'conversation_id',
  'document_id',
  'documentId',
  'effect_state',
  'error_class',
  'error_code',
  'file_name',
  'gateway_agent_id',
  'id',
  'label',
  'limit',
  'model',
  'name',
  'org_id',
  'query',
  'retry_policy',
  'session_key',
  'space_id',
  'status',
  'success',
  'title',
  'tool',
  'tool_name',
  'type',
  'workflow_class',
])

const OMIT_VALUE_KEY_RE =
  /(api[_-]?key|token|secret|password|authorization|bearer|private[_-]?key|client[_-]?secret|access[_-]?key|^content$|html|markdown|body|prompt|source_content|raw|url|uri|image_url|video_url|file_url|signed|download)/i

type TraceSummaryInput = {
  name: string
  action?: string
  toolCallId?: string
  args?: Record<string, unknown>
  result?: unknown
}

function truncateText(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > MAX_VALUE_LENGTH
    ? `${normalized.slice(0, MAX_VALUE_LENGTH - 1)}…`
    : normalized
}

function scalarSummary(value: unknown): string | number | boolean | null | undefined {
  if (value == null) return null
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return truncateText(value)
  return undefined
}

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort()
}

function collectSafeScalars(record: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const key of sortedKeys(record)) {
    if (!SAFE_SCALAR_KEYS.has(key) || OMIT_VALUE_KEY_RE.test(key)) continue
    const value = scalarSummary(record[key])
    if (value !== undefined) fields[key] = value
  }
  return fields
}

function collectArrayCounts(record: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const key of sortedKeys(record)) {
    const value = record[key]
    if (Array.isArray(value)) counts[key] = value.length
  }
  return counts
}

function appendRecordSummary(
  summary: Record<string, unknown>,
  record: Record<string, unknown>,
  prefix = '',
): void {
  const keys = sortedKeys(record)
  if (keys.length > 0) summary[`${prefix}keys`] = keys.slice(0, MAX_KEYS)
  if (keys.length > MAX_KEYS) summary[`${prefix}key_count`] = keys.length

  const fields = collectSafeScalars(record)
  if (Object.keys(fields).length > 0) summary[`${prefix}fields`] = fields

  const counts = collectArrayCounts(record)
  if (Object.keys(counts).length > 0) summary[`${prefix}counts`] = counts
}

function extractJsonTextEnvelope(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.content)) return null
  for (const entry of value.content) {
    if (!isRecord(entry) || entry.type !== 'text' || typeof entry.text !== 'string') continue
    try {
      const parsed = JSON.parse(entry.text) as unknown
      if (isRecord(parsed)) return parsed
    } catch {
      continue
    }
  }
  return null
}

function appendContractFields(
  summary: Record<string, unknown>,
  record: Record<string, unknown>,
): void {
  const normalized = normalizeAgentToolFailureFields(record)
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== undefined) summary[key] = value
  }
}

export function buildToolTraceSummary(input: TraceSummaryInput): {
  action?: string
  tool_call_id?: string
  input?: Record<string, unknown>
  result?: Record<string, unknown>
  error_code?: string
  error_class?: string
  workflow_class?: string
  effect_state?: string
  retry_policy?: string
  observability?: Record<string, unknown>
} {
  const summary: {
    action?: string
    tool_call_id?: string
    input?: Record<string, unknown>
    result?: Record<string, unknown>
    error_code?: string
    error_class?: string
    workflow_class?: string
    effect_state?: string
    retry_policy?: string
    observability?: Record<string, unknown>
  } = {}
  const action =
    input.action ||
    (typeof input.args?.action === 'string' ? input.args.action.trim() : '') ||
    undefined
  if (action) summary.action = action
  if (input.toolCallId) summary.tool_call_id = input.toolCallId

  if (input.args) {
    const inputSummary: Record<string, unknown> = {}
    appendRecordSummary(inputSummary, input.args)
    if (isRecord(input.args.data)) {
      appendRecordSummary(inputSummary, input.args.data, 'data_')
    }
    if (Object.keys(inputSummary).length > 0) summary.input = inputSummary
  }

  if (input.result !== undefined) {
    const resultSummary: Record<string, unknown> = {}
    const normalizedFailure = normalizeAgentToolFailureFields(input.result)
    if (normalizedFailure.error_code) summary.error_code = normalizedFailure.error_code
    if (normalizedFailure.error_class) summary.error_class = normalizedFailure.error_class
    if (normalizedFailure.workflow_class) summary.workflow_class = normalizedFailure.workflow_class
    if (normalizedFailure.effect_state) summary.effect_state = normalizedFailure.effect_state
    if (normalizedFailure.retry_policy) summary.retry_policy = normalizedFailure.retry_policy
    if (normalizedFailure.observability) summary.observability = normalizedFailure.observability
    if (isRecord(input.result)) {
      appendRecordSummary(resultSummary, input.result)
      appendContractFields(resultSummary, input.result)
      const envelope = extractJsonTextEnvelope(input.result)
      if (envelope) {
        appendRecordSummary(resultSummary, envelope, 'envelope_')
        appendContractFields(resultSummary, envelope)
      }
      if (isRecord(input.result.data)) appendRecordSummary(resultSummary, input.result.data, 'data_')
      if (isRecord(input.result.result)) {
        appendRecordSummary(resultSummary, input.result.result, 'result_')
      }
    } else if (Array.isArray(input.result)) {
      resultSummary.kind = 'array'
      resultSummary.count = input.result.length
    } else {
      const value = scalarSummary(input.result)
      resultSummary.kind = input.result === null ? 'null' : typeof input.result
      if (value !== undefined) resultSummary.value = value
    }
    if (Object.keys(resultSummary).length > 0) summary.result = resultSummary
  }

  return summary
}
