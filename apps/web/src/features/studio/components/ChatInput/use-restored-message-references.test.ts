import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
