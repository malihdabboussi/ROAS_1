export type ModelStrategy = 'auto' | 'auto:economy' | 'auto:power'

export type TaskType =
  | 'chat'
  | 'mission_plan'
  | 'mission_execute'
  | 'mission_review'
  | 'mission_awareness'
  | 'mission_quality_eval'

interface ResolvedStrategyModel {
  modelId: string
  reason: string
}

const STRATEGY_MATRIX: Record<ModelStrategy, Record<TaskType, ResolvedStrategyModel>> = {
  'auto:economy': {
    chat: { modelId: 'google/gemini-3.5-flash', reason: 'economy_chat' },
    mission_plan: { modelId: 'google/gemini-3.1-pro-preview', reason: 'economy_mission_plan' },
    mission_execute: {
      modelId: 'google/gemini-3.5-flash',
      reason: 'economy_mission_execute',
    },
    mission_review: { modelId: 'google/gemini-3.1-pro-preview', reason: 'economy_mission_review' },
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
    chat: { modelId: 'anthropic/claude-sonnet-4.6', reason: 'auto_chat' },
    mission_plan: { modelId: 'anthropic/claude-sonnet-4.6', reason: 'auto_mission_plan' },
    mission_execute: { modelId: 'anthropic/claude-sonnet-4.6', reason: 'auto_mission_execute' },
    mission_review: { modelId: 'anthropic/claude-sonnet-4.6', reason: 'auto_mission_review' },
    mission_awareness: { modelId: 'anthropic/claude-sonnet-4.6', reason: 'auto_mission_awareness' },
    mission_quality_eval: {
      modelId: 'anthropic/claude-sonnet-4.6',
      reason: 'auto_mission_quality_eval',
    },
  },
  'auto:power': {
    chat: { modelId: 'anthropic/claude-fable-5', reason: 'power_chat' },
    mission_plan: { modelId: 'anthropic/claude-fable-5', reason: 'power_mission_plan' },
    mission_execute: { modelId: 'anthropic/claude-fable-5', reason: 'power_mission_execute' },
    mission_review: { modelId: 'anthropic/claude-fable-5', reason: 'power_mission_review' },
    mission_awareness: { modelId: 'anthropic/claude-fable-5', reason: 'power_mission_awareness' },
    mission_quality_eval: {
      modelId: 'anthropic/claude-fable-5',
      reason: 'power_mission_quality_eval',
    },
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
