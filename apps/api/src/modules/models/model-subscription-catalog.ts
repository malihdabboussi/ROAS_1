export type SubscriptionModelDefinition = {
  id: string
  label: string
  baseModelId: string
}

export type SubscriptionModelSource = {
  integrationId: string
  provider: string
  credentialProvider?: string
  vaultLabel: string
  fallbackBaseModelId: string
  models: SubscriptionModelDefinition[]
}

export const PLATFORM_ADMIN_ROLES = new Set<string>(['admin', 'superadmin'])

export const SUBSCRIPTION_MODEL_CATALOG: SubscriptionModelSource[] = [
  {
    integrationId: 'openai_codex',
    provider: 'openai-codex',
    vaultLabel: 'oauth:default',
    fallbackBaseModelId: 'openai/gpt-5.5',
    models: [
      {
        id: 'openai-codex/gpt-5.5',
        label: 'OpenAI Subscription GPT-5.5',
        baseModelId: 'openai/gpt-5.5',
      },
      {
        id: 'openai-codex/gpt-5.5-codex',
        label: 'OpenAI Subscription GPT-5.5 Codex',
        baseModelId: 'openai/gpt-5.5',
      },
      {
        id: 'openai-codex/gpt-5.3-codex',
        label: 'OpenAI Subscription GPT-5.3 Codex',
        baseModelId: 'openai/gpt-5.3-codex',
      },
    ],
  },
  {
    integrationId: 'anthropic_claude',
    provider: 'anthropic-subscription',
    credentialProvider: 'anthropic',
    vaultLabel: 'setup-token:default',
    fallbackBaseModelId: 'anthropic/claude-opus-4.8',
    models: [
      {
        id: 'anthropic-subscription/claude-opus-4-6',
        label: 'Claude Subscription Opus 4.6',
        baseModelId: 'anthropic/claude-opus-4.6',
      },
      {
        id: 'anthropic-subscription/claude-opus-4-7',
        label: 'Claude Subscription Opus 4.7',
        baseModelId: 'anthropic/claude-opus-4.7',
      },
      {
        id: 'anthropic-subscription/claude-opus-4-8',
        label: 'Claude Subscription Opus 4.8',
        baseModelId: 'anthropic/claude-opus-4.8',
      },
      {
        id: 'anthropic-subscription/claude-sonnet-4-6',
        label: 'Claude Subscription Sonnet 4.6',
        baseModelId: 'anthropic/claude-sonnet-4.6',
      },
      {
        id: 'anthropic-subscription/claude-haiku-4-5',
        label: 'Claude Subscription Haiku 4.5',
        baseModelId: 'anthropic/claude-haiku-4.5',
      },
    ],
  },
]
