import { backendGet } from '@/lib/api/backend-client'
import type { ModelReasoningEffort } from './chat-model-settings'

export interface LlmModelOption {
  id: string
  provider: string
  modelName: string
  label: string
  billingSource?: 'vibey' | 'subscription'
  contextWindow: number
  maxOutputTokens: number | null
  supportsImages: boolean
  inputModalities: string[]
  outputModalities: string[]
  supportedParameters: string[]
  capabilityProfile?: Record<string, unknown>
  contextOptions: Array<{ tokens: number; label: string; pricingProfile?: string }>
  reasoningLevels: ModelReasoningEffort[]
  speedModes: Array<'standard' | 'fast'>
  pricing: Record<string, number>
  pricingTiers: Array<{
    pricingProfile: string
    thresholdMinTokens: number
    thresholdMaxTokens: number | null
    inputTokens1k: number | null
    outputTokens1k: number | null
    cacheRead1k: number | null
    cacheWrite1k: number | null
    currency: string
    source: string
  }>
}

export async function fetchLlmModels(): Promise<LlmModelOption[]> {
  return backendGet<LlmModelOption[]>('/api/models')
}
