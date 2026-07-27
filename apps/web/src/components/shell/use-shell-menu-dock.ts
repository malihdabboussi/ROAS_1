'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'vibey.shell.menu-dock.v1'
const WORK_SEAM_BAND_PX = 120
const WORK_SEAM_SLACK_PX = 48

export type ShellMenuDock = 'left' | 'right' | 'top' | 'bottom' | 'work'

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
  dragging: boolean
  candidate: ShellMenuDock
  pointerX: number
  pointerY: number
  /** ShellWorkspace reports whether the work card can host the HQ rail. */
  workHostAvailable: boolean
  setDock: (dock: ShellMenuDock) => void
  setWorkHostAvailable: (available: boolean) => void
  startDragging: (pointerX?: number, pointerY?: number) => void
  setCandidate: (candidate: ShellMenuDock, pointerX?: number, pointerY?: number) => void
  finishDragging: (dock?: ShellMenuDock) => void
  cancelDragging: () => void
}

const VALID_DOCKS = new Set<ShellMenuDock>(['left', 'right', 'top', 'bottom', 'work'])

function isShellMenuDock(value: string | null): value is ShellMenuDock {
  return value !== null && VALID_DOCKS.has(value as ShellMenuDock)
}

function persistDock(dock: ShellMenuDock): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, dock)
  } catch {
    /* local preferences are optional */
  }
}

export const useShellMenuDock = create<ShellMenuDockStore>((set, get) => ({
  dock: 'left',
  dragging: false,
  candidate: 'left',
  pointerX: 0,
  pointerY: 0,
  workHostAvailable: false,
  setDock: (dock) => {
    persistDock(dock)
    set({ dock, candidate: dock, dragging: false })
  },
  setWorkHostAvailable: (workHostAvailable) => set({ workHostAvailable }),
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
  const persisted = window.localStorage.getItem(STORAGE_KEY)
  if (!isShellMenuDock(persisted)) return
  useShellMenuDock.setState({ dock: persisted, candidate: persisted })
}

export function resetShellMenuDockHydrationForTests(): void {
  hydrated = false
}

/** Live work-card rect when the column is visible enough to host a seam target. */
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

function workSeamDistance(
  clientX: number,
  clientY: number,
  workRect: ShellMenuDockWorkRect,
): number | null {
  if (clientY < workRect.top || clientY > workRect.bottom) return null
  const band = Math.min(WORK_SEAM_BAND_PX, Math.max(48, workRect.width * 0.35))
  if (clientX < workRect.left - WORK_SEAM_SLACK_PX || clientX > workRect.left + band) {
    return null
  }
  return Math.abs(clientX - workRect.left)
}

export function shellMenuDockForPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  workRect: ShellMenuDockWorkRect | null = null,
): ShellMenuDock {
  const distances: Array<[ShellMenuDock, number]> = [
    ['left', clientX],
    ['right', viewportWidth - clientX],
    ['top', clientY],
    ['bottom', viewportHeight - clientY],
  ]

  if (workRect) {
    const seam = workSeamDistance(clientX, clientY, workRect)
    if (seam !== null) {
      distances.push(['work', seam])
    }
  }

  distances.sort((a, b) => a[1] - b[1])
  return distances[0]?.[0] ?? 'left'
}

/** Resolve dock from pointer using the live work-card seam when available. */
export function shellMenuDockForClientPoint(clientX: number, clientY: number): ShellMenuDock {
  return shellMenuDockForPoint(
    clientX,
    clientY,
    typeof window === 'undefined' ? 0 : window.innerWidth,
    typeof window === 'undefined' ? 0 : window.innerHeight,
    getShellWorkAreaRect(),
  )
}
