import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useShellChatQuickStart } from './use-shell-chat-quick-start'

describe('useShellChatQuickStart', () => {
  it('keeps the composer change callback stable across rerenders', () => {
    const setTextRef = createRef<((text: string) => void) | null>()
    const { result, rerender } = renderHook(() => useShellChatQuickStart(setTextRef))
    const initialCallback = result.current.handleComposerValueChange

    rerender()

    expect(result.current.handleComposerValueChange).toBe(initialCallback)
  })
})
