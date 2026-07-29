import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShellMenuDockDragController } from './ShellMenuDockDragController'
import { useShellMenuDock } from './use-shell-menu-dock'

describe('ShellMenuDockDragController', () => {
  beforeEach(() => {
    useShellMenuDock.setState({
      dock: 'work',
      menuCompact: false,
      dragging: false,
      candidate: 'work',
      lift: null,
      workCardHostAvailable: true,
      workCollapsedHostAvailable: false,
    })
  })

  afterEach(() => {
    cleanup()
    useShellMenuDock.getState().cancelDragging()
  })

  it('keeps document listeners across candidate soft-locks', () => {
    const { rerender } = render(<ShellMenuDockDragController />)
    useShellMenuDock.getState().startDragging({
      left: 10,
      top: 20,
      width: 72,
      height: 400,
      grabX: 12,
      grabY: 18,
    })
    rerender(<ShellMenuDockDragController />)

    useShellMenuDock.getState().setCandidate('work-right')
    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(useShellMenuDock.getState().candidate).toBe('work-right')

    // Controller stays mounted — soft-lock must not cancel back to saved dock.
    rerender(<ShellMenuDockDragController />)
    expect(useShellMenuDock.getState().dragging).toBe(true)
    expect(useShellMenuDock.getState().candidate).toBe('work-right')
  })

  it('commits the candidate on pointerup', async () => {
    const { rerender } = render(<ShellMenuDockDragController />)
    useShellMenuDock.getState().startDragging({
      left: 10,
      top: 20,
      width: 72,
      height: 400,
      grabX: 12,
      grabY: 18,
    })
    useShellMenuDock.getState().setCandidate('work-top')
    useShellMenuDock.getState().clearLift()
    rerender(<ShellMenuDockDragController />)

    // Dead-zone release keeps sticky candidate (no work rect in jsdom).
    const up = new Event('pointerup', { bubbles: true })
    Object.defineProperty(up, 'clientX', { value: 500 })
    Object.defineProperty(up, 'clientY', { value: 400 })
    document.dispatchEvent(up)
    expect(useShellMenuDock.getState().dragging).toBe(false)
    expect(useShellMenuDock.getState().dock).toBe('work-top')
  })
})
