import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  GLOBAL_CHAT_SEED_EVENT,
  useGlobalChatStore,
} from '@/components/global-chat/store/use-global-chat-store'
import type { MessageReference } from '../../types'
import { useRestoredRefs } from './use-restored-message-references'

const first: MessageReference = {
  kind: 'conversation',
  id: 'conversation-1',
  type: 'message:assistant-1',
  label: 'Reply to assistant: First answer',
}

afterEach(() => {
  useGlobalChatStore.setState({ pendingSeed: null, workContext: { surface: 'general' } })
})

describe('useRestoredMessageReferences', () => {
  it('restores an exact-message reference when the composer restore nonce changes', () => {
    type HookProps = { references?: MessageReference[]; nonce?: string }
    const initialProps: HookProps = { references: undefined, nonce: undefined }
    const { result, rerender } = renderHook(
      ({ references, nonce }: HookProps) => useRestoredRefs(references, nonce, 'conversation-1'),
      { initialProps },
    )

    rerender({ references: [first], nonce: 'restore-1' })

    expect(result.current[0]).toEqual([first])
    act(() => result.current[1]([]))
    expect(result.current[0]).toEqual([])
  })

  it('restores a Reply seed for this composer conversation', () => {
    const { result } = renderHook(() => useRestoredRefs(undefined, undefined, 'conversation-1'))

    act(() => {
      useGlobalChatStore.getState().seedComposer({
        content: '',
        conversationId: 'conversation-1',
        seedMode: 'attach',
        references: [first],
      })
    })

    expect(result.current[0]).toEqual([first])
  })

  it('ignores a Reply seed for another composer conversation', () => {
    const { result } = renderHook(() => useRestoredRefs(undefined, undefined, 'conversation-2'))

    act(() => {
      window.dispatchEvent(
        new CustomEvent(GLOBAL_CHAT_SEED_EVENT, {
          detail: {
            content: '',
            conversationId: 'conversation-1',
            seedMode: 'attach',
            references: [first],
          },
        }),
      )
    })

    expect(result.current[0]).toEqual([])
  })
})
