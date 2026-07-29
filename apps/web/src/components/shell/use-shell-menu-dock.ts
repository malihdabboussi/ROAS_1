'use client'

import { create } from 'zustand'
import {
  shellMenuDockForPoint as hitTestForPoint,
  shellMenuDockHitAtPoint,
  type ShellMenuDock,
  type ShellMenuDockWorkRect,
} from './shell-menu-dock-hit-test'

export type { ShellMenuDock, ShellMenuDockWorkRect }

const STORAGE_KEY = 'vibey.shell.menu-dock.v2'
const LEGACY_STORAGE_KEY = 'vibey.shell.menu-dock.v1'
const COMPACT_STORAGE_KEY = 'vibey.shell.menu-compact.v1'

/** Product default: left of the work card (not frame-left of chat). */
const DEFAULT_DOCK: ShellMenuDock = 'work'

export type ShellMenuDockLift = {
  /** Fixed left of the lifted rail (px). */
  left: number
  /** Fixed top of the lifted rail (px). */
  top: number
  width: number
  height: number
  /** Pointer offset inside the rail at lift start. */
  grabX: number
  grabY: number
}

type ShellMenuDockStore = {
  dock: ShellMenuDock
  /** Option A: menu contents collapse into the R chip. */
  menuCompact: boolean
  dragging: boolean
  candidate: ShellMenuDock
  /** Floating geometry while the rail follows the pointer. */
  lift: ShellMenuDockLift | null
  /** Work card is open and can host work-* docks inside it. */
  workCardHostAvailable: boolean
  /** Work card collapsed — work-* docks render as a right vertical rail beside chat. */
  workCollapsedHostAvailable: boolean
  setDock: (dock: ShellMenuDock) => void
  setMenuCompact: (compact: boolean) => void
  toggleMenuCompact: () => void
  setWorkCardHostAvailable: (available: boolean) => void
  setWorkCollapsedHostAvailable: (available: boolean) => void
  startDragging: (lift: ShellMenuDockLift) => void
  setCandidate: (candidate: ShellMenuDock) => void
  moveLift: (clientX: number, clientY: number) => void
  clearLift: () => void
  ensureLift: (lift: ShellMenuDockLift) => void
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

/**
 * Soft-lock: while dragging, layout follows the live candidate so the menu
 * snaps into each seam (vertical left/right, horizontal top/bottom). Free
 * pointer-follow lift is only used in the dead zone between seams.
 */
export function activeShellMenuDock(state: {
  dock: ShellMenuDock
  candidate: ShellMenuDock
  dragging: boolean
}): ShellMenuDock {
  return state.dragging ? state.candidate : state.dock
}

export function useActiveShellMenuDock(): ShellMenuDock {
  return useShellMenuDock((state) => activeShellMenuDock(state))
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

const EMPTY_LIFT = null as ShellMenuDockLift | null

export const useShellMenuDock = create<ShellMenuDockStore>((set, get) => ({
  dock: DEFAULT_DOCK,
  menuCompact: false,
  dragging: false,
  candidate: DEFAULT_DOCK,
  lift: EMPTY_LIFT,
  workCardHostAvailable: false,
  workCollapsedHostAvailable: false,
  setDock: (dock) => {
    persistDock(dock)
    set({ dock, candidate: dock, dragging: false, lift: null })
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
  startDragging: (lift) =>
    set((state) => ({
      dragging: true,
      candidate: state.dock,
      lift,
    })),
  setCandidate: (candidate) => set({ candidate }),
  moveLift: (clientX, clientY) => {
    const { lift } = get()
    if (!lift) return
    set({
      lift: {
        ...lift,
        left: clientX - lift.grabX,
        top: clientY - lift.grabY,
      },
    })
  },
  clearLift: () => set({ lift: null }),
  ensureLift: (lift) => {
    if (get().lift) return
    set({ lift })
  },
  finishDragging: (dock) => get().setDock(dock ?? get().candidate),
  cancelDragging: () => set((state) => ({ dragging: false, candidate: state.dock, lift: null })),
}))

let hydrated = false

/** Resolve persisted dock: v2 wins; v1 `left` upgrades to default work; other v1 docks keep. */
function readPersistedDock(): ShellMenuDock | null {
  const current = normalizeDock(window.localStorage.getItem(STORAGE_KEY))
  if (current) return current

  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  const legacy = normalizeDock(legacyRaw)
  if (!legacy) return null
  if (legacy === 'left') return DEFAULT_DOCK
  return legacy
}

export function hydrateShellMenuDockFromStorage(): void {
  if (typeof window === 'undefined' || hydrated) return
  hydrated = true
  const dock = readPersistedDock() ?? DEFAULT_DOCK
  const compactRaw = window.localStorage.getItem(COMPACT_STORAGE_KEY)
  const menuCompact = compactRaw === '1'
  if (window.localStorage.getItem(STORAGE_KEY) !== dock) persistDock(dock)
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* optional */
  }
  useShellMenuDock.setState({ dock, candidate: dock, menuCompact, lift: null, dragging: false })
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

/** True when the AI chat drawer is open with real width (not the closed 0px column). */
export function isShellChatDrawerOpen(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.querySelector('[data-shell-chat-drawer]')
  if (!(el instanceof HTMLElement)) return false
  if (el.getAttribute('aria-hidden') === 'true' && el.getAttribute('data-expanded') !== 'true') {
    return false
  }
  return el.getBoundingClientRect().width > 8
}

/**
 * Frame `left` is only available when chat is open. With chat closed, a saved
 * `left` dock remaps onto the work-card left seam so the menu never sits in the
 * empty chat column.
 */
export function resolveShellMenuDockForLayout(
  dock: ShellMenuDock,
  opts: { chatOpen: boolean; workHostAvailable: boolean },
): ShellMenuDock {
  if (dock === 'left' && !opts.chatOpen && opts.workHostAvailable) return 'work'
  return dock
}

export function shellMenuDockForPoint(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  workRect: ShellMenuDockWorkRect | null = null,
  chatOpen = true,
  current: ShellMenuDock | null = null,
): ShellMenuDock {
  return hitTestForPoint(
    clientX,
    clientY,
    viewportWidth,
    viewportHeight,
    workRect,
    chatOpen,
    current,
  )
}

export function shellMenuDockForClientPoint(
  clientX: number,
  clientY: number,
  current: ShellMenuDock | null = null,
): ShellMenuDock {
  return shellMenuDockForPoint(
    clientX,
    clientY,
    typeof window === 'undefined' ? 0 : window.innerWidth,
    typeof window === 'undefined' ? 0 : window.innerHeight,
    getShellWorkAreaRect(),
    isShellChatDrawerOpen(),
    current,
  )
}

/** Raw seam under the pointer, or null in the dead zone (for soft-lock vs free-lift). */
export function shellMenuDockHitAtClientPoint(
  clientX: number,
  clientY: number,
): ShellMenuDock | null {
  return shellMenuDockHitAtPoint(
    clientX,
    clientY,
    typeof window === 'undefined' ? 0 : window.innerWidth,
    typeof window === 'undefined' ? 0 : window.innerHeight,
    getShellWorkAreaRect(),
    isShellChatDrawerOpen(),
  )
}
