import { ERRORS } from './errors.config.js'
import { MESSAGES } from './messages.config.js'

export const DEFAULT_ALLOWED_MODELS = [
  'openai/gpt-5.6-luna',
  'openai/gpt-5.6-terra',
  'z-ai/glm-5.2',
]

export interface LoaderConfig {
  text: string
  style: 'gradient' | 'spinner' | 'minimal'
}

export interface DisplayConfig {
  inputStyle: 'block' | 'bordered' | 'plain'
  loader: LoaderConfig
  reasoning: boolean
  toolDisplay: 'emoji' | 'grouped' | 'minimal' | 'hidden'
}

export interface AgentConfig {
  allowedModels: string[]
  apiKey: string
  costQualityTradeoff: number
  display: DisplayConfig
  maxSteps: number
  model: string
  sessionDir: string
  systemPrompt: string
}

function parseAllowedModels(value: string | undefined): string[] {
  const models = value
    ?.split(',')
    .map((model) => model.trim())
    .filter(Boolean)
  return models?.length ? [...new Set(models)] : [...DEFAULT_ALLOWED_MODELS]
}

export function loadConfig(): AgentConfig {
  const apiKey =
    process.env.OPENROUTER_INTERACTIVE_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(ERRORS.missingApiKey)
  }

  return {
    allowedModels: parseAllowedModels(process.env.OPENROUTER_MODEL_SCOUT_ALLOWED_MODELS),
    apiKey,
    costQualityTradeoff: 9,
    display: {
      inputStyle: 'block',
      loader: { text: MESSAGES.scouting, style: 'spinner' },
      reasoning: false,
      toolDisplay: 'grouped',
    },
    maxSteps: Math.min(
      Math.max(Number.parseInt(process.env.OPENROUTER_MODEL_SCOUT_MAX_STEPS || '8', 10) || 8, 1),
      20,
    ),
    model: process.env.OPENROUTER_MODEL_SCOUT_MODEL?.trim() || 'openrouter/auto-beta',
    sessionDir: process.env.OPENROUTER_MODEL_SCOUT_SESSION_DIR?.trim() || '.sessions/model-scout',
    systemPrompt: [
      'You are ROAS Model Scout, a specialist in the live OpenRouter model catalog.',
      'Use the model tools before stating a model ID, price, context window, or capability.',
      'State prices per million tokens and distinguish current API facts from recommendations.',
      'For discounts and promotions, use web search because promotions change over time.',
      'Prefer the approved low-cost pool unless the user explicitly asks for another model.',
      'OpenRouter custom classifiers are workspace reporting features managed by admins in the UI; do not claim a public management API exists.',
      'Never reveal credentials or include them in tool output.',
    ].join('\n'),
  }
}
