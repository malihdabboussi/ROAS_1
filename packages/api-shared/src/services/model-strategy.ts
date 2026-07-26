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

const QUALITY_MODEL_ID = 'anthropic/claude-opus-5'
const HIGH_STAKES_MODEL_ID = 'anthropic/claude-fable-5'
const ECONOMY_MODEL_ID = 'openai/gpt-5.6-terra'
const QUALITY_FALLBACK_MODEL_ID = 'anthropic/claude-sonnet-4.6'

const QUALITY_MODEL_SETTINGS = {
  context_window_tokens: 250_000,
  reasoning_effort: 'medium',
  speed_mode: 'standard',
} satisfies StrategyModelSettings

const ECONOMY_MODEL_SETTINGS = {
  context_window_tokens: 250_000,
  reasoning_effort: 'low',
  speed_mode: 'standard',
} satisfies StrategyModelSettings

function routedModel(
  modelId: string,
  modelSettings: StrategyModelSettings,
  reason: string,
): ResolvedStrategyModel {
  return {
    modelId,
    reason,
    modelSettings,
  }
}

const STRATEGY_MATRIX: Record<ModelStrategy, Record<TaskType, ResolvedStrategyModel>> = {
  'auto:economy': {
    chat: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_chat'),
    mission_plan: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_plan'),
    mission_execute: routedModel(
      ECONOMY_MODEL_ID,
      ECONOMY_MODEL_SETTINGS,
      'economy_mission_execute',
    ),
    mission_review: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_review'),
    mission_awareness: routedModel(
      ECONOMY_MODEL_ID,
      ECONOMY_MODEL_SETTINGS,
      'economy_mission_awareness',
    ),
    mission_quality_eval: routedModel(
      ECONOMY_MODEL_ID,
      ECONOMY_MODEL_SETTINGS,
      'economy_mission_quality_eval',
    ),
  },
  auto: {
    chat: routedModel(QUALITY_MODEL_ID, QUALITY_MODEL_SETTINGS, 'auto_chat'),
    mission_plan: routedModel(QUALITY_MODEL_ID, QUALITY_MODEL_SETTINGS, 'auto_mission_plan'),
    mission_execute: routedModel(QUALITY_MODEL_ID, QUALITY_MODEL_SETTINGS, 'auto_mission_execute'),
    mission_review: routedModel(QUALITY_MODEL_ID, QUALITY_MODEL_SETTINGS, 'auto_mission_review'),
    mission_awareness: routedModel(
      QUALITY_MODEL_ID,
      QUALITY_MODEL_SETTINGS,
      'auto_mission_awareness',
    ),
    mission_quality_eval: routedModel(
      QUALITY_MODEL_ID,
      QUALITY_MODEL_SETTINGS,
      'auto_mission_quality_eval',
    ),
  },
  'auto:power': {
    chat: routedModel(HIGH_STAKES_MODEL_ID, QUALITY_MODEL_SETTINGS, 'power_chat'),
    mission_plan: routedModel(HIGH_STAKES_MODEL_ID, QUALITY_MODEL_SETTINGS, 'power_mission_plan'),
    mission_execute: routedModel(
      HIGH_STAKES_MODEL_ID,
      QUALITY_MODEL_SETTINGS,
      'power_mission_execute',
    ),
    mission_review: routedModel(
      HIGH_STAKES_MODEL_ID,
      QUALITY_MODEL_SETTINGS,
      'power_mission_review',
    ),
    mission_awareness: routedModel(
      HIGH_STAKES_MODEL_ID,
      QUALITY_MODEL_SETTINGS,
      'power_mission_awareness',
    ),
    mission_quality_eval: routedModel(
      HIGH_STAKES_MODEL_ID,
      QUALITY_MODEL_SETTINGS,
      'power_mission_quality_eval',
    ),
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
    chat: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'economy_chat_fallback' },
    mission_plan: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'economy_mission_plan_fallback',
    },
    mission_execute: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'economy_mission_execute_fallback',
    },
    mission_review: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'economy_mission_review_fallback',
    },
    mission_awareness: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'economy_mission_awareness_fallback',
    },
    mission_quality_eval: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'economy_mission_quality_eval_fallback',
    },
  },
  auto: {
    chat: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'auto_chat_fallback' },
    mission_plan: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'auto_mission_plan_fallback' },
    mission_execute: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'auto_mission_execute_fallback',
    },
    mission_review: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'auto_mission_review_fallback' },
    mission_awareness: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'auto_mission_awareness_fallback',
    },
    mission_quality_eval: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'auto_mission_quality_eval_fallback',
    },
  },
  'auto:power': {
    chat: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'power_chat_fallback' },
    mission_plan: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'power_mission_plan_fallback',
    },
    mission_execute: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'power_mission_execute_fallback',
    },
    mission_review: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'power_mission_review_fallback',
    },
    mission_awareness: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
      reason: 'power_mission_awareness_fallback',
    },
    mission_quality_eval: {
      modelId: QUALITY_FALLBACK_MODEL_ID,
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
