import { beforeEach, describe, expect, it } from 'vitest'
import {
  hydrateShellMenuDockFromStorage,
  resetShellMenuDockHydrationForTests,
  shellMenuDockForPoint,
  useShellMenuDock,
  type ShellMenuDockWorkRect,
} from './use-shell-menu-dock'

const STORAGE_KEY = 'vibey.shell.menu-dock.v1'
const COMPACT_KEY = 'vibey.shell.menu-compact.v1'

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
    window.localStorage.removeItem(COMPACT_KEY)
    resetShellMenuDockHydrationForTests()
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

  it('persists work docks and migrates legacy right/top/bottom', () => {
    useShellMenuDock.getState().setDock('work-right')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('work-right')

    resetShellMenuDockHydrationForTests()
    window.localStorage.setItem(STORAGE_KEY, 'bottom')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('work-bottom')
  })

  it('toggles compact menu into the R chip', () => {
    useShellMenuDock.getState().toggleMenuCompact()
    expect(useShellMenuDock.getState().menuCompact).toBe(true)
    expect(window.localStorage.getItem(COMPACT_KEY)).toBe('1')
  })

  it('prefers work-card edges over the frame when the pointer is on them', () => {
    expect(shellMenuDockForPoint(410, 300, 1200, 800, workRect)).toBe('work')
    expect(shellMenuDockForPoint(1180, 300, 1200, 800, workRect)).toBe('work-right')
    expect(shellMenuDockForPoint(800, 60, 1200, 800, workRect)).toBe('work-top')
    expect(shellMenuDockForPoint(800, 780, 1200, 800, workRect)).toBe('work-bottom')
    expect(shellMenuDockForPoint(20, 400, 1200, 800, workRect)).toBe('left')
  })
})
