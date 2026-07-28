import type { UsageData } from '../types/stream-events'
import { resolveOpenRouterGenerationId } from './openclaw-model-routing'
import type { CompletedGeneration } from './openclaw-proxy.types'

function readNumber(...values: unknown[]): number | undefined {
  return values.find((candidate): candidate is number => typeof candidate === 'number')
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function parseUsage(value: unknown): UsageData | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const usage = value as Record<string, unknown>
  return {
    input_tokens: readNumber(usage.input_tokens, usage.input),
    output_tokens: readNumber(usage.output_tokens, usage.output),
    cache_read_input_tokens: readNumber(usage.cache_read_input_tokens, usage.cacheRead) ?? 0,
    cache_creation_input_tokens:
      readNumber(usage.cache_creation_input_tokens, usage.cacheWrite) ?? 0,
    total_tokens: readNumber(usage.total_tokens, usage.totalTokens),
  }
}

export function parseCompletedProviderGeneration(
  value: unknown,
  fallbackId: unknown,
  fallbackModel: string | undefined,
  stage: 'research' | 'write' | undefined,
): CompletedGeneration | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const generation = value as Record<string, unknown>
  return {
    generationId:
      resolveOpenRouterGenerationId(generation.generationId) ??
      resolveOpenRouterGenerationId(generation.providerResponseId) ??
      resolveOpenRouterGenerationId(generation.provider_response_id) ??
      resolveOpenRouterGenerationId(fallbackId),
    usage: parseUsage(generation.usage),
    model: readString(generation.model) ?? fallbackModel,
    providerCost: readNumber(generation.providerCost, generation.provider_cost),
    stage,
  }
}
