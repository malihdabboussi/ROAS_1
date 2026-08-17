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
      lift: null,
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

  it('reveals the drawer glyph on hover without swapping the logo box', () => {
    useShellMenuDock.setState({ menuCompact: true })
    render(<SidebarHqHubLogoButton expanded={false} />)

    const logo = screen.getByRole('button', { name: 'Expand menu' })
    expect(logo.querySelector('.hub-sidebar-logo-mark')).toBeTruthy()
    expect(logo.querySelector('.hub-sidebar-logo-glyph')).toHaveClass('icon-md')
    expect(logo.querySelectorAll('img')[0]).toHaveClass('hub-sidebar-logo-face')
    expect(logo.querySelector('svg')).not.toHaveClass('hidden')
  })

  it('uses the wordmark in the expanded Simple header', () => {
    render(<SidebarHqHubLogoButton expanded wordmark />)

    const logo = screen.getByRole('button', { name: 'Collapse menu' })
    expect(logo.querySelector('.hub-sidebar-logo-mark-wordmark')).toBeTruthy()
    expect(screen.getAllByAltText('ROAS').length).toBeGreaterThan(0)
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
  })

  it('does not cancel an in-flight drag when the logo remounts (soft-lock)', async () => {
    const { unmount } = render(
      <div className="hub-sidebar-shell">
        <SidebarHqHubLogoButton expanded />
      </div>,
    )

    const logo = screen.getByRole('button', { name: 'Collapse menu' })
    pointerDownAt(logo, 20, 20)
    await act(async () => {
      vi.advanceTimersByTime(220)
    })
    useShellMenuDock.getState().setCandidate('work-top')
    expect(useShellMenuDock.getState().dragging).toBe(true)

    unmount()

    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(useShellMenuDock.getState().candidate).toBe('work-top')
  })
})
