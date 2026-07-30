import type {
  ChatModelSettings,
  LlmModelOption,
  ModelReasoningEffort,
} from '@/features/studio/services/chat.service'
import {
  isModelStrategyId,
  MODEL_STRATEGIES as SHARED_MODEL_STRATEGIES,
  type ModelStrategyId,
} from '@/lib/agents/model-strategies'
import { formatTokenK } from './chat-input-format'

const CHAT_INPUT_MODEL_STRATEGY_DESCRIPTIONS: Record<ModelStrategyId, string> = {
  'auto:economy': 'Discounted Terra with lighter thinking for routine work',
  auto: 'Discounted Terra with balanced thinking for everyday work',
  'auto:power': 'Opus 5, 300K context, medium thinking',
}

export const MODEL_STRATEGIES = SHARED_MODEL_STRATEGIES.map((strategy) => ({
  id: strategy.id,
  label: strategy.label,
  description: CHAT_INPUT_MODEL_STRATEGY_DESCRIPTIONS[strategy.id],
  textClass: strategy.textClass,
}))
export type ModelHoverTarget = { kind: 'strategy'; id: string } | { kind: 'cortex' }

export { isModelStrategyId, type ModelStrategyId }

export function formatReasoningLabel(level: ModelReasoningEffort): string {
  switch (level) {
    case 'none':
      return 'None'
    case 'minimal':
      return 'Minimal'
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    case 'xhigh':
      return 'Extra High'
    case 'max':
      return 'Max'
    default:
      return level
  }
}

export function isModelEditable(option: LlmModelOption): boolean {
  return (
    option.contextOptions.length > 1 ||
    option.reasoningLevels.filter((level) => level !== 'none').length > 1 ||
    option.speedModes.includes('fast')
  )
}

export function formatModelDefaultReasoning(option: LlmModelOption): ModelReasoningEffort | null {
  const levels = option.reasoningLevels.filter((level) => level !== 'none')
  if (levels.length === 0) return null
  for (const preferred of ['medium', 'high', 'low', 'minimal', 'xhigh', 'max'] as const) {
    if (levels.includes(preferred)) return preferred
  }
  return levels[0] ?? null
}

export function formatModelRowMeta(
  option: LlmModelOption,
  params: {
    isSelected: boolean
    contextWindowTokens: number | null
    reasoningEffort: ModelReasoningEffort | null
    fastMode: boolean
  },
): string | null {
  if (!isModelEditable(option)) return null
  const contextLabel = params.isSelected
    ? (findContextOption(option, params.contextWindowTokens)?.label ??
      formatTokenK(option.contextWindow))
    : (option.contextOptions[0]?.label ?? formatTokenK(option.contextWindow))
  const reasoning = params.isSelected
    ? params.reasoningEffort === 'none'
      ? null
      : (params.reasoningEffort ?? formatModelDefaultReasoning(option))
    : formatModelDefaultReasoning(option)
  const parts: string[] = [contextLabel]
  if (reasoning) parts.push(formatReasoningLabel(reasoning))
  if (params.isSelected && params.fastMode) parts.push('Fast')
  return parts.join(' ')
}

export function findContextOption(
  option: LlmModelOption | undefined,
  tokens: number | null,
): LlmModelOption['contextOptions'][number] | undefined {
  if (!option) return undefined
  if (tokens) {
    const selected = option.contextOptions.find((contextOption) => contextOption.tokens === tokens)
    if (selected) return selected
  }
  return option.contextOptions[0]
}

export function buildModelSettings(params: {
  model: string
  selectedOption: LlmModelOption | undefined
  contextWindowTokens: number | null
  reasoningEffort: ModelReasoningEffort | null
  fastMode: boolean
  cortexMax: boolean
}): ChatModelSettings {
  const settings: ChatModelSettings = { cortex_max: params.cortexMax }
  if (isModelStrategyId(params.model) || !params.selectedOption) {
    return settings
  }
  if (
    params.contextWindowTokens &&
    params.selectedOption.contextOptions.some(
      (option) => option.tokens === params.contextWindowTokens,
    )
  ) {
    settings.context_window_tokens = params.contextWindowTokens
  }
  if (
    params.reasoningEffort &&
    params.selectedOption.reasoningLevels.includes(params.reasoningEffort)
  ) {
    settings.reasoning_effort = params.reasoningEffort
  }
  settings.speed_mode =
    params.fastMode && params.selectedOption.speedModes.includes('fast') ? 'fast' : 'standard'
  return settings
}

export type ComposerModelPrefs = {
  model: string
  contextWindowTokens: number | null
  reasoningEffort: ModelReasoningEffort | null
  fastMode: boolean
  cortexMax: boolean
}

export function serializeComposerModelPrefs(
  model: string | null,
  settings: ChatModelSettings | null | undefined,
): string {
  return JSON.stringify({
    model,
    reasoning_effort: settings?.reasoning_effort ?? null,
    context_window_tokens: settings?.context_window_tokens ?? null,
    speed_mode: settings?.speed_mode ?? 'standard',
    cortex_max: settings?.cortex_max ?? true,
  })
}

export function applyComposerModelSettings(
  settings: ChatModelSettings | null | undefined,
  setContextWindowTokens: (value: number | null) => void,
  setReasoningEffort: (value: ModelReasoningEffort | null) => void,
  setFastModeEnabled: (value: boolean) => void,
  setCortexMaxEnabled: (value: boolean) => void,
) {
  setContextWindowTokens(settings?.context_window_tokens ?? null)
  setReasoningEffort(settings?.reasoning_effort ?? null)
  setFastModeEnabled(settings?.speed_mode === 'fast')
  setCortexMaxEnabled(settings?.cortex_max ?? true)
}
