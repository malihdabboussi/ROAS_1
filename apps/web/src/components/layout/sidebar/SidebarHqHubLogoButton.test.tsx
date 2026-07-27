import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'

function pointerDownAt(target: Element, clientX: number, clientY: number) {
  const event = createEvent.pointerDown(target, { pointerId: 1, button: 0 })
  Object.defineProperty(event, 'clientX', { configurable: true, value: clientX })
  Object.defineProperty(event, 'clientY', { configurable: true, value: clientY })
  fireEvent(target, event)
}

describe('SidebarHqHubLogoButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useShellMenuDock.setState({
      dock: 'left',
      menuCompact: false,
      dragging: false,
      candidate: 'left',
      pointerX: 0,
      pointerY: 0,
      workCardHostAvailable: false,
      workCollapsedHostAvailable: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('collapses the menu into the R chip on a short press', () => {
    render(<SidebarHqHubLogoButton expanded />)

    const logo = screen.getByRole('button', { name: 'Collapse menu' })
    Object.assign(logo, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    })
    pointerDownAt(logo, 20, 20)
    fireEvent.pointerUp(logo, { pointerId: 1, clientX: 20, clientY: 20 })

    expect(useShellMenuDock.getState().menuCompact).toBe(true)
    expect(useShellMenuDock.getState().dragging).toBe(false)
  })

  it('turns a hold into a dock drag instead of collapse', () => {
    render(<SidebarHqHubLogoButton expanded />)

    const logo = screen.getByRole('button', { name: 'Collapse menu' })
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.assign(logo, { setPointerCapture, releasePointerCapture })
    pointerDownAt(logo, 20, 20)
    vi.advanceTimersByTime(220)

    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(setPointerCapture).toHaveBeenCalledOnce()

    fireEvent(logo, new MouseEvent('pointerup', { bubbles: true, clientX: 20, clientY: 20 }))
    expect(useShellMenuDock.getState().menuCompact).toBe(false)
    expect(releasePointerCapture).toHaveBeenCalledOnce()
  })
})
