export type ModelReasoningTransport =
  | 'none'
  | 'reasoning.effort'
  | 'reasoning.max_tokens'
  | 'verbosity'
export type ModelReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface OpenClawModelSettings {
  reasoningEffort?: ModelReasoningEffort
  reasoningTransport?: ModelReasoningTransport
  contextWindowTokens?: number
}

const ANTHROPIC_SUBSCRIPTION_GATEWAY_MODEL_IDS = new Map<string, string>([
  ['anthropic-subscription/claude-opus-4-6', 'anthropic/claude-opus-4.6'],
  ['anthropic-subscription/claude-opus-4-7', 'anthropic/claude-opus-4.7'],
  ['anthropic-subscription/claude-opus-4-8', 'anthropic/claude-opus-4.8'],
  ['anthropic-subscription/claude-sonnet-4-6', 'anthropic/claude-sonnet-4.6'],
  ['anthropic-subscription/claude-haiku-4-5', 'anthropic/claude-haiku-4.5'],
])

export function resolveGatewayModel(modelOverride: string | undefined, agentId: string): string {
  const raw = (modelOverride ?? '').trim()
  if (!raw) return `openclaw:${agentId}`
  if (raw.startsWith('openclaw:')) return raw

  let normalized = raw
  while (normalized.startsWith('openrouter/openrouter/')) {
    normalized = normalized.replace(/^openrouter\//, '')
  }
  if (normalized.startsWith('openrouter/')) return normalized
  const lower = normalized.toLowerCase()
  if (lower.startsWith('openai-codex/')) return normalized
  if (lower.startsWith('anthropic-subscription/')) {
    return (
      ANTHROPIC_SUBSCRIPTION_GATEWAY_MODEL_IDS.get(lower) ??
      `anthropic/${normalized.slice('anthropic-subscription/'.length)}`
    )
  }
  if (lower === 'gpt-5.3-codex' || lower.startsWith('gpt-5.3-codex-')) {
    return `openai-codex/${normalized}`
  }
  if (lower === 'gpt-5.5-codex' || lower.startsWith('gpt-5.5-codex-')) {
    return `openai-codex/${normalized}`
  }
  if (lower.startsWith('openai/gpt-5.3-codex') || lower.startsWith('openai/gpt-5.5-codex')) {
    return normalized
  }
  return `openrouter/${normalized}`
}

function normalizeResolvedModel(modelId: string): string {
  return modelId
    .replace(/^openrouter\//, '')
    .replace(/^openclaw:/, '')
    .trim()
}

export function resolveOpenRouterGenerationId(value: unknown): string | undefined {
  return typeof value === 'string' && /^gen[-_]/.test(value) ? value : undefined
}

export function isOpenAICodexGatewayModel(resolvedModel: string): boolean {
  const normalized = normalizeResolvedModel(resolvedModel).toLowerCase()
  return (
    normalized.startsWith('openai-codex/') ||
    normalized.startsWith('openai/gpt-5.3-codex') ||
    normalized.startsWith('openai/gpt-5.5-codex')
  )
}

export function isAnthropicClaudeSubscriptionGatewayModel(resolvedModel: string): boolean {
  return resolvedModel.toLowerCase().startsWith('anthropic/claude-')
}

export function isUnsupportedGatewayPayloadError(errorText: string): boolean {
  const lower = errorText.toLowerCase()
  if (!lower.includes('unrecognized key')) return false
  return (
    lower.includes('enabled_toolkits') ||
    lower.includes('disabled_native_actions') ||
    lower.includes('skill_catalog') ||
    lower.includes('lane')
  )
}

const MODEL_MAX_TOKENS: Record<string, number> = {
  'anthropic/claude-fable-5': 128_000,
  'anthropic/claude-opus-4.6': 128_000,
  'anthropic/claude-opus-4.6-fast': 128_000,
  'anthropic/claude-opus-4.7': 128_000,
  'anthropic/claude-opus-4.7-fast': 128_000,
  'anthropic/claude-opus-4.8': 128_000,
  'anthropic/claude-opus-4.8-fast': 128_000,
  'anthropic/claude-sonnet-4.6': 128_000,
  'anthropic/claude-haiku-4.5': 64_000,
  'anthropic/claude-opus-4-6': 128_000,
  'anthropic/claude-opus-4-7': 128_000,
  'anthropic/claude-opus-4-8': 128_000,
  'anthropic/claude-sonnet-4-6': 128_000,
  'anthropic/claude-haiku-4-5': 64_000,
  'deepseek/deepseek-v4-flash': 131_072,
  'google/gemini-3.5-flash': 65_536,
  'google/gemini-3.1-pro-preview': 65_536,
  'minimax/minimax-m2.5': 196_608,
  'openai/gpt-5.4': 128_000,
  'openai/gpt-5.4-pro': 128_000,
  'openai/gpt-5.5': 128_000,
  'openai/gpt-5.3-codex': 128_000,
  'openai/gpt-5.5-codex': 128_000,
  'openai-codex/gpt-5.3-codex': 128_000,
  'openai-codex/gpt-5.5-codex': 128_000,
  'openai-codex/gpt-5.5': 128_000,
}

const DEFAULT_MAX_TOKENS = 128_000

export function resolveGatewayMaxTokens(resolvedModel: string): number {
  const normalized = normalizeResolvedModel(resolvedModel)
  return MODEL_MAX_TOKENS[normalized] ?? DEFAULT_MAX_TOKENS
}

export function effortToReasoningBudget(effort: ModelReasoningEffort): number {
  switch (effort) {
    case 'minimal':
      return 1_024
    case 'low':
      return 4_096
    case 'medium':
      return 8_192
    case 'high':
      return 16_384
    case 'xhigh':
      return 32_768
    case 'max':
      return 64_000
    case 'none':
    default:
      return 0
  }
}
