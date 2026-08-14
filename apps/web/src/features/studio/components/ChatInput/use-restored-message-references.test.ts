import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GLOBAL_CHAT_SEED_EVENT } from '@/components/global-chat/store/use-global-chat-store'
import { useChatStore } from '../../store/use-chat-store'
import type { MessageReference } from '../../types'
import { useRestoredRefs } from './use-restored-message-references'

const first: MessageReference = {
  kind: 'conversation',
  id: 'conversation-1',
  type: 'message:assistant-1',
  label: 'Reply to assistant: First answer',
}

describe('useRestoredMessageReferences', () => {
  it('restores an exact-message reference when the composer restore nonce changes', () => {
    type HookProps = { references?: MessageReference[]; nonce?: string }
    const initialProps: HookProps = { references: undefined, nonce: undefined }
    const { result, rerender } = renderHook(
      ({ references, nonce }: HookProps) => useRestoredRefs(references, nonce),
      { initialProps },
    )

    rerender({ references: [first], nonce: 'restore-1' })

    expect(result.current[0]).toEqual([first])
    act(() => result.current[1]([]))
    expect(result.current[0]).toEqual([])
  })

  it('restores a Reply seed dispatched for the active Studio conversation', () => {
    useChatStore.setState({ activeConversationId: 'conversation-1' })
    const { result } = renderHook(() => useRestoredRefs(undefined, undefined))

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

    expect(result.current[0]).toEqual([first])
  })

  it('ignores a Reply seed dispatched for a different Studio conversation', () => {
    useChatStore.setState({ activeConversationId: 'conversation-2' })
    const { result } = renderHook(() => useRestoredRefs(undefined, undefined))

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
