import { beforeEach, describe, expect, it } from 'vitest'
import {
  activeShellMenuDock,
  hydrateShellMenuDockFromStorage,
  resetShellMenuDockHydrationForTests,
  resolveShellMenuDockForLayout,
  shellMenuDockForPoint,
  useShellMenuDock,
  type ShellMenuDockWorkRect,
} from './use-shell-menu-dock'

const STORAGE_KEY = 'vibey.shell.menu-dock.v2'
const LEGACY_STORAGE_KEY = 'vibey.shell.menu-dock.v1'
const COMPACT_KEY = 'vibey.shell.menu-compact.v1'
const STYLE_KEY = 'vibey.shell.menu-style.v1'
const SIMPLE_WIDTH_KEY = 'vibey.shell.simple-menu-width.v1'

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
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    window.localStorage.removeItem(COMPACT_KEY)
    window.localStorage.removeItem(STYLE_KEY)
    window.localStorage.removeItem(SIMPLE_WIDTH_KEY)
    resetShellMenuDockHydrationForTests()
    useShellMenuDock.setState({
      dock: 'work',
      menuCompact: false,
      menuStyle: 'simple',
      simpleMenuWidth: 272,
      dragging: false,
      candidate: 'work',
      lift: null,
      workCardHostAvailable: false,
      workCollapsedHostAvailable: false,
    })
  })

  it('defaults to work (left of the work card) and persists work docks', () => {
    expect(useShellMenuDock.getState().dock).toBe('work')
    useShellMenuDock.getState().setDock('work-right')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('work-right')

    resetShellMenuDockHydrationForTests()
    window.localStorage.setItem(STORAGE_KEY, 'bottom')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('work-bottom')
  })

  it('migrates legacy v1 left to the new work default; keeps other custom docks', () => {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, 'left')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('work')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('work')
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()

    resetShellMenuDockHydrationForTests()
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.setItem(LEGACY_STORAGE_KEY, 'work-top')
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('work-top')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('work-top')
  })

  it('hydrates unset storage to work', () => {
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().dock).toBe('work')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('work')
  })

  it('toggles compact menu into the R chip', () => {
    useShellMenuDock.getState().toggleMenuCompact()
    expect(useShellMenuDock.getState().menuCompact).toBe(true)
    expect(window.localStorage.getItem(COMPACT_KEY)).toBe('1')
  })

  it('defaults to Simple and persists an Advanced menu choice', () => {
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().menuStyle).toBe('simple')

    useShellMenuDock.getState().setMenuStyle('advanced')
    expect(window.localStorage.getItem(STYLE_KEY)).toBe('advanced')

    resetShellMenuDockHydrationForTests()
    useShellMenuDock.setState({ menuStyle: 'simple' })
    hydrateShellMenuDockFromStorage()
    expect(useShellMenuDock.getState().menuStyle).toBe('advanced')
  })

  it('persists and bounds the drag-resizable Simple menu width', () => {
    useShellMenuDock.getState().setSimpleMenuWidth(360)
    expect(useShellMenuDock.getState().simpleMenuWidth).toBe(360)
    expect(window.localStorage.getItem(SIMPLE_WIDTH_KEY)).toBe('360')

    useShellMenuDock.getState().setSimpleMenuWidth(100)
    expect(useShellMenuDock.getState().simpleMenuWidth).toBe(240)
  })

  it('prefers work-card edges over the frame when the pointer is on them', () => {
    expect(shellMenuDockForPoint(410, 300, 1200, 800, workRect, true, 'work')).toBe('work')
    expect(shellMenuDockForPoint(1180, 300, 1200, 800, workRect, true, 'work')).toBe('work-right')
    expect(shellMenuDockForPoint(800, 60, 1200, 800, workRect, true, 'work')).toBe('work-top')
    expect(shellMenuDockForPoint(800, 780, 1200, 800, workRect, true, 'work')).toBe('work-bottom')
    expect(shellMenuDockForPoint(20, 400, 1200, 800, workRect, true, 'work')).toBe('left')
  })

  it('only senses top/bottom in the centered third of the work card', () => {
    // Near the left corner of the top edge → left seam, not top.
    expect(shellMenuDockForPoint(420, 60, 1200, 800, workRect, true, 'work')).toBe('work')
    expect(shellMenuDockForPoint(800, 60, 1200, 800, workRect, true, 'work')).toBe('work-top')
  })

  it('keeps the sticky candidate in the work-card dead zone instead of snapping to left', () => {
    expect(shellMenuDockForPoint(800, 400, 1200, 800, workRect, true, 'work-top')).toBe('work-top')
    expect(shellMenuDockForPoint(800, 400, 1200, 800, workRect, true, 'work')).toBe('work')
  })

  it('maps far-left to the work card when chat is closed', () => {
    expect(shellMenuDockForPoint(20, 400, 1200, 800, workRect, false, 'work')).toBe('work')
    expect(shellMenuDockForPoint(410, 300, 1200, 800, workRect, false, 'work')).toBe('work')
  })

  it('remaps a saved left dock onto work when chat is closed', () => {
    expect(
      resolveShellMenuDockForLayout('left', { chatOpen: false, workHostAvailable: true }),
    ).toBe('work')
    expect(resolveShellMenuDockForLayout('left', { chatOpen: true, workHostAvailable: true })).toBe(
      'left',
    )
    expect(
      resolveShellMenuDockForLayout('left', { chatOpen: false, workHostAvailable: false }),
    ).toBe('left')
  })

  it('soft-locks layout onto the live candidate while dragging', () => {
    useShellMenuDock.getState().startDragging({
      left: 10,
      top: 20,
      width: 72,
      height: 400,
      grabX: 12,
      grabY: 18,
    })
    useShellMenuDock.getState().setCandidate('work-top')
    expect(activeShellMenuDock(useShellMenuDock.getState())).toBe('work-top')
    expect(useShellMenuDock.getState().candidate).toBe('work-top')

    useShellMenuDock.getState().clearLift()
    expect(useShellMenuDock.getState().lift).toBeNull()

    useShellMenuDock.getState().ensureLift({
      left: 10,
      top: 20,
      width: 72,
      height: 400,
      grabX: 12,
      grabY: 18,
    })
    useShellMenuDock.getState().moveLift(100, 200)
    expect(useShellMenuDock.getState().lift).toMatchObject({ left: 88, top: 182 })
  })
})
