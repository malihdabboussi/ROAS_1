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

  it('opens a type picker instead of seeding the composer for Funnel', () => {
    const setTextRef = createRef<((text: string) => void) | null>()
    setTextRef.current = vi.fn()
    const { result } = renderHook(() => useShellChatQuickStart(setTextRef))
    const funnel = SHELL_CREATE_QUICK_STARTS.find((item) => item.id === 'create-funnel')!

    act(() => result.current.selectQuickStart(funnel))

    expect(setTextRef.current).not.toHaveBeenCalled()
    expect(result.current.pendingPicker?.title).toBe('What kind of funnel would you like?')

    act(() => result.current.selectPickerOption(result.current.pendingPicker!.options[0]!))

    expect(setTextRef.current).toHaveBeenCalledWith('Create a lead magnet funnel for ')
    expect(result.current.pendingPicker).toBeNull()
    expect(result.current.activeCapabilityChip).toEqual({ label: 'Funnel', icon: 'filter' })
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
