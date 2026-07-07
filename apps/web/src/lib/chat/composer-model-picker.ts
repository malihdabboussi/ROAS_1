import { isModelStrategyId } from '@/lib/agents/model-strategies'
import type {
  ChatModelSettings,
  ModelReasoningEffort,
} from '@/lib/chat/chat-model-settings'
import { readChatModelSettingsFromValue } from '@/lib/chat/chat-model-settings'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'

export function formatTokenK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

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

export function buildModelSettings(params: {
  modelId: string
  selectedOption: LlmModelOption | undefined
  contextWindowTokens: number | null
  reasoningEffort: ModelReasoningEffort | null
  fastMode: boolean
}): ChatModelSettings | null {
  if (isModelStrategyId(params.modelId) || !params.selectedOption) return null
  const settings: ChatModelSettings = {}
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
  return Object.keys(settings).length > 0 ? settings : null
}

export function readModelSettingsFromRecord(raw: unknown): ChatModelSettings | null {
  return readChatModelSettingsFromValue(raw)
}

const INPUT_MODALITY_LABELS: Record<string, string> = {
  image: 'Images',
  file: 'Files & PDFs',
  video: 'Video',
  audio: 'Audio',
}

export function formatModelInputModalities(modalities: string[]): string {
  const nonText = modalities.filter((modality) => modality !== 'text')
  if (nonText.length === 0) return 'Text only'
  return nonText
    .map((modality) => {
      const label = INPUT_MODALITY_LABELS[modality]
      if (label) return label
      return modality.charAt(0).toUpperCase() + modality.slice(1)
    })
    .join(' · ')
}

export function formatModelInfoLine(option: LlmModelOption): string {
  const contextLabel = option.contextOptions[0]?.label ?? formatTokenK(option.contextWindow)
  return `${contextLabel} context · ${formatModelInputModalities(option.inputModalities)}`
}

export function formatModelReasoningSummary(option: LlmModelOption): string | null {
  const levels = option.reasoningLevels.filter((level) => level !== 'none')
  if (levels.length === 0) return null
  return `Reasoning: ${levels.map((level) => formatReasoningLabel(level)).join(', ')}`
}

export function resolveModelPickerState(
  modelId: string,
  modelSettings: ChatModelSettings | null,
  modelOptions: LlmModelOption[],
): {
  contextWindowTokens: number | null
  reasoningEffort: ModelReasoningEffort | null
  fastMode: boolean
} {
  const option = modelOptions.find((row) => row.id === modelId)
  if (!option || isModelStrategyId(modelId)) {
    return { contextWindowTokens: null, reasoningEffort: null, fastMode: false }
  }
  const contextWindowTokens =
    modelSettings?.context_window_tokens &&
    option.contextOptions.some((row) => row.tokens === modelSettings.context_window_tokens)
      ? modelSettings.context_window_tokens
      : (option.contextOptions[0]?.tokens ?? null)
  const reasoningEffort =
    modelSettings?.reasoning_effort &&
    option.reasoningLevels.includes(modelSettings.reasoning_effort)
      ? modelSettings.reasoning_effort
      : (option.reasoningLevels[0] ?? 'none')
  const fastMode = modelSettings?.speed_mode === 'fast' && option.speedModes.includes('fast')
  return { contextWindowTokens, reasoningEffort, fastMode }
}
