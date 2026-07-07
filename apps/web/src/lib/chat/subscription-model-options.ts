import type { LlmModelOption } from '@/lib/chat/llm-models-api'

export const SUBSCRIPTION_MODELS_MENU_LABEL = 'OpenAI Subscription'

export function isSubscriptionModel(option: LlmModelOption): boolean {
  if (option.billingSource === 'subscription') return true
  return option.id.startsWith('openai-codex/')
}

export function partitionModelOptions(modelOptions: LlmModelOption[]): {
  standardModels: LlmModelOption[]
  subscriptionModels: LlmModelOption[]
} {
  const standardModels: LlmModelOption[] = []
  const subscriptionModels: LlmModelOption[] = []
  for (const option of modelOptions) {
    if (isSubscriptionModel(option)) subscriptionModels.push(option)
    else standardModels.push(option)
  }
  return { standardModels, subscriptionModels }
}

export function formatSubscriptionModelDisplayLabel(option: LlmModelOption): string {
  const stripped = option.label.replace(/^OpenAI Subscription\s+/i, '').trim()
  return stripped.length > 0 ? stripped : option.label
}

export function resolveModelDisplayLabel(
  modelId: string,
  modelOptions: LlmModelOption[],
  fallback = 'Custom',
): string {
  const option = modelOptions.find((row) => row.id === modelId)
  if (!option) return fallback
  if (isSubscriptionModel(option)) return formatSubscriptionModelDisplayLabel(option)
  return option.label
}
