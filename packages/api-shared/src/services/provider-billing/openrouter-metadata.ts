import type {
  OpenRouterGenerationSettlement,
  ProviderBillingUsage,
  ZeroCostValidationResult,
} from './provider-billing.types'

type HeadersLike =
  | Pick<Headers, 'get'>
  | Record<string, string | string[] | number | null | undefined>

const OPENROUTER_GENERATION_HEADER_NAMES = [
  'x-generation-id',
  'x-openrouter-generation-id',
  'openrouter-generation-id',
]

const OPENROUTER_REQUEST_HEADER_NAMES = ['x-request-id', 'cf-ray', 'request-id']

export function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  return null
}

export function extractOpenRouterGenerationId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  return (
    extractOpenRouterGenerationId(record.provider_generation_id) ??
    extractOpenRouterGenerationId(record.generation_id) ??
    extractOpenRouterGenerationId(record.provider_response_id) ??
    extractOpenRouterGenerationId(record.id)
  )
}

export function readHeaderValue(headers: HeadersLike | undefined, names: string[]): string | null {
  if (!headers) return null
  const getter = (headers as Pick<Headers, 'get'>).get
  if (typeof getter === 'function') {
    for (const name of names) {
      const value = getter.call(headers, name)
      if (value) return value
    }
    return null
  }

  const record = headers as Record<string, string | string[] | number | null | undefined>
  const lowerKeys = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]))
  for (const name of names) {
    const matchingKey = lowerKeys.get(name.toLowerCase())
    if (!matchingKey) continue
    const value = record[matchingKey]
    if (Array.isArray(value)) return value.find((entry) => entry.trim())?.trim() ?? null
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim()
  }
  return null
}

export function readOpenRouterGenerationId(headers: HeadersLike | undefined): string | null {
  return extractOpenRouterGenerationId(
    readHeaderValue(headers, OPENROUTER_GENERATION_HEADER_NAMES),
  )
}

export function readOpenRouterRequestId(headers: HeadersLike | undefined): string | null {
  return readHeaderValue(headers, OPENROUTER_REQUEST_HEADER_NAMES)
}

export function normalizeProviderBillingUsage(input: {
  inputTokens?: unknown
  outputTokens?: unknown
  cacheReadTokens?: unknown
  cacheWriteTokens?: unknown
  totalTokens?: unknown
}): ProviderBillingUsage {
  const inputTokens = Math.max(0, Math.trunc(coerceFiniteNumber(input.inputTokens) ?? 0))
  const outputTokens = Math.max(0, Math.trunc(coerceFiniteNumber(input.outputTokens) ?? 0))
  const cacheRead = Math.max(0, Math.trunc(coerceFiniteNumber(input.cacheReadTokens) ?? 0))
  const cacheWrite = Math.max(0, Math.trunc(coerceFiniteNumber(input.cacheWriteTokens) ?? 0))
  const explicitTotal = coerceFiniteNumber(input.totalTokens)
  return {
    input: inputTokens,
    output: outputTokens,
    cacheRead,
    cacheWrite,
    totalTokens: Math.max(
      0,
      Math.trunc(explicitTotal ?? inputTokens + outputTokens + cacheRead + cacheWrite),
    ),
  }
}

export function normalizeOpenRouterGenerationPayload(
  payload: unknown,
): OpenRouterGenerationSettlement {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const data =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root
  const generationId =
    extractOpenRouterGenerationId(data.id) ??
    extractOpenRouterGenerationId(data.generation_id) ??
    extractOpenRouterGenerationId(data.provider_generation_id) ??
    ''
  const usage = normalizeProviderBillingUsage({
    inputTokens:
      data.input_tokens ??
      data.tokens_prompt ??
      data.prompt_tokens ??
      data.native_tokens_prompt,
    outputTokens:
      data.output_tokens ??
      data.tokens_completion ??
      data.completion_tokens ??
      data.native_tokens_completion,
    cacheReadTokens: data.cache_read_tokens ?? data.cache_read_input_tokens,
    cacheWriteTokens: data.cache_write_tokens ?? data.cache_creation_input_tokens,
    totalTokens: data.total_tokens,
  })
  const status = typeof data.status === 'string' ? data.status : undefined
  const finishReason =
    typeof data.finish_reason === 'string' ? data.finish_reason : undefined
  const cancelled =
    data.cancelled === true ||
    status === 'cancelled' ||
    finishReason === 'cancelled'
  const noCharge = data.no_charge === true || data.billing_status === 'no_charge'

  return {
    generationId,
    model: typeof data.model === 'string' ? data.model : undefined,
    resolvedModel:
      typeof data.resolved_model === 'string'
        ? data.resolved_model
        : typeof data.model === 'string'
          ? data.model
          : undefined,
    providerName:
      typeof data.provider_name === 'string'
        ? data.provider_name
        : typeof data.provider === 'string'
          ? data.provider
          : undefined,
    costUsd:
      coerceFiniteNumber(data.total_cost) ??
      coerceFiniteNumber(data.cost) ??
      coerceFiniteNumber((data.usage as Record<string, unknown> | undefined)?.cost),
    usage,
    cancelled,
    noCharge,
    status,
    finishReason,
    raw: data,
  }
}

export function validateOpenRouterSettledCost(
  settlement: OpenRouterGenerationSettlement,
  modelName?: string | null,
): ZeroCostValidationResult {
  if (settlement.costUsd === null) return { acceptable: false, reason: 'missing_cost' }
  if (settlement.costUsd > 0) return { acceptable: true }
  if (settlement.cancelled) return { acceptable: true, reason: 'cancelled' }
  if (settlement.noCharge) return { acceptable: true, reason: 'no_charge' }

  const model = (modelName ?? settlement.resolvedModel ?? settlement.model ?? '').toLowerCase()
  if (model.includes(':free') || model.includes('/free')) {
    return { acceptable: true, reason: 'free_model' }
  }
  return { acceptable: false, reason: 'paid_model_zero_cost' }
}
