'use client'

import type { ReactNode } from 'react'
import { create } from 'zustand'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'

const STORAGE_KEY = 'vibey.shell.v1'

export type ShellMenuMode = 'home' | 'work'
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

export type ShellArtifactViewerState = {
  target: ShellArtifactViewerTarget | null
  width: number
}

export type ShellWorkAreaPageTarget = {
  id: string
  title: string
  href: string
}

type PersistedShell = {
  sidebarPinned?: boolean
  menuMode?: ShellMenuMode
  chatDrawerOpen?: boolean
  chatDrawerConversationId?: string | null
  chatDrawerMinimized?: boolean
  chatDrawerWidth?: number
  chatHistoryWidth?: number
  chatHistoryCollapsed?: boolean
  rightPanelOpen?: boolean
  rightPanelTab?: ShellRightPanelTab
  workAreaOpen?: boolean
  artifactViewerWidth?: number
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

const CHAT_DRAWER_WIDTH_MIN = 360
const CHAT_DRAWER_WIDTH_FALLBACK_MAX = 1920
const CHAT_HISTORY_WIDTH_MIN = 180
const CHAT_HISTORY_WIDTH_MAX = 420
const ARTIFACT_VIEWER_WIDTH_MIN = 360
const ARTIFACT_VIEWER_WIDTH_MAX = 720

function clampChatDrawerWidth(width: number): number {
  const viewportMax =
    typeof window === 'undefined'
      ? CHAT_DRAWER_WIDTH_FALLBACK_MAX
      : Math.max(CHAT_DRAWER_WIDTH_MIN, window.innerWidth)
  return Math.min(viewportMax, Math.max(CHAT_DRAWER_WIDTH_MIN, width))
}

function clampChatHistoryWidth(width: number): number {
  return Math.min(CHAT_HISTORY_WIDTH_MAX, Math.max(CHAT_HISTORY_WIDTH_MIN, width))
}

function clampArtifactViewerWidth(width: number): number {
  return Math.min(ARTIFACT_VIEWER_WIDTH_MAX, Math.max(ARTIFACT_VIEWER_WIDTH_MIN, width))
}

interface ShellStore {
  sidebarPinned: boolean
  sidebarPeek: boolean
  menuMode: ShellMenuMode
  chatDrawer: ShellChatDrawerState
  chatHistoryWidth: number
  chatHistoryCollapsed: boolean
  /** Page work area (Space dock, Brain, Inbox, …) visible; false = chat full width. */
  workAreaOpen: boolean
  rightPanel: ShellRightPanelState
  conversationScopePickerRequestNonce: number
  artifactViewer: ShellArtifactViewerState
  recentArtifactTargets: ShellArtifactViewerTarget[]
  recentWorkAreaPages: ShellWorkAreaPageTarget[]
  newChatNonce: number
  /** Bumped to close HQ dock flyouts (Home/Work, pin). */
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
  setChatHistoryWidth: (width: number) => void
  setChatHistoryCollapsed: (collapsed: boolean) => void
  setWorkAreaOpen: (open: boolean) => void
  toggleWorkAreaOpen: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: ShellRightPanelTab) => void
  openRightPanelSurface: (tab: ShellRightPanelTab) => void
  requestConversationScopePicker: () => void
  openArtifactViewer: (target: ShellArtifactViewerTarget) => void
  closeArtifactViewer: () => void
  setArtifactViewerWidth: (width: number) => void
  recordWorkAreaPage: (target: ShellWorkAreaPageTarget) => void
  requestNewChat: () => void
  /** Fresh chat in the docked left drawer (workspace routes); stays on current page. */
  openFreshChatDrawer: () => void
  bumpSidebarFlyoutClose: () => void
  setPageBreadcrumb: (node: ReactNode | null, owner?: object | null) => void
}

const PEEK_CLOSE_DEFAULT_MS = 450
let peekCloseTimer: ReturnType<typeof setTimeout> | null = null

/** SSR-safe defaults — never read localStorage during store init (hydration mismatch). */
export const useShellStore = create<ShellStore>((set, get) => ({
  sidebarPinned: false,
  sidebarPeek: false,
  menuMode: 'home',
  chatDrawer: {
    open: false,
    conversationId: null,
    width: 420,
    minimized: false,
  },
  chatHistoryWidth: 200,
  chatHistoryCollapsed: false,
  workAreaOpen: true,
  rightPanel: {
    open: false,
    tab: 'tasks',
  },
  conversationScopePickerRequestNonce: 0,
  artifactViewer: {
    target: null,
    width: 480,
  },
  recentArtifactTargets: [],
  recentWorkAreaPages: [],
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
    const nextConversationId =
      conversationId === undefined ? get().chatDrawer.conversationId : conversationId
    set((s) => ({
      chatDrawer: {
        ...s.chatDrawer,
        open: true,
        minimized: false,
        conversationId: nextConversationId,
      },
      rightPanel: { ...s.rightPanel, open: false },
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: nextConversationId,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
    })
  },
  minimizeChatDrawer: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: false, minimized: true },
      workAreaOpen: true,
    }))
    writePersisted({
      chatDrawerOpen: false,
      chatDrawerConversationId: get().chatDrawer.conversationId,
      chatDrawerMinimized: true,
      workAreaOpen: true,
    })
  },
  restoreChatDrawer: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: true, minimized: false },
      rightPanel: { ...s.rightPanel, open: false },
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: get().chatDrawer.conversationId,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
    })
  },
  closeChatDrawer: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: false, conversationId: null, minimized: false },
    }))
    writePersisted({
      chatDrawerOpen: false,
      chatDrawerConversationId: null,
      chatDrawerMinimized: false,
    })
  },
  setChatDrawerWidth: (width) => {
    const clamped = clampChatDrawerWidth(width)
    writePersisted({ chatDrawerWidth: clamped })
    set((s) => ({ chatDrawer: { ...s.chatDrawer, width: clamped } }))
  },
  setChatHistoryWidth: (width) => {
    const clamped = clampChatHistoryWidth(width)
    writePersisted({ chatHistoryWidth: clamped })
    set({ chatHistoryWidth: clamped })
  },
  setChatHistoryCollapsed: (collapsed) => {
    writePersisted({ chatHistoryCollapsed: collapsed })
    set({ chatHistoryCollapsed: collapsed })
  },
  setWorkAreaOpen: (open) => {
    writePersisted({ workAreaOpen: open })
    if (!open) {
      set((s) => ({
        workAreaOpen: false,
        chatDrawer: { ...s.chatDrawer, open: true, minimized: false },
      }))
      writePersisted({
        chatDrawerOpen: true,
        chatDrawerConversationId: get().chatDrawer.conversationId,
        chatDrawerMinimized: false,
      })
      return
    }
    set({ workAreaOpen: open })
  },
  toggleWorkAreaOpen: () => {
    get().setWorkAreaOpen(!get().workAreaOpen)
  },
  setRightPanelOpen: (open) => {
    writePersisted({ rightPanelOpen: open })
    set((s) => ({
      rightPanel: { ...s.rightPanel, open },
      artifactViewer: open ? { ...s.artifactViewer, target: null } : s.artifactViewer,
    }))
  },
  toggleRightPanel: () => {
    get().setRightPanelOpen(!get().rightPanel.open)
  },
  setRightPanelTab: (tab) => {
    writePersisted({ rightPanelTab: tab })
    set((s) => ({ rightPanel: { ...s.rightPanel, tab } }))
  },
  openRightPanelSurface: (tab) => {
    writePersisted({ rightPanelOpen: true, rightPanelTab: tab })
    set((s) => ({
      rightPanel: { open: true, tab },
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
  },
  requestConversationScopePicker: () => {
    writePersisted({ rightPanelOpen: true })
    set((s) => ({
      conversationScopePickerRequestNonce: s.conversationScopePickerRequestNonce + 1,
      rightPanel: { ...s.rightPanel, open: true },
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
  },
  openArtifactViewer: (target) => {
    writePersisted({ rightPanelOpen: false })
    set((s) => ({
      artifactViewer: { ...s.artifactViewer, target },
      recentArtifactTargets: [
        target,
        ...s.recentArtifactTargets.filter((entry) => entry.id !== target.id),
      ].slice(0, 6),
      rightPanel: { ...s.rightPanel, open: false },
      workAreaOpen: true,
    }))
    writePersisted({ workAreaOpen: true })
  },
  closeArtifactViewer: () => {
    set((s) => ({ artifactViewer: { ...s.artifactViewer, target: null } }))
  },
  setArtifactViewerWidth: (width) => {
    const clamped = clampArtifactViewerWidth(width)
    writePersisted({ artifactViewerWidth: clamped })
    set((s) => ({ artifactViewer: { ...s.artifactViewer, width: clamped } }))
  },
  recordWorkAreaPage: (target) => {
    set((s) => ({
      recentWorkAreaPages: [
        target,
        ...s.recentWorkAreaPages.filter((entry) => entry.id !== target.id),
      ].slice(0, 8),
    }))
  },
  requestNewChat: () => {
    set((s) => ({
      newChatNonce: s.newChatNonce + 1,
      sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1,
      chatDrawer: {
        ...s.chatDrawer,
        open: false,
        conversationId: null,
        minimized: false,
      },
      workAreaOpen: true,
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
    writePersisted({
      chatDrawerOpen: false,
      chatDrawerConversationId: null,
      chatDrawerMinimized: false,
      workAreaOpen: true,
    })
  },
  openFreshChatDrawer: () => {
    set((s) => ({
      newChatNonce: s.newChatNonce + 1,
      sidebarFlyoutCloseEpoch: s.sidebarFlyoutCloseEpoch + 1,
      chatDrawer: {
        ...s.chatDrawer,
        open: true,
        conversationId: null,
        minimized: false,
      },
      rightPanel: { ...s.rightPanel, open: false },
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: null,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
    })
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

let shellStoreHydratedFromStorage = false

/** Test-only: reset hydration guard between vitest cases. */
export function resetShellStoreHydrationForTests(): void {
  shellStoreHydratedFromStorage = false
}

/** Apply localStorage shell prefs after mount — call once from a client provider. */
export function hydrateShellStoreFromStorage(): void {
  if (typeof window === 'undefined') return
  if (shellStoreHydratedFromStorage) return
  shellStoreHydratedFromStorage = true
  const persisted = readPersisted()
  const persistedMenuMode = persisted.menuMode === 'work' ? 'work' : 'home'
  const persistedConversationId =
    typeof persisted.chatDrawerConversationId === 'string'
      ? persisted.chatDrawerConversationId
      : null
  useShellStore.setState({
    sidebarPinned: persisted.sidebarPinned ?? false,
    menuMode: persistedMenuMode,
    chatDrawer: {
      ...useShellStore.getState().chatDrawer,
      open: persisted.chatDrawerOpen ?? false,
      conversationId: persistedConversationId,
      minimized: persisted.chatDrawerMinimized ?? false,
      width: clampChatDrawerWidth(persisted.chatDrawerWidth ?? 420),
    },
    chatHistoryWidth: clampChatHistoryWidth(persisted.chatHistoryWidth ?? 200),
    chatHistoryCollapsed: persisted.chatHistoryCollapsed ?? false,
    workAreaOpen: persisted.workAreaOpen ?? true,
    rightPanel: {
      open: persisted.rightPanelOpen ?? false,
      tab: persisted.rightPanelTab ?? 'tasks',
    },
    artifactViewer: {
      ...useShellStore.getState().artifactViewer,
      width: clampArtifactViewerWidth(persisted.artifactViewerWidth ?? 480),
    },
  })
}

export function shellSidebarExpanded(state: {
  sidebarPinned: boolean
  sidebarPeek: boolean
}): boolean {
  return state.sidebarPinned || state.sidebarPeek
}
