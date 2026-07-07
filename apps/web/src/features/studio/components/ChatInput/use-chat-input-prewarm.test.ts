import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrewarmChatContextParams } from '../../services/chat.service'
import { useChatInputPrewarm } from './use-chat-input-prewarm'

function createScheduler() {
  return {
    onFocus: vi.fn(),
    onInput: vi.fn(),
    cancel: vi.fn(),
  }
}

describe('useChatInputPrewarm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('builds the current chat scope payload for focus and input prewarm triggers', () => {
    const textareaRef = { current: document.createElement('textarea') }
    const scheduler = createScheduler()
    const modelSettings = { reasoning_effort: 'medium' as const }
    const { result, unmount } = renderHook(() =>
      useChatInputPrewarm({
        textareaRef,
        conversationId: 'conversation-1',
        campaignId: 'campaign-1',
        spaceId: null,
        scopeKind: 'space',
        activeComposerModel: 'anthropic/claude-opus-4.6',
        activeModelSettings: modelSettings,
        createScheduler: () => scheduler,
      }),
    )

    const expectedPayload: PrewarmChatContextParams = {
      conversation_id: 'conversation-1',
      campaign_id: 'campaign-1',
      space_id: null,
      scope_kind: 'space',
      model: 'anthropic/claude-opus-4.6',
      model_settings: modelSettings,
      source: 'studio',
    }

    act(() => result.current.triggerPrewarmNow())
    expect(scheduler.onFocus).toHaveBeenCalledWith(expectedPayload)

    act(() => result.current.triggerPrewarmDebounced())
    expect(scheduler.onInput).toHaveBeenCalledWith(expectedPayload)

    unmount()
    expect(scheduler.cancel).toHaveBeenCalled()
  })

  it('prewarms the latest payload when the focused textarea scope changes', () => {
    const textarea = document.createElement('textarea')
    document.body.append(textarea)
    textarea.focus()
    const textareaRef = { current: textarea }
    const scheduler = createScheduler()

    const { rerender } = renderHook(
      (props: { model: string; scopeKind: string | null }) =>
        useChatInputPrewarm({
          textareaRef,
          conversationId: 'conversation-1',
          campaignId: undefined,
          spaceId: 'space-1',
          scopeKind: props.scopeKind,
          activeComposerModel: props.model,
          activeModelSettings: null,
          createScheduler: () => scheduler,
        }),
      {
        initialProps: {
          model: 'auto',
          scopeKind: null as string | null,
        },
      },
    )

    expect(scheduler.onInput).toHaveBeenLastCalledWith({
      conversation_id: 'conversation-1',
      space_id: 'space-1',
      scope_kind: null,
      model: 'auto',
      source: 'studio',
    })

    rerender({ model: 'google/gemini-3.5-flash', scopeKind: 'team' })

    expect(scheduler.onInput).toHaveBeenLastCalledWith({
      conversation_id: 'conversation-1',
      space_id: 'space-1',
      scope_kind: 'team',
      model: 'google/gemini-3.5-flash',
      source: 'studio',
    })
  })
})
