'use client'

import type { ReactNode } from 'react'
import { create } from 'zustand'

const STORAGE_KEY = 'vibey.shell.v1'

export type ShellMenuMode = 'home' | 'chat'
export type ShellRightPanelTab = 'tasks' | 'files' | 'sources'

export type ShellChatDrawerState = {
  open: boolean
  conversationId: string | null
  width: number
  minimized: boolean
}

export type ShellRightPanelState = {
  open: boolean
  tab: ShellRightPanelTab
}

type PersistedShell = {
  sidebarPinned?: boolean
  menuMode?: ShellMenuMode
  chatDrawerWidth?: number
  rightPanelOpen?: boolean
  rightPanelTab?: ShellRightPanelTab
  spaceWorkOpen?: boolean
}

function readPersisted(): PersistedShell {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as PersistedShell
  } catch {
    return {}
  }
}

function writePersisted(partial: PersistedShell) {
  if (typeof window === 'undefined') return
  try {
    const next = { ...readPersisted(), ...partial }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

interface ShellStore {
  sidebarPinned: boolean
  sidebarPeek: boolean
  menuMode: ShellMenuMode
  chatDrawer: ShellChatDrawerState
  spaceWorkOpen: boolean
  rightPanel: ShellRightPanelState
  newChatNonce: number
  /** Bumped to close HQ dock flyouts (Home/Chat, New, pin). */
  sidebarFlyoutCloseEpoch: number
  pageBreadcrumb: ReactNode | null
  pageBreadcrumbOwner: object | null

  setSidebarPinned: (pinned: boolean) => void
  toggleSidebarPinned: () => void
  setSidebarPeek: (peek: boolean) => void
  holdSidebarPeek: () => void
  scheduleSidebarPeekClose: (delayMs?: number) => void
  clearSidebarPeekClose: () => void
  setMenuMode: (mode: ShellMenuMode) => void
  openChatDrawer: (conversationId?: string | null) => void
  minimizeChatDrawer: () => void
  restoreChatDrawer: () => void
  closeChatDrawer: () => void
  setChatDrawerWidth: (width: number) => void
  setSpaceWorkOpen: (open: boolean) => void
  toggleSpaceWorkOpen: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: ShellRightPanelTab) => void
  requestNewChat: () => void
  /** Fresh chat in the docked left drawer (workspace routes); stays on current page. */
  openFreshChatDrawer: () => void
  bumpSidebarFlyoutClose: () => void
  setPageBreadcrumb: (node: ReactNode | null, owner?: object | null) => void
}

const PEEK_CLOSE_DEFAULT_MS = 450
let peekCloseTimer: ReturnType<typeof setTimeout> | null = null

const persisted = typeof window !== 'undefined' ? readPersisted() : {}

export const useShellStore = create<ShellStore>((set, get) => ({
  sidebarPinned: persisted.sidebarPinned ?? false,
  sidebarPeek: false,
  menuMode: persisted.menuMode ?? 'home',
  chatDrawer: {
    open: false,
    conversationId: null,
    width: persisted.chatDrawerWidth ?? 280,
    minimized: false,
  },
  spaceWorkOpen: persisted.spaceWorkOpen ?? true,
  rightPanel: {
    open: persisted.rightPanelOpen ?? false,
    tab: persisted.rightPanelTab ?? 'tasks',
  },
  newChatNonce: 0,
  sidebarFlyoutCloseEpoch: 0,
  pageBreadcrumb: null,
  pageBreadcrumbOwner: null,

  bumpSidebarFlyoutClose: () => {
    set((s) => ({ sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1 }))
  },
  setSidebarPinned: (pinned) => {
    if (peekCloseTimer) {
      clearTimeout(peekCloseTimer)
      peekCloseTimer = null
    }
    writePersisted({ sidebarPinned: pinned })
    set((s) => ({
      sidebarPinned: pinned,
      sidebarPeek: false,
      sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1,
    }))
  },
  toggleSidebarPinned: () => {
    const next = !get().sidebarPinned
    get().setSidebarPinned(next)
  },
  setSidebarPeek: (peek) => {
    if (get().sidebarPinned) {
      set({ sidebarPeek: false })
      return
    }
    set({ sidebarPeek: peek })
  },
  clearSidebarPeekClose: () => {
    if (peekCloseTimer) {
      clearTimeout(peekCloseTimer)
      peekCloseTimer = null
    }
  },
  holdSidebarPeek: () => {
    if (get().sidebarPinned) return
    get().clearSidebarPeekClose()
    set({ sidebarPeek: true })
  },
  scheduleSidebarPeekClose: (delayMs = PEEK_CLOSE_DEFAULT_MS) => {
    if (get().sidebarPinned) return
    get().clearSidebarPeekClose()
    peekCloseTimer = setTimeout(() => {
      peekCloseTimer = null
      set({ sidebarPeek: false })
    }, delayMs)
  },
  setMenuMode: (mode) => {
    writePersisted({ menuMode: mode })
    set((s) => ({
      menuMode: mode,
      sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1,
    }))
  },
  openChatDrawer: (conversationId) => {
    set((s) => ({
      chatDrawer: {
        ...s.chatDrawer,
        open: true,
        minimized: false,
        conversationId:
          conversationId === undefined ? s.chatDrawer.conversationId : conversationId,
      },
      rightPanel: { ...s.rightPanel, open: false },
    }))
    writePersisted({ rightPanelOpen: false })
  },
  minimizeChatDrawer: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: false, minimized: true },
      spaceWorkOpen: true,
    }))
    writePersisted({ spaceWorkOpen: true })
  },
  restoreChatDrawer: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: true, minimized: false },
      rightPanel: { ...s.rightPanel, open: false },
    }))
    writePersisted({ rightPanelOpen: false })
  },
  closeChatDrawer: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: false, conversationId: null, minimized: false },
    }))
  },
  setChatDrawerWidth: (width) => {
    const clamped = Math.min(560, Math.max(240, width))
    writePersisted({ chatDrawerWidth: clamped })
    set((s) => ({ chatDrawer: { ...s.chatDrawer, width: clamped } }))
  },
  setSpaceWorkOpen: (open) => {
    writePersisted({ spaceWorkOpen: open })
    if (!open) {
      set((s) => ({
        spaceWorkOpen: false,
        chatDrawer: { ...s.chatDrawer, open: true, minimized: false },
      }))
      return
    }
    set({ spaceWorkOpen: open })
  },
  toggleSpaceWorkOpen: () => {
    get().setSpaceWorkOpen(!get().spaceWorkOpen)
  },
  setRightPanelOpen: (open) => {
    writePersisted({ rightPanelOpen: open })
    set((s) => ({ rightPanel: { ...s.rightPanel, open } }))
  },
  toggleRightPanel: () => {
    get().setRightPanelOpen(!get().rightPanel.open)
  },
  setRightPanelTab: (tab) => {
    writePersisted({ rightPanelTab: tab })
    set((s) => ({ rightPanel: { ...s.rightPanel, tab } }))
  },
  requestNewChat: () => {
    set((s) => ({
      newChatNonce: s.newChatNonce + 1,
      menuMode: 'chat',
      sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1,
      chatDrawer: {
        ...s.chatDrawer,
        open: false,
        conversationId: null,
        minimized: false,
      },
      spaceWorkOpen: true,
    }))
    writePersisted({ menuMode: 'chat', spaceWorkOpen: true })
  },
  openFreshChatDrawer: () => {
    set((s) => ({
      newChatNonce: s.newChatNonce + 1,
      menuMode: 'chat',
      sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1,
      chatDrawer: {
        ...s.chatDrawer,
        open: true,
        conversationId: null,
        minimized: false,
      },
      rightPanel: { ...s.rightPanel, open: false },
    }))
    writePersisted({ menuMode: 'chat', rightPanelOpen: false })
  },
  setPageBreadcrumb: (node, owner = null) => {
    if (node === null) {
      const currentOwner = get().pageBreadcrumbOwner
      if (owner != null && currentOwner != null && currentOwner !== owner) return
      set({ pageBreadcrumb: null, pageBreadcrumbOwner: null })
      return
    }
    set({ pageBreadcrumb: node, pageBreadcrumbOwner: owner })
  },
}))

export function shellSidebarExpanded(state: {
  sidebarPinned: boolean
  sidebarPeek: boolean
}): boolean {
  return state.sidebarPinned || state.sidebarPeek
}
