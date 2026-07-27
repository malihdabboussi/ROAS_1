'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'vibey.shell.menu-dock.v1'
const COMPACT_STORAGE_KEY = 'vibey.shell.menu-compact.v1'
const WORK_BAND_PX = 120
const WORK_BAND_SLACK_PX = 48

/** Five dock homes — never over AI Chat. */
export type ShellMenuDock = 'left' | 'work' | 'work-top' | 'work-bottom' | 'work-right'

export type ShellMenuDockWorkRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

type ShellMenuDockStore = {
  dock: ShellMenuDock
  /** Option A: menu contents collapse into the R chip. */
  menuCompact: boolean
  dragging: boolean
  candidate: ShellMenuDock
  pointerX: number
  pointerY: number
  /** Work card is open and can host work-* docks inside it. */
  workCardHostAvailable: boolean
  /** Work card collapsed — work-* docks render as a right vertical rail beside chat. */
  workCollapsedHostAvailable: boolean
  setDock: (dock: ShellMenuDock) => void
  setMenuCompact: (compact: boolean) => void
  toggleMenuCompact: () => void
  setWorkCardHostAvailable: (available: boolean) => void
  setWorkCollapsedHostAvailable: (available: boolean) => void
  startDragging: (pointerX?: number, pointerY?: number) => void
  setCandidate: (candidate: ShellMenuDock, pointerX?: number, pointerY?: number) => void
  finishDragging: (dock?: ShellMenuDock) => void
  cancelDragging: () => void
}

const VALID_DOCKS = new Set<ShellMenuDock>([
  'left',
  'work',
  'work-top',
  'work-bottom',
  'work-right',
])

const LEGACY_DOCK_MAP: Record<string, ShellMenuDock> = {
  right: 'work-right',
  top: 'work-top',
  bottom: 'work-bottom',
}

export function isWorkAttachedDock(dock: ShellMenuDock): boolean {
  return dock === 'work' || dock === 'work-top' || dock === 'work-bottom' || dock === 'work-right'
}

export function isHorizontalWorkDock(dock: ShellMenuDock): boolean {
  return dock === 'work-top' || dock === 'work-bottom'
}

function normalizeDock(value: string | null): ShellMenuDock | null {
  if (value === null) return null
  if (VALID_DOCKS.has(value as ShellMenuDock)) return value as ShellMenuDock
  return LEGACY_DOCK_MAP[value] ?? null
}

function persistDock(dock: ShellMenuDock): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, dock)
  } catch {
    /* optional */
  }
}

function persistCompact(compact: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COMPACT_STORAGE_KEY, compact ? '1' : '0')
  } catch {
    /* optional */
  }
}

export const useShellMenuDock = create<ShellMenuDockStore>((set, get) => ({
  dock: 'left',
  menuCompact: false,
  dragging: false,
  candidate: 'left',
  pointerX: 0,
  pointerY: 0,
  workCardHostAvailable: false,
  workCollapsedHostAvailable: false,
  setDock: (dock) => {
    persistDock(dock)
    set({ dock, candidate: dock, dragging: false })
  },
  setMenuCompact: (menuCompact) => {
    persistCompact(menuCompact)
    set({ menuCompact })
  },
  toggleMenuCompact: () => {
    const next = !get().menuCompact
    persistCompact(next)
    set({ menuCompact: next })
  },
  setWorkCardHostAvailable: (workCardHostAvailable) => set({ workCardHostAvailable }),
  setWorkCollapsedHostAvailable: (workCollapsedHostAvailable) =>
    set({ workCollapsedHostAvailable }),
  startDragging: (pointerX, pointerY) =>
    set((state) => ({
      dragging: true,
      candidate: state.dock,
      pointerX: pointerX ?? state.pointerX,
      pointerY: pointerY ?? state.pointerY,
    })),
  setCandidate: (candidate, pointerX, pointerY) =>
    set((state) => ({
      candidate,
      pointerX: pointerX ?? state.pointerX,
      pointerY: pointerY ?? state.pointerY,
    })),
  finishDragging: (dock) => get().setDock(dock ?? get().candidate),
  cancelDragging: () => set((state) => ({ dragging: false, candidate: state.dock })),
}))

let hydrated = false

export function hydrateShellMenuDockFromStorage(): void {
  if (typeof window === 'undefined' || hydrated) return
  hydrated = true
  const dock = normalizeDock(window.localStorage.getItem(STORAGE_KEY))
  const compactRaw = window.localStorage.getItem(COMPACT_STORAGE_KEY)
  const menuCompact = compactRaw === '1'
  if (dock) {
    if (window.localStorage.getItem(STORAGE_KEY) !== dock) persistDock(dock)
    useShellMenuDock.setState({ dock, candidate: dock, menuCompact })
    return
  }
  useShellMenuDock.setState({ menuCompact })
}

export function resetShellMenuDockHydrationForTests(): void {
  hydrated = false
}

/** Live work-card rect when the column is visible enough to host seam targets. */
export function getShellWorkAreaRect(): ShellMenuDockWorkRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector('[data-shell-work-area]')
  if (!(el instanceof HTMLElement)) return null
  if (el.classList.contains('shell-work-area-collapsed')) return null
  if (el.getAttribute('aria-hidden') === 'true') return null
  if (el.classList.contains('hidden')) return null
  const rect = el.getBoundingClientRect()
  if (rect.width < 8 || rect.height < 8) return null
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

function bandFor(size: number): number {
  return Math.min(WORK_BAND_PX, Math.max(48, size * 0.28))
}

function edgeDistance(
  clientX: number,
  clientY: number,
  workRect: ShellMenuDockWorkRect,
  edge: 'work' | 'work-top' | 'work-bottom' | 'work-right',
): number | null {
  const xBand = bandFor(workRect.width)
  const yBand = bandFor(workRect.height)

  if (edge === 'work') {
    if (clientY < workRect.top || clientY > workRect.bottom) return null
    if (clientX < workRect.left - WORK_BAND_SLACK_PX || clientX > workRect.left + xBand) return null
    return Math.abs(clientX - workRect.left)
  }
  if (edge === 'work-right') {
    if (clientY < workRect.top || clientY > workRect.bottom) return null
    if (clientX > workRect.right + WORK_BAND_SLACK_PX || clientX < workRect.right - xBand)
      return null
    return Math.abs(clientX - workRect.right)
  }
  if (edge === 'work-top') {
    if (clientX < workRect.left || clientX > workRect.right) return null
    if (clientY < workRect.top - WORK_BAND_SLACK_PX || clientY > workRect.top + yBand) return null
    return Math.abs(clientY - workRect.top)
  }
  // work-bottom
  if (clientX < workRect.left || clientX > workRect.right) return null
  if (clientY > workRect.bottom + WORK_BAND_SLACK_PX || clientY < workRect.bottom - yBand)
    return null
  return Math.abs(clientY - workRect.bottom)
}

export function shellMenuDockForPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  workRect: ShellMenuDockWorkRect | null = null,
): ShellMenuDock {
  const distances: Array<[ShellMenuDock, number]> = [['left', clientX]]

  // Frame far-right only when there is no work card (otherwise use work-right).
  if (!workRect) {
    distances.push(['work-right', viewportWidth - clientX])
    distances.push(['work-top', clientY])
    distances.push(['work-bottom', viewportHeight - clientY])
  } else {
    for (const edge of ['work', 'work-top', 'work-bottom', 'work-right'] as const) {
      const dist = edgeDistance(clientX, clientY, workRect, edge)
      if (dist !== null) distances.push([edge, dist])
    }
  }

  distances.sort((a, b) => a[1] - b[1])
  return distances[0]?.[0] ?? 'left'
}

export function shellMenuDockForClientPoint(clientX: number, clientY: number): ShellMenuDock {
  return shellMenuDockForPoint(
    clientX,
    clientY,
    typeof window === 'undefined' ? 0 : window.innerWidth,
    typeof window === 'undefined' ? 0 : window.innerHeight,
    getShellWorkAreaRect(),
  )
}
