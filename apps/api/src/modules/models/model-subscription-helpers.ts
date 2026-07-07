import type { LlmModel } from './services/models.service'
import type { SubscriptionModelDefinition, SubscriptionModelSource } from './model-subscription-catalog'

export function isConnectedIntegration(
  value: unknown,
): value is { status?: unknown; metadata?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'connected'
  )
}

export function readVaultLabel(metadata: unknown, fallback: string): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return fallback
  const label = (metadata as Record<string, unknown>).vault_secret_label
  return typeof label === 'string' && label.trim() ? label : fallback
}

export function toSubscriptionModel(
  base: LlmModel,
  source: SubscriptionModelSource,
  model: SubscriptionModelDefinition,
): LlmModel {
  const [, modelName = model.id] = model.id.split('/')
  return {
    ...base,
    id: model.id,
    provider: source.provider,
    modelName,
    label: model.label,
    billingSource: 'subscription',
    subscriptionProvider: source.provider,
    subscriptionIntegrationId: source.integrationId,
    pricing: {},
    pricingTiers: [],
    capabilityProfile: {
      ...base.capabilityProfile,
      subscription: {
        integrationId: source.integrationId,
        provider: source.provider,
        credentialProvider: source.credentialProvider ?? source.provider,
      },
    },
  }
}
