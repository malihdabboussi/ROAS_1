import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatModelSettings, LlmModelOption } from '../../services/chat.service'
import {
  resetChatInputModelPrefsForTests,
  useChatInputModelPrefs,
} from './use-chat-input-model-prefs'

function modelOption(overrides: Partial<LlmModelOption> = {}): LlmModelOption {
  return {
    id: 'anthropic/claude-opus-4.6',
    provider: 'anthropic',
    modelName: 'claude-opus-4.6',
    label: 'Claude Opus 4.6',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsImages: true,
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    supportedParameters: [],
    contextOptions: [
      { tokens: 64000, label: '64K' },
      { tokens: 200000, label: '200K' },
    ],
    reasoningLevels: ['none', 'medium', 'high'],
    speedModes: ['standard', 'fast'],
    pricing: {},
    pricingTiers: [],
    ...overrides,
  }
}

describe('useChatInputModelPrefs', () => {
  beforeEach(() => {
    vi.useRealTimers()
    resetChatInputModelPrefsForTests()
  })

  it('hydrates the active model and settings from conversation defaults', () => {
    const defaultSettings: ChatModelSettings = {
      context_window_tokens: 200000,
      reasoning_effort: 'high',
      speed_mode: 'fast',
      cortex_max: false,
    }
    const { result } = renderHook(() =>
      useChatInputModelPrefs({
        conversationId: 'conversation-1',
        defaultModel: 'anthropic/claude-opus-4.6',
        defaultModelSettings: defaultSettings,
        campaignModelStrategy: 'auto:power',
        modelOptions: [modelOption()],
      }),
    )

    expect(result.current.activeComposerModel).toBe('anthropic/claude-opus-4.6')
    expect(result.current.selectedContextWindowTokens).toBe(200000)
    expect(result.current.selectedReasoningEffort).toBe('high')
    expect(result.current.fastModeEnabled).toBe(true)
    expect(result.current.cortexMaxEnabled).toBe(false)
    expect(result.current.activeComposerModelLabel).toBe('Claude Opus 4.6')
    expect(result.current.activeComposerDisplayMeta).toBe('200K High Fast')
    expect(result.current.activeModelSettings).toEqual({
      context_window_tokens: 200000,
      reasoning_effort: 'high',
      speed_mode: 'fast',
      cortex_max: false,
    })
  })

  it('keeps active model settings stable across unrelated rerenders', () => {
    const option = modelOption()
    const defaultSettings: ChatModelSettings = {
      context_window_tokens: 200000,
      reasoning_effort: 'medium',
      speed_mode: 'standard',
      cortex_max: true,
    }
    const { result, rerender } = renderHook(() =>
      useChatInputModelPrefs({
        conversationId: 'conversation-1',
        defaultModel: 'anthropic/claude-opus-4.6',
        defaultModelSettings: defaultSettings,
        campaignModelStrategy: null,
        modelOptions: [option],
      }),
    )

    const firstSettings = result.current.activeModelSettings

    rerender()

    expect(result.current.activeModelSettings).toBe(firstSettings)
  })

  it('persists user-selected model preferences after the debounce window', () => {
    vi.useFakeTimers()
    const persistConversationPrefs = vi.fn(async () => undefined)
    const option = modelOption()
    const { result } = renderHook(() =>
      useChatInputModelPrefs({
        conversationId: 'conversation-1',
        defaultModel: null,
        defaultModelSettings: null,
        campaignModelStrategy: null,
        modelOptions: [option],
        persistConversationPrefs,
        persistDelayMs: 600,
      }),
    )

    act(() => {
      result.current.selectComposerModel(option.id)
      result.current.setSelectedContextWindowTokens(200000)
      result.current.setSelectedReasoningEffort('medium')
      result.current.setFastModeEnabled(true)
      result.current.setCortexMaxEnabled(false)
    })

    act(() => {
      vi.advanceTimersByTime(599)
    })
    expect(persistConversationPrefs).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(persistConversationPrefs).toHaveBeenCalledWith('conversation-1', option.id, {
      context_window_tokens: 200000,
      reasoning_effort: 'medium',
      speed_mode: 'fast',
      cortex_max: false,
    })
  })
})
