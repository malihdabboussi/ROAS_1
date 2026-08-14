import { createRef } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SHELL_CREATE_QUICK_STARTS } from './shell-create-menu.config'
import { useShellChatQuickStart } from './use-shell-chat-quick-start'

describe('useShellChatQuickStart', () => {
  it('keeps the composer change callback stable across rerenders', () => {
    const setTextRef = createRef<((text: string) => void) | null>()
    const { result, rerender } = renderHook(() => useShellChatQuickStart(setTextRef))
    const initialCallback = result.current.handleComposerValueChange

    rerender()

    expect(result.current.handleComposerValueChange).toBe(initialCallback)
  })

  it('seeds composer quick starts and exposes their capability context', () => {
    const setTextRef = createRef<((text: string) => void) | null>()
    setTextRef.current = vi.fn()
    const { result } = renderHook(() => useShellChatQuickStart(setTextRef))
    const document = SHELL_CREATE_QUICK_STARTS.find((item) => item.id === 'create-document')!

    act(() => result.current.selectQuickStart(document))

    expect(setTextRef.current).toHaveBeenCalledWith(document.prompt)
    expect(result.current.activeCapabilityChip).toEqual({ label: 'Document', icon: 'file-text' })
  })
})
