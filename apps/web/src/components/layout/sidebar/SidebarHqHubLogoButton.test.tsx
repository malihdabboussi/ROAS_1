import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'

describe('SidebarHqHubLogoButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useShellMenuDock.setState({ dock: 'left', dragging: false, candidate: 'left' })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('keeps a short press as the existing logo action', () => {
    const onToggle = vi.fn()
    render(<SidebarHqHubLogoButton hubOpen={false} onToggle={onToggle} />)

    const logo = screen.getByRole('button', { name: 'Open menu' })
    Object.assign(logo, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    })
    fireEvent.pointerDown(logo, { pointerId: 1, clientX: 20, clientY: 20 })
    fireEvent.pointerUp(logo, { pointerId: 1, clientX: 20, clientY: 20 })

    expect(onToggle).toHaveBeenCalledOnce()
    expect(useShellMenuDock.getState().dragging).toBe(false)
  })

  it('turns a hold into a dock drag instead of navigation', () => {
    const onToggle = vi.fn()
    render(<SidebarHqHubLogoButton hubOpen={false} onToggle={onToggle} />)

    const logo = screen.getByRole('button', { name: 'Open menu' })
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.assign(logo, { setPointerCapture, releasePointerCapture })
    fireEvent.pointerDown(logo, { pointerId: 1, clientX: 20, clientY: 20 })
    vi.advanceTimersByTime(220)

    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(setPointerCapture).toHaveBeenCalledOnce()

    fireEvent(logo, new MouseEvent('pointermove', { bubbles: true, clientX: 1, clientY: 400 }))
    expect(useShellMenuDock.getState().candidate).toBe('left')

    fireEvent(logo, new MouseEvent('pointerup', { bubbles: true, clientX: 999, clientY: 400 }))

    expect(onToggle).not.toHaveBeenCalled()
    expect(useShellMenuDock.getState().dock).toBe('right')
    expect(useShellMenuDock.getState().candidate).toBe('right')
    expect(releasePointerCapture).toHaveBeenCalledOnce()
  })
})
