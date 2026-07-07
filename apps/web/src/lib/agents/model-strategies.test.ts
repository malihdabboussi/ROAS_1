import { describe, expect, it } from 'vitest'
import {
  MODEL_STRATEGIES,
  agentModelId,
  isModelStrategyId,
  resolveAgentModelDisplay,
} from './model-strategies'

describe('model strategies', () => {
  it('keeps the shared strategy order, labels, descriptions, and classes stable', () => {
    expect(MODEL_STRATEGIES).toEqual([
      {
        id: 'auto:economy',
        label: 'Economy',
        description: 'Best for interns and routine tasks',
        chipClass: 'chip-glass-green',
        textClass: 'text-chip-strategy-green',
      },
      {
        id: 'auto',
        label: 'Auto',
        description: 'Best for most team members',
        chipClass: 'chip-glass-blue',
        textClass: 'text-chip-strategy-blue',
      },
      {
        id: 'auto:power',
        label: 'Power',
        description: 'Opus 4.8, 1M context, high thinking',
        chipClass: 'chip-glass-purple',
        textClass: 'text-chip-strategy-purple',
      },
    ])
  })

  it('identifies only supported auto strategy ids', () => {
    expect(isModelStrategyId('auto:economy')).toBe(true)
    expect(isModelStrategyId('auto')).toBe(true)
    expect(isModelStrategyId('auto:power')).toBe(true)
    expect(isModelStrategyId('anthropic/claude')).toBe(false)
    expect(isModelStrategyId(null)).toBe(false)
  })

  it('resolves agent model ids from config with auto fallback', () => {
    expect(agentModelId({ config: { model_id: 'auto:power' } })).toBe('auto:power')
    expect(agentModelId({ config: { model_id: '' } })).toBe('auto')
    expect(agentModelId({ config: null })).toBe('auto')
  })

  it('resolves strategy and concrete model display metadata', () => {
    expect(resolveAgentModelDisplay('auto:power')).toEqual({
      id: 'auto:power',
      label: 'Power',
      chipClass: 'chip-glass-purple',
    })
    expect(resolveAgentModelDisplay('claude-sonnet-4', [{ id: 'claude-sonnet-4', label: 'sonnet' }])).toEqual({
      id: 'claude-sonnet-4',
      label: 'Sonnet',
      chipClass: 'chip-glass-neutral',
    })
  })
})
