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
  it('routes Power tasks to Opus 4.8 with 1M context and high thinking', () => {
    for (const task of TASKS) {
      expect(resolveModelForStrategy('auto:power', task)).toEqual({
        modelId: 'anthropic/claude-opus-4.8',
        reason: expect.stringMatching(/^power_/),
        modelSettings: {
          context_window_tokens: 1_000_000,
          reasoning_effort: 'high',
          speed_mode: 'standard',
        },
      })
    }
  })

  it('does not use Fable 5 for Power fallback routing', () => {
    for (const task of TASKS) {
      expect(resolveFallbackForStrategy('auto:power', task).modelId).not.toBe(
        'anthropic/claude-fable-5',
      )
    }
  })
})
