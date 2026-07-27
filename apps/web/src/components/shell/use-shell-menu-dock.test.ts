import { beforeEach, describe, expect, it } from 'vitest'
import {
  hydrateShellMenuDockFromStorage,
  resetShellMenuDockHydrationForTests,
  shellMenuDockForPoint,
  useShellMenuDock,
  type ShellMenuDockWorkRect,
} from './use-shell-menu-dock'

const STORAGE_KEY = 'vibey.shell.menu-dock.v1'

const workRect: ShellMenuDockWorkRect = {
  left: 400,
  top: 52,
  right: 1200,
  bottom: 800,
  width: 800,
  height: 748,
}

describe('shell menu dock', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    resetShellMenuDockHydrationForTests()
    useShellMenuDock.setState({
      dock: 'left',
      dragging: false,
      candidate: 'left',
      pointerX: 0,
      pointerY: 0,
      workHostAvailable: false,
    })
  })

  it('persists a valid dock placement including work', () => {
    useShellMenuDock.getState().setDock('work')

    expect(useShellMenuDock.getState().dock).toBe('work')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('work')
  })

  it('hydrates a persisted dock placement once', () => {
    window.localStorage.setItem(STORAGE_KEY, 'right')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('right')

    window.localStorage.setItem(STORAGE_KEY, 'top')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('right')
  })

  it('hydrates a persisted work dock', () => {
    window.localStorage.setItem(STORAGE_KEY, 'work')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('work')
  })

  it('commits the active candidate when dragging ends', () => {
    useShellMenuDock.getState().startDragging()
    useShellMenuDock.getState().setCandidate('top')
    useShellMenuDock.getState().finishDragging()

    expect(useShellMenuDock.getState()).toMatchObject({
      dock: 'top',
      candidate: 'top',
      dragging: false,
    })
  })

  it('commits an explicit release edge without waiting for candidate state', () => {
    useShellMenuDock.getState().startDragging()
    useShellMenuDock.getState().setCandidate('left')
    useShellMenuDock.getState().finishDragging('right')

    expect(useShellMenuDock.getState()).toMatchObject({
      dock: 'right',
      candidate: 'right',
      dragging: false,
    })
  })

  it('tracks pointer while choosing a dock edge', () => {
    useShellMenuDock.getState().startDragging(40, 60)
    useShellMenuDock.getState().setCandidate('right', 900, 420)

    expect(useShellMenuDock.getState()).toMatchObject({
      candidate: 'right',
      pointerX: 900,
      pointerY: 420,
      dragging: true,
    })
  })

  it('selects the nearest viewport edge for a pointer position', () => {
    expect(shellMenuDockForPoint(500, 2, 1000, 800)).toBe('top')
    expect(shellMenuDockForPoint(998, 400, 1000, 800)).toBe('right')
  })

  it('prefers the work-card seam when the pointer is on the work left edge', () => {
    expect(shellMenuDockForPoint(410, 300, 1200, 800, workRect)).toBe('work')
    expect(shellMenuDockForPoint(20, 300, 1200, 800, workRect)).toBe('left')
  })

  it('ignores the work seam when no work rect is provided', () => {
    expect(shellMenuDockForPoint(20, 400, 1200, 800, null)).toBe('left')
  })
})
