import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { usePastedTextBlocks } from './use-pasted-text-blocks'

describe('usePastedTextBlocks', () => {
  beforeEach(() => {
    useChatStore.setState({ composerPastedBlocksByContext: {} })
  })

  it('hydrates a changed composer context without an effect update loop', () => {
    useChatStore.getState().setComposerPastedBlocks('conversation-2', [
      { id: 'block-2', text: 'Second conversation paste' },
    ])

    const { result, rerender } = renderHook(
      ({ contextKey }) =>
        usePastedTextBlocks({ persistence: { mode: 'zustand', contextKey } }),
      { initialProps: { contextKey: 'conversation-1' } },
    )

    expect(result.current.blocks).toEqual([])

    rerender({ contextKey: 'conversation-2' })

    expect(result.current.blocks).toEqual([
      { id: 'block-2', text: 'Second conversation paste' },
    ])
  })

  it('does not publish an unchanged block collection back to the store', () => {
    const blocks = [{ id: 'block-1', text: 'Existing paste' }]
    useChatStore.getState().setComposerPastedBlocks('conversation-1', blocks)
    const before = useChatStore.getState().composerPastedBlocksByContext

    act(() => {
      useChatStore.getState().setComposerPastedBlocks('conversation-1', [...blocks])
    })

    expect(useChatStore.getState().composerPastedBlocksByContext).toBe(before)
  })
})
