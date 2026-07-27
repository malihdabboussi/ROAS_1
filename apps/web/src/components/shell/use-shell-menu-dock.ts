'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'vibey.shell.menu-dock.v1'

export type ShellMenuDock = 'left' | 'right' | 'top' | 'bottom'

type ShellMenuDockStore = {
  dock: ShellMenuDock
  dragging: boolean
  candidate: ShellMenuDock
  setDock: (dock: ShellMenuDock) => void
  startDragging: () => void
  setCandidate: (candidate: ShellMenuDock) => void
  finishDragging: (dock?: ShellMenuDock) => void
  cancelDragging: () => void
}

const VALID_DOCKS = new Set<ShellMenuDock>(['left', 'right', 'top', 'bottom'])

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
  setDock: (dock) => {
    persistDock(dock)
    set({ dock, candidate: dock, dragging: false })
  },
  startDragging: () => set((state) => ({ dragging: true, candidate: state.dock })),
  setCandidate: (candidate) => set({ candidate }),
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

export function shellMenuDockForPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): ShellMenuDock {
  const distances: Array<[ShellMenuDock, number]> = [
    ['left', clientX],
    ['right', viewportWidth - clientX],
    ['top', clientY],
    ['bottom', viewportHeight - clientY],
  ]
  distances.sort((a, b) => a[1] - b[1])
  return distances[0]?.[0] ?? 'left'
}
