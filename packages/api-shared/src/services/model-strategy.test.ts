import { describe, expect, it } from 'vitest'
import {
  resolveFallbackForStrategy,
  resolveModelForStrategy,
  type TaskType,
} from './model-strategy'

const TASKS: TaskType[] = [
  'chat',
  'mission_plan',
  'mission_execute',
  'mission_review',
  'mission_awareness',
  'mission_quality_eval',
]

describe('model strategy routing', () => {
  it('routes Auto tasks to Opus 5 with bounded context and medium thinking', () => {
    for (const task of TASKS) {
      expect(resolveModelForStrategy('auto', task)).toEqual({
        modelId: 'anthropic/claude-opus-5',
        reason: expect.stringMatching(/^auto_/),
        modelSettings: {
          context_window_tokens: 300_000,
          reasoning_effort: 'medium',
          speed_mode: 'standard',
        },
      })
    }
  })

  it('routes Economy tasks to GPT-5.6 Terra with low thinking', () => {
    for (const task of TASKS) {
      expect(resolveModelForStrategy('auto:economy', task)).toEqual({
        modelId: 'openai/gpt-5.6-terra',
        reason: expect.stringMatching(/^economy_/),
        modelSettings: {
          context_window_tokens: 272_000,
          reasoning_effort: 'low',
          speed_mode: 'standard',
        },
      })
    }
  })

  it('routes explicit Power tasks to Fable 5 with medium thinking', () => {
    for (const task of TASKS) {
      expect(resolveModelForStrategy('auto:power', task)).toEqual({
        modelId: 'anthropic/claude-fable-5',
        reason: expect.stringMatching(/^power_/),
        modelSettings: {
          context_window_tokens: 300_000,
          reasoning_effort: 'medium',
          speed_mode: 'standard',
        },
      })
    }
  })

  it('uses Sonnet 4.6 as the stable fallback for every strategy', () => {
    for (const strategy of ['auto:economy', 'auto', 'auto:power'] as const) {
      for (const task of TASKS) {
        expect(resolveFallbackForStrategy(strategy, task).modelId).toBe(
          'anthropic/claude-sonnet-4.6',
        )
      }
    }
  })
})
