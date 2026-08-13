import { createRef } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useQuickMissionsLauncherStore } from '@/lib/missions'
import { SHELL_CREATE_QUICK_STARTS } from './shell-create-menu.config'
import { useShellChatQuickStart } from './use-shell-chat-quick-start'

describe('useShellChatQuickStart', () => {
  afterEach(() => {
    useQuickMissionsLauncherStore.setState({ open: false, playbookKey: null })
  })

  it('keeps the composer change callback stable across rerenders', () => {
    const setTextRef = createRef<((text: string) => void) | null>()
    const { result, rerender } = renderHook(() => useShellChatQuickStart(setTextRef))
    const initialCallback = result.current.handleComposerValueChange

    rerender()

    expect(result.current.handleComposerValueChange).toBe(initialCallback)
  })

  it('opens Missions without seeding the composer', () => {
    const setTextRef = createRef<((text: string) => void) | null>()
    setTextRef.current = vi.fn()
    const { result } = renderHook(() => useShellChatQuickStart(setTextRef))
    const mission = SHELL_CREATE_QUICK_STARTS.find((item) => item.action === 'mission')!

    act(() => result.current.selectQuickStart(mission))

    expect(useQuickMissionsLauncherStore.getState()).toMatchObject({
      open: true,
      playbookKey: null,
    })
    expect(setTextRef.current).not.toHaveBeenCalled()
  })
})
