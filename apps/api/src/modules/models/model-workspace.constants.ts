export const DEFAULT_ENABLED_LLM_MODEL_IDS = [
  'anthropic/claude-opus-5',
  'openai/gpt-5.6-terra',
  'anthropic/claude-opus-4.8',
  'google/gemini-3.5-flash',
  'google/gemini-3.1-pro-preview',
  'anthropic/claude-sonnet-4.6',
  'openai/gpt-5.5',
  'deepseek/deepseek-v4-flash',
] as const

export const LLM_MODELS_SETTINGS_KEY = 'llm_models'

export type LlmModelsOrgSettings = {
  enabled_model_ids?: string[]
}
