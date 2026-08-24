'use client'

import type { ReactNode } from 'react'
import { create } from 'zustand'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import {
  ARTIFACT_VIEWER_WIDTH_DEFAULT,
  clampArtifactViewerWidth,
  hydrateArtifactViewerWidth,
  resolveOpenedArtifactViewerWidth,
} from '@/lib/artifacts/artifact-viewer-layout'
import { sanitizeLastArtifactByConversation } from './shell-artifact-conversation'
import {
  rememberWorkAreaPage,
  sanitizeLastWorkAreaPageByConversation,
  type ShellWorkAreaPageTarget,
  type ShellWorkAreaRestore,
} from './shell-work-area-page'
import {
  createShellArtifactConversationSlice,
  forgetClosedArtifact,
  rememberOpenArtifact,
  type ShellArtifactConversationSlice,
} from './use-shell-store.artifact-conversation'
import {
  createShellWorkAreaConversationSlice,
  type ShellWorkAreaConversationSlice,
} from './use-shell-store.work-area-conversation'

export type { ShellWorkAreaPageTarget, ShellWorkAreaRestore }
const STORAGE_KEY = 'vibey.shell.v1'

export type ShellMenuMode = 'home' | 'work'

export type ShellChatDrawerState = {
  open: boolean
  conversationId: string | null
  width: number
  minimized: boolean
}

export type ShellRightPanelState = {
  open: boolean
}

export type ShellArtifactViewerState = {
  target: ShellArtifactViewerTarget | null
  width: number
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
  workAreaOpen?: boolean
  artifactViewerWidth?: number
  artifactViewerTarget?: ShellArtifactViewerTarget | null
  lastArtifactByConversation?: Record<string, ShellArtifactViewerTarget>
  lastWorkAreaPageByConversation?: Record<string, ShellWorkAreaPageTarget>
  artifactPinned?: boolean
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

function persistedArtifactTarget(value: unknown): ShellArtifactViewerTarget | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ShellArtifactViewerTarget>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.type !== 'string'
  ) {
    return null
  }
  return candidate as ShellArtifactViewerTarget
}

const CHAT_DRAWER_WIDTH_MIN = 360
const CHAT_DRAWER_WIDTH_FALLBACK_MAX = 1920
const CHAT_HISTORY_WIDTH_MIN = 180
const CHAT_HISTORY_WIDTH_MAX = 420
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

interface ShellStore extends ShellArtifactConversationSlice, ShellWorkAreaConversationSlice {
  sidebarPinned: boolean
  sidebarPeek: boolean
  menuMode: ShellMenuMode
  chatDrawer: ShellChatDrawerState
  chatHistoryWidth: number
  chatHistoryCollapsed: boolean
  /** Page work area (Space dock, Brain, Inbox, …) visible; false = chat full width. */
  workAreaOpen: boolean
  rightPanel: ShellRightPanelState
  /** True when the chat pane is wide enough for an in-flow summary column. */
  summaryPanelDocked: boolean
  conversationScopePickerRequestNonce: number
  artifactViewer: ShellArtifactViewerState
  recentArtifactTargets: ShellArtifactViewerTarget[]
  recentWorkAreaPages: ShellWorkAreaPageTarget[]
  newChatNonce: number
  /** Bumped to close HQ dock flyouts (Home/Work, pin). */
  sidebarFlyoutCloseEpoch: number
  pageBreadcrumb: ReactNode | null
  pageBreadcrumbOwner: object | null
  pageBreadcrumbLabel: string | null
  pageHeaderAction: ReactNode | null
  pageHeaderActionOwner: object | null
  pendingWorkRestore: ShellWorkAreaRestore | null

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
  showScreenOnly: () => void
  setChatDrawerWidth: (width: number) => void
  setChatHistoryWidth: (width: number) => void
  setChatHistoryCollapsed: (collapsed: boolean) => void
  setWorkAreaOpen: (open: boolean) => void
  toggleWorkAreaOpen: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  setSummaryPanelDocked: (docked: boolean) => void
  requestConversationScopePicker: () => void
  openArtifactViewer: (target: ShellArtifactViewerTarget, conversationId?: string | null) => void
  closeArtifactViewer: (conversationId?: string | null) => void
  setArtifactViewerWidth: (width: number) => void
  requestNewChat: () => void
  openFreshChatDrawer: () => void
  bumpSidebarFlyoutClose: () => void
  setPageBreadcrumb: (node: ReactNode | null, owner?: object | null, label?: string | null) => void
  setPageHeaderAction: (node: ReactNode | null, owner?: object | null) => void
  setPendingWorkRestore: (restore: ShellWorkAreaRestore | null) => void
  consumePendingWorkRestore: (feature: string) => ShellWorkAreaRestore | null
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
  },
  summaryPanelDocked: false,
  conversationScopePickerRequestNonce: 0,
  artifactViewer: {
    target: null,
    width: ARTIFACT_VIEWER_WIDTH_DEFAULT,
  },
  recentArtifactTargets: [],
  recentWorkAreaPages: [],
  ...createShellArtifactConversationSlice(set, get, writePersisted),
  ...createShellWorkAreaConversationSlice(set, writePersisted),
  newChatNonce: 0,
  sidebarFlyoutCloseEpoch: 0,
  pageBreadcrumb: null,
  pageBreadcrumbOwner: null,
  pageBreadcrumbLabel: null,
  pageHeaderAction: null,
  pageHeaderActionOwner: null,
  pendingWorkRestore: null,

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
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: nextConversationId,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
    })
    get().syncArtifactViewerForConversation(nextConversationId)
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
    const conversationId = get().chatDrawer.conversationId
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: true, minimized: false },
      rightPanel: { ...s.rightPanel, open: false },
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: conversationId,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
    })
    get().syncArtifactViewerForConversation(conversationId)
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
  showScreenOnly: () => {
    set((s) => ({
      chatDrawer: { ...s.chatDrawer, open: false, minimized: true },
      artifactViewer: { ...s.artifactViewer, target: null },
      artifactPinned: false,
      workAreaOpen: true,
    }))
    writePersisted({
      chatDrawerOpen: false,
      chatDrawerConversationId: get().chatDrawer.conversationId,
      chatDrawerMinimized: true,
      artifactViewerTarget: null,
      artifactPinned: false,
      workAreaOpen: true,
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
    // A surface opening on the right supersedes the summary card — never
    // leave chat + summary + work area stacked three-wide. Only touch the
    // rightPanel slice when it is actually open: replacing its identity on
    // every call re-notifies subscribers and can ping-pong into a render loop.
    if (get().rightPanel.open) {
      writePersisted({ workAreaOpen: open, rightPanelOpen: false })
      set((s) => ({ workAreaOpen: open, rightPanel: { ...s.rightPanel, open: false } }))
      return
    }
    set({ workAreaOpen: open })
  },
  toggleWorkAreaOpen: () => {
    get().setWorkAreaOpen(!get().workAreaOpen)
  },
  setRightPanelOpen: (open) => {
    writePersisted({
      rightPanelOpen: open,
      ...(open ? { artifactViewerTarget: null, artifactPinned: false } : {}),
    })
    set((s) => ({
      rightPanel: { ...s.rightPanel, open },
      artifactViewer: open ? { ...s.artifactViewer, target: null } : s.artifactViewer,
      artifactPinned: open ? false : s.artifactPinned,
    }))
  },
  toggleRightPanel: () => {
    get().setRightPanelOpen(!get().rightPanel.open)
  },
  setSummaryPanelDocked: (docked) => {
    if (get().summaryPanelDocked === docked) return
    set({ summaryPanelDocked: docked })
  },
  requestConversationScopePicker: () => {
    writePersisted({ rightPanelOpen: true, artifactViewerTarget: null, artifactPinned: false })
    set((s) => ({
      conversationScopePickerRequestNonce: s.conversationScopePickerRequestNonce + 1,
      rightPanel: { ...s.rightPanel, open: true },
      artifactViewer: { ...s.artifactViewer, target: null },
      artifactPinned: false,
    }))
  },
  openArtifactViewer: (target, conversationId) => {
    const width = resolveOpenedArtifactViewerWidth(get().artifactViewer.width, target.type)
    const remembered = rememberOpenArtifact(
      get().lastArtifactByConversation,
      conversationId ?? target.conversationId,
      target,
    )
    const conversationKey = remembered.target.conversationId
    const currentPage = get().recentWorkAreaPages[0]
    const lastWorkAreaPageByConversation =
      conversationKey && currentPage
        ? rememberWorkAreaPage(get().lastWorkAreaPageByConversation, conversationKey, currentPage)
        : get().lastWorkAreaPageByConversation
    writePersisted({
      rightPanelOpen: false,
      workAreaOpen: true,
      artifactViewerTarget: remembered.target,
      artifactViewerWidth: width,
      lastArtifactByConversation: remembered.lastArtifactByConversation,
      lastWorkAreaPageByConversation,
    })
    set((s) => ({
      artifactViewer: { ...s.artifactViewer, target: remembered.target, width },
      lastArtifactByConversation: remembered.lastArtifactByConversation,
      lastWorkAreaPageByConversation,
      recentArtifactTargets: [
        remembered.target,
        ...s.recentArtifactTargets.filter((entry) => entry.id !== remembered.target.id),
      ].slice(0, 6),
      rightPanel: { ...s.rightPanel, open: false },
      workAreaOpen: true,
    }))
  },
  closeArtifactViewer: (conversationId) => {
    const current = get().artifactViewer.target
    const lastArtifactByConversation = forgetClosedArtifact(
      get().lastArtifactByConversation,
      current,
      conversationId,
    )
    writePersisted({
      artifactViewerTarget: null,
      artifactPinned: false,
      lastArtifactByConversation,
    })
    set((s) => ({
      artifactViewer: { ...s.artifactViewer, target: null },
      artifactPinned: false,
      lastArtifactByConversation,
    }))
  },
  setArtifactViewerWidth: (width) => {
    const clamped = clampArtifactViewerWidth(width)
    writePersisted({ artifactViewerWidth: clamped })
    set((s) => ({ artifactViewer: { ...s.artifactViewer, width: clamped } }))
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
      artifactViewer: { ...s.artifactViewer, target: null },
      artifactPinned: false,
      workAreaOpen: true,
    }))
    writePersisted({
      chatDrawerOpen: false,
      chatDrawerConversationId: null,
      chatDrawerMinimized: false,
      artifactViewerTarget: null,
      artifactPinned: false,
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
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: null,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
    })
  },
  setPageBreadcrumb: (node, owner = null, label = null) => {
    if (node === null) {
      const currentOwner = get().pageBreadcrumbOwner
      if (owner != null && currentOwner != null && currentOwner !== owner) return
      set({ pageBreadcrumb: null, pageBreadcrumbOwner: null, pageBreadcrumbLabel: null })
      return
    }
    const trimmed = typeof label === 'string' ? label.trim() : ''
    set({
      pageBreadcrumb: node,
      pageBreadcrumbOwner: owner,
      pageBreadcrumbLabel: trimmed || null,
    })
  },
  setPageHeaderAction: (node, owner = null) => {
    if (node === null) {
      const currentOwner = get().pageHeaderActionOwner
      if (owner != null && currentOwner != null && currentOwner !== owner) return
      set({ pageHeaderAction: null, pageHeaderActionOwner: null })
      return
    }
    set({ pageHeaderAction: node, pageHeaderActionOwner: owner })
  },
  setPendingWorkRestore: (restore) => {
    set({ pendingWorkRestore: restore })
  },
  consumePendingWorkRestore: (feature) => {
    const pending = get().pendingWorkRestore
    if (!pending || pending.feature !== feature) return null
    set({ pendingWorkRestore: null })
    return pending
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
  const artifactViewerTarget = persistedArtifactTarget(persisted.artifactViewerTarget)
  const lastArtifactByConversation = sanitizeLastArtifactByConversation(
    persisted.lastArtifactByConversation,
  )
  const lastWorkAreaPageByConversation = sanitizeLastWorkAreaPageByConversation(
    persisted.lastWorkAreaPageByConversation,
  )
  const artifactPinned = persisted.artifactPinned === true
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
    lastArtifactByConversation,
    lastWorkAreaPageByConversation,
    artifactPinned,
    workAreaOpen: artifactViewerTarget ? true : (persisted.workAreaOpen ?? true),
    rightPanel: {
      open: artifactViewerTarget ? false : (persisted.rightPanelOpen ?? false),
    },
    artifactViewer: {
      ...useShellStore.getState().artifactViewer,
      target: artifactViewerTarget,
      width: hydrateArtifactViewerWidth(persisted.artifactViewerWidth),
    },
  })
}

export function shellSidebarExpanded(state: {
  sidebarPinned: boolean
  sidebarPeek: boolean
}): boolean {
  return state.sidebarPinned || state.sidebarPeek
}
