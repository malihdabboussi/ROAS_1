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
      dragging: false,
      candidate: 'left',
      pointerX: 0,
      pointerY: 0,
      workHostAvailable: false,
    })
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
    pointerDownAt(logo, 20, 20)
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
    pointerDownAt(logo, 20, 20)
    vi.advanceTimersByTime(220)

    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(useShellMenuDock.getState().pointerX).toBe(20)
    expect(useShellMenuDock.getState().pointerY).toBe(20)
    expect(setPointerCapture).toHaveBeenCalledOnce()

    fireEvent(logo, new MouseEvent('pointermove', { bubbles: true, clientX: 1, clientY: 400 }))
    expect(useShellMenuDock.getState().candidate).toBe('left')

    fireEvent(logo, new MouseEvent('pointerup', { bubbles: true, clientX: 999, clientY: 400 }))

    expect(onToggle).not.toHaveBeenCalled()
    expect(useShellMenuDock.getState().dock).toBe('right')
    expect(useShellMenuDock.getState().candidate).toBe('right')
    expect(releasePointerCapture).toHaveBeenCalledOnce()
  })

  it('blocks native image drag on the logo mark', () => {
    render(<SidebarHqHubLogoButton hubOpen={false} onToggle={vi.fn()} />)
    const logo = screen.getByRole('button', { name: 'Open menu' })
    const images = logo.querySelectorAll('img')
    expect(images.length).toBeGreaterThan(0)
    images.forEach((image) => {
      expect(image.getAttribute('draggable')).toBe('false')
    })
    const dragEvent = fireEvent.dragStart(logo)
    expect(dragEvent).toBe(false)
  })
})
