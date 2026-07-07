import { describe, expect, it } from 'vitest'
import { readChatModelSettingsFromValue, readConversationModelSettings } from './chat-model-settings'

describe('readConversationModelSettings', () => {
  it('returns null when metadata has no usable model settings', () => {
    expect(readConversationModelSettings(undefined)).toBeNull()
    expect(readConversationModelSettings({ model_settings: null })).toBeNull()
    expect(readConversationModelSettings({ model_settings: [] })).toBeNull()
    expect(readConversationModelSettings({ model_settings: { ignored: true } })).toBeNull()
  })

  it('normalizes supported model setting fields', () => {
    expect(
      readConversationModelSettings({
        model_settings: {
          context_window_tokens: 200000,
          reasoning_effort: 'high',
          speed_mode: 'fast',
          cortex_max: true,
          ignored: 'value',
        },
      }),
    ).toEqual({
      context_window_tokens: 200000,
      reasoning_effort: 'high',
      speed_mode: 'fast',
      cortex_max: true,
    })
  })

  it('normalizes raw model settings without conversation-only cortex fields', () => {
    expect(
      readChatModelSettingsFromValue({
        context_window_tokens: 200000,
        reasoning_effort: 'high',
        speed_mode: 'fast',
        cortex_max: true,
      }),
    ).toEqual({
      context_window_tokens: 200000,
      reasoning_effort: 'high',
      speed_mode: 'fast',
    })
  })

  it('ignores invalid primitive field values', () => {
    expect(
      readConversationModelSettings({
        model_settings: {
          context_window_tokens: '200000',
          reasoning_effort: 1,
          speed_mode: 'turbo',
          cortex_max: 'true',
        },
      }),
    ).toBeNull()
  })
})
