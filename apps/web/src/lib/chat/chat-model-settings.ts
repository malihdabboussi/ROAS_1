export type ModelReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

export interface ChatModelSettings {
  reasoning_effort?: ModelReasoningEffort
  context_window_tokens?: number
  speed_mode?: 'standard' | 'fast'
  cortex_max?: boolean
}

export function readChatModelSettingsFromValue(
  raw: unknown,
  options: { includeCortexMax?: boolean } = {},
): ChatModelSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const settings = raw as Record<string, unknown>
  const result: ChatModelSettings = {}
  if (typeof settings.context_window_tokens === 'number') {
    result.context_window_tokens = settings.context_window_tokens
  }
  if (typeof settings.reasoning_effort === 'string') {
    result.reasoning_effort = settings.reasoning_effort as ModelReasoningEffort
  }
  if (settings.speed_mode === 'fast' || settings.speed_mode === 'standard') {
    result.speed_mode = settings.speed_mode
  }
  if (options.includeCortexMax && typeof settings.cortex_max === 'boolean') {
    result.cortex_max = settings.cortex_max
  }
  return Object.keys(result).length > 0 ? result : null
}

export function readConversationModelSettings(
  metadata: Record<string, unknown> | undefined,
): ChatModelSettings | null {
  return readChatModelSettingsFromValue(metadata?.model_settings, { includeCortexMax: true })
}
