import { coerceFiniteNumber, normalizeProviderBillingUsage } from './openrouter-metadata'
import type { ProviderBillingUsage } from './provider-billing.types'

export type OpenRouterImageOutput = {
  imageBytesB64: string
  mimeType: string
  resolvedModel: string | null
  providerCostUsd: number | null
  usage: ProviderBillingUsage
}

export type OpenRouterImageResponseShape = {
  topLevelKeys: string[]
  dataCount: number
  hasImageBytes: boolean
  hasUsage: boolean
  hasResponseId: boolean
}

export class ProviderOutputValidationError extends Error {
  readonly attemptId: string
  readonly providerGenerationId: string | null
  readonly providerCostUsd: number | null
  readonly providerEffectConfirmed: boolean

  constructor(input: {
    attemptId: string
    providerGenerationId: string | null
    providerCostUsd: number | null
    providerEffectConfirmed: boolean
  }) {
    super(
      input.providerEffectConfirmed
        ? 'The image provider completed and billed this request, but the returned image could not be validated. Do not retry automatically.'
        : 'The image provider response could not be validated. Its billing effect is unknown, so do not retry automatically.',
    )
    this.name = 'ProviderOutputValidationError'
    this.attemptId = input.attemptId
    this.providerGenerationId = input.providerGenerationId
    this.providerCostUsd = input.providerCostUsd
    this.providerEffectConfirmed = input.providerEffectConfirmed
  }
}

export function parseOpenRouterImageOutput(payload: unknown): OpenRouterImageOutput | null {
  if (!isRecord(payload)) return null
  const data = Array.isArray(payload.data) ? payload.data : []
  const firstImage = data.find(
    (entry): entry is Record<string, unknown> =>
      isRecord(entry) && typeof entry.b64_json === 'string' && entry.b64_json.length > 0,
  )
  if (!firstImage) return null

  const usage = isRecord(payload.usage) ? payload.usage : {}
  return {
    imageBytesB64: firstImage.b64_json as string,
    mimeType:
      typeof firstImage.media_type === 'string' && firstImage.media_type.length > 0
        ? firstImage.media_type
        : 'image/png',
    resolvedModel: typeof payload.model === 'string' ? payload.model : null,
    providerCostUsd:
      coerceFiniteNumber(usage.cost) ??
      coerceFiniteNumber(usage.total_cost) ??
      coerceFiniteNumber(payload.total_cost) ??
      coerceFiniteNumber(payload.cost),
    usage: normalizeProviderBillingUsage({
      inputTokens: usage.prompt_tokens ?? usage.input_tokens,
      outputTokens: usage.completion_tokens ?? usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? usage.cache_read_tokens,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? usage.cache_write_tokens,
      totalTokens: usage.total_tokens,
    }),
  }
}

export function summarizeOpenRouterImageResponse(payload: unknown): OpenRouterImageResponseShape {
  if (!isRecord(payload)) {
    return {
      topLevelKeys: [],
      dataCount: 0,
      hasImageBytes: false,
      hasUsage: false,
      hasResponseId: false,
    }
  }
  const data = Array.isArray(payload.data) ? payload.data : []
  return {
    topLevelKeys: Object.keys(payload).sort().slice(0, 20),
    dataCount: data.length,
    hasImageBytes: data.some(
      (entry) => isRecord(entry) && typeof entry.b64_json === 'string' && entry.b64_json.length > 0,
    ),
    hasUsage: isRecord(payload.usage),
    hasResponseId: typeof payload.id === 'string' && payload.id.length > 0,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
