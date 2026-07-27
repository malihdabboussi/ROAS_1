import { beforeEach, describe, expect, it } from 'vitest'
import {
  hydrateShellMenuDockFromStorage,
  resetShellMenuDockHydrationForTests,
  shellMenuDockForPoint,
  useShellMenuDock,
} from './use-shell-menu-dock'

const STORAGE_KEY = 'vibey.shell.menu-dock.v1'

describe('shell menu dock', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    resetShellMenuDockHydrationForTests()
    useShellMenuDock.setState({ dock: 'left', dragging: false, candidate: 'left' })
  })

  it('persists a valid dock placement', () => {
    useShellMenuDock.getState().setDock('bottom')

    expect(useShellMenuDock.getState().dock).toBe('bottom')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('bottom')
  })

  it('hydrates a persisted dock placement once', () => {
    window.localStorage.setItem(STORAGE_KEY, 'right')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('right')

    window.localStorage.setItem(STORAGE_KEY, 'top')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('right')
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

  it('selects the nearest viewport edge for a pointer position', () => {
    expect(shellMenuDockForPoint(500, 2, 1000, 800)).toBe('top')
    expect(shellMenuDockForPoint(998, 400, 1000, 800)).toBe('right')
  })
})
