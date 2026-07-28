import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
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
      workCardHostAvailable: false,
      workCollapsedHostAvailable: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('collapses the menu into the R chip on a short press', () => {
    render(
      <div className="hub-sidebar-shell">
        <SidebarHqHubLogoButton expanded />
      </div>,
    )

    const logo = screen.getByRole('button', { name: 'Collapse menu' })
    pointerDownAt(logo, 20, 20)
    fireEvent.pointerUp(logo, { pointerId: 1, clientX: 20, clientY: 20 })

    expect(useShellMenuDock.getState().menuCompact).toBe(true)
    expect(useShellMenuDock.getState().dragging).toBe(false)
  })

  it('turns a hold into a dock drag instead of collapse', async () => {
    render(
      <div className="hub-sidebar-shell">
        <SidebarHqHubLogoButton expanded />
      </div>,
    )

    const logo = screen.getByRole('button', { name: 'Collapse menu' })
    pointerDownAt(logo, 20, 20)
    await act(async () => {
      vi.advanceTimersByTime(220)
    })

    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(useShellMenuDock.getState().menuCompact).toBe(false)

    await act(async () => {
      fireEvent.pointerUp(document, { clientX: 20, clientY: 20 })
    })
    expect(useShellMenuDock.getState().dragging).toBe(false)
  })
})
