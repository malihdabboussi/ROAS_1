export type ModelStrategy = 'auto' | 'auto:economy' | 'auto:power'

export type TaskType =
  | 'chat'
  | 'mission_plan'
  | 'mission_execute'
  | 'mission_review'
  | 'mission_awareness'
  | 'mission_quality_eval'

export type StrategyModelReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

export interface StrategyModelSettings {
  reasoning_effort?: StrategyModelReasoningEffort
  context_window_tokens?: number
  speed_mode?: 'standard' | 'fast'
}

export interface ResolvedStrategyModel {
  modelId: string
  reason: string
  modelSettings?: StrategyModelSettings
}

const POWER_MODEL_ID = 'anthropic/claude-opus-4.8'
const POWER_MODEL_SETTINGS = {
  context_window_tokens: 1_000_000,
  reasoning_effort: 'high',
  speed_mode: 'standard',
} satisfies StrategyModelSettings

function powerModel(reason: string): ResolvedStrategyModel {
  return {
    modelId: POWER_MODEL_ID,
    reason,
    modelSettings: POWER_MODEL_SETTINGS,
  }
}

const STRATEGY_MATRIX: Record<ModelStrategy, Record<TaskType, ResolvedStrategyModel>> = {
  'auto:economy': {
    chat: {
      modelId: 'google/gemini-3.5-flash',
      reason: 'economy_chat',
    },
    mission_plan: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'economy_mission_plan',
    },
    mission_execute: {
      modelId: 'google/gemini-3.5-flash',
      reason: 'economy_mission_execute',
    },
    mission_review: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'economy_mission_review',
    },
    mission_awareness: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'economy_mission_awareness',
    },
    mission_quality_eval: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'economy_mission_quality_eval',
    },
  },
  auto: {
    chat: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_chat',
    },
    mission_plan: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_mission_plan',
    },
    mission_execute: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_mission_execute',
    },
    mission_review: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_mission_review',
    },
    mission_awareness: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_mission_awareness',
    },
    mission_quality_eval: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_mission_quality_eval',
    },
  },
  'auto:power': {
    chat: powerModel('power_chat'),
    mission_plan: powerModel('power_mission_plan'),
    mission_execute: powerModel('power_mission_execute'),
    mission_review: powerModel('power_mission_review'),
    mission_awareness: powerModel('power_mission_awareness'),
    mission_quality_eval: powerModel('power_mission_quality_eval'),
  },
}

export function isModelStrategy(value: unknown): value is ModelStrategy {
  return value === 'auto' || value === 'auto:economy' || value === 'auto:power'
}

export function resolveModelForStrategy(
  strategy: ModelStrategy,
  task: TaskType,
): ResolvedStrategyModel {
  return STRATEGY_MATRIX[strategy][task]
}

const FALLBACK_MATRIX: Record<ModelStrategy, Record<TaskType, ResolvedStrategyModel>> = {
  'auto:economy': {
    chat: { modelId: 'anthropic/claude-haiku-4.5', reason: 'economy_chat_fallback' },
    mission_plan: {
      modelId: 'anthropic/claude-haiku-4.5',
      reason: 'economy_mission_plan_fallback',
    },
    mission_execute: {
      modelId: 'anthropic/claude-haiku-4.5',
      reason: 'economy_mission_execute_fallback',
    },
    mission_review: {
      modelId: 'anthropic/claude-haiku-4.5',
      reason: 'economy_mission_review_fallback',
    },
    mission_awareness: {
      modelId: 'anthropic/claude-haiku-4.5',
      reason: 'economy_mission_awareness_fallback',
    },
    mission_quality_eval: {
      modelId: 'anthropic/claude-haiku-4.5',
      reason: 'economy_mission_quality_eval_fallback',
    },
  },
  auto: {
    chat: { modelId: 'openai/gpt-5.4', reason: 'auto_chat_fallback' },
    mission_plan: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_plan_fallback' },
    mission_execute: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_execute_fallback' },
    mission_review: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_review_fallback' },
    mission_awareness: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_awareness_fallback' },
    mission_quality_eval: {
      modelId: 'openai/gpt-5.4',
      reason: 'auto_mission_quality_eval_fallback',
    },
  },
  'auto:power': {
    chat: { modelId: 'google/gemini-3.1-pro-preview', reason: 'power_chat_fallback' },
    mission_plan: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'power_mission_plan_fallback',
    },
    mission_execute: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'power_mission_execute_fallback',
    },
    mission_review: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'power_mission_review_fallback',
    },
    mission_awareness: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'power_mission_awareness_fallback',
    },
    mission_quality_eval: {
      modelId: 'google/gemini-3.1-pro-preview',
      reason: 'power_mission_quality_eval_fallback',
    },
  },
}

export function resolveFallbackForStrategy(
  strategy: ModelStrategy,
  task: TaskType,
): ResolvedStrategyModel {
  return FALLBACK_MATRIX[strategy][task]
}
