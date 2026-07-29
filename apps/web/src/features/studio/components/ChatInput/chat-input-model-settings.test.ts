import { describe, expect, it, vi } from 'vitest'
import {
  applyComposerModelSettings,
  buildModelSettings,
  findContextOption,
  formatModelDefaultReasoning,
  formatModelRowMeta,
  formatReasoningLabel,
  isModelEditable,
  isModelStrategyId,
  MODEL_STRATEGIES,
  serializeComposerModelPrefs,
} from './chat-input-model-settings'

type ModelOption = Parameters<typeof isModelEditable>[0]

function modelOption(overrides: Partial<ModelOption> = {}): ModelOption {
  return {
    id: 'anthropic/claude',
    provider: 'anthropic',
    modelName: 'claude',
    label: 'Claude',
    contextWindow: 200_000,
    maxOutputTokens: null,
    supportsImages: true,
    inputModalities: ['text'],
    outputModalities: ['text'],
    supportedParameters: [],
    contextOptions: [{ tokens: 200_000, label: '200k' }],
    reasoningLevels: ['none'],
    speedModes: ['standard'],
    pricing: {},
    pricingTiers: [],
    ...overrides,
  }
}

describe('chat input model settings helpers', () => {
  it('identifies auto strategies and formats reasoning labels', () => {
    expect(isModelStrategyId('auto:economy')).toBe(true)
    expect(isModelStrategyId('anthropic/claude')).toBe(false)
    expect(formatReasoningLabel('xhigh')).toBe('Extra High')
  })

  it('keeps chat input strategy descriptions stable', () => {
    expect(MODEL_STRATEGIES.map((strategy) => [strategy.id, strategy.description])).toEqual([
      ['auto:economy', 'Best for lighter tasks and cost savings'],
      ['auto', 'Best for balanced quality and cost'],
      ['auto:power', 'Opus 5, 300K context, medium thinking'],
    ])
  })

  it('detects editable models and formats row metadata for selected settings', () => {
    const option = modelOption({
      contextWindow: 1_000_000,
      contextOptions: [
        { tokens: 200_000, label: '200k' },
        { tokens: 1_000_000, label: '1M' },
      ],
      reasoningLevels: ['none', 'low', 'high'],
      speedModes: ['standard', 'fast'],
    })

    expect(isModelEditable(modelOption())).toBe(false)
    expect(isModelEditable(option)).toBe(true)
    expect(formatModelDefaultReasoning(option)).toBe('high')
    expect(findContextOption(option, 1_000_000)?.label).toBe('1M')
    expect(
      formatModelRowMeta(option, {
        isSelected: true,
        contextWindowTokens: 1_000_000,
        reasoningEffort: 'high',
        fastMode: true,
      }),
    ).toBe('1M High Fast')
  })

  it('builds model settings only for valid concrete model options', () => {
    const option = modelOption({
      contextOptions: [
        { tokens: 200_000, label: '200k' },
        { tokens: 1_000_000, label: '1M' },
      ],
      reasoningLevels: ['none', 'medium'],
      speedModes: ['standard', 'fast'],
    })

    expect(
      buildModelSettings({
        model: 'auto',
        selectedOption: option,
        contextWindowTokens: 1_000_000,
        reasoningEffort: 'medium',
        fastMode: true,
        cortexMax: false,
      }),
    ).toEqual({ cortex_max: false })

    expect(
      buildModelSettings({
        model: option.id,
        selectedOption: option,
        contextWindowTokens: 1_000_000,
        reasoningEffort: 'medium',
        fastMode: true,
        cortexMax: true,
      }),
    ).toEqual({
      cortex_max: true,
      context_window_tokens: 1_000_000,
      reasoning_effort: 'medium',
      speed_mode: 'fast',
    })
  })

  it('serializes and applies composer preferences with existing defaults', () => {
    expect(
      serializeComposerModelPrefs('auto', {
        reasoning_effort: 'low',
        context_window_tokens: 200_000,
        speed_mode: 'fast',
        cortex_max: false,
      }),
    ).toBe(
      JSON.stringify({
        model: 'auto',
        reasoning_effort: 'low',
        context_window_tokens: 200_000,
        speed_mode: 'fast',
        cortex_max: false,
      }),
    )

    const setContextWindowTokens = vi.fn()
    const setReasoningEffort = vi.fn()
    const setFastModeEnabled = vi.fn()
    const setCortexMaxEnabled = vi.fn()

    applyComposerModelSettings(
      undefined,
      setContextWindowTokens,
      setReasoningEffort,
      setFastModeEnabled,
      setCortexMaxEnabled,
    )

    expect(setContextWindowTokens).toHaveBeenCalledWith(null)
    expect(setReasoningEffort).toHaveBeenCalledWith(null)
    expect(setFastModeEnabled).toHaveBeenCalledWith(false)
    expect(setCortexMaxEnabled).toHaveBeenCalledWith(true)
  })
})
