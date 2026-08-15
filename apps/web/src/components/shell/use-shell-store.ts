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
import {
  createShellScreenChatSlice,
  sanitizeScreenConversations,
  type ShellScreenChatSlice,
} from './use-shell-store.screen-chat'

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

export type ShellWorkAreaRestore = {
  feature: string
  data: unknown
}

export type ShellWorkAreaPageTarget = {
  id: string
  title: string
  href: string
  /** Feature-owned payload so the memory menu can reopen the exact surface. */
  restore?: ShellWorkAreaRestore
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
  screenConversations?: Record<string, string>
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

interface ShellStore extends ShellScreenChatSlice {
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
  pageBreadcrumbLabel: string | null
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
  setChatDrawerWidth: (width: number) => void
  setChatHistoryWidth: (width: number) => void
  setChatHistoryCollapsed: (collapsed: boolean) => void
  setWorkAreaOpen: (open: boolean) => void
  toggleWorkAreaOpen: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  requestConversationScopePicker: () => void
  openArtifactViewer: (target: ShellArtifactViewerTarget) => void
  closeArtifactViewer: () => void
  setArtifactViewerWidth: (width: number) => void
  recordWorkAreaPage: (target: ShellWorkAreaPageTarget) => void
  requestNewChat: () => void
  /** Fresh chat in the docked left drawer (workspace routes); stays on current page. */
  openFreshChatDrawer: () => void
  bumpSidebarFlyoutClose: () => void
  setPageBreadcrumb: (node: ReactNode | null, owner?: object | null, label?: string | null) => void
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
  conversationScopePickerRequestNonce: 0,
  artifactViewer: {
    target: null,
    width: ARTIFACT_VIEWER_WIDTH_DEFAULT,
  },
  recentArtifactTargets: [],
  recentWorkAreaPages: [],
  ...createShellScreenChatSlice(set, get, writePersisted),
  newChatNonce: 0,
  sidebarFlyoutCloseEpoch: 0,
  pageBreadcrumb: null,
  pageBreadcrumbOwner: null,
  pageBreadcrumbLabel: null,
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
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
    writePersisted({
      chatDrawerOpen: true,
      chatDrawerConversationId: nextConversationId,
      chatDrawerMinimized: false,
      rightPanelOpen: false,
      artifactViewerTarget: null,
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
      artifactViewerTarget: null,
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
      ...(open ? { artifactViewerTarget: null } : {}),
    })
    set((s) => ({
      rightPanel: { ...s.rightPanel, open },
      artifactViewer: open ? { ...s.artifactViewer, target: null } : s.artifactViewer,
    }))
  },
  toggleRightPanel: () => {
    get().setRightPanelOpen(!get().rightPanel.open)
  },
  requestConversationScopePicker: () => {
    writePersisted({ rightPanelOpen: true, artifactViewerTarget: null })
    set((s) => ({
      conversationScopePickerRequestNonce: s.conversationScopePickerRequestNonce + 1,
      rightPanel: { ...s.rightPanel, open: true },
      artifactViewer: { ...s.artifactViewer, target: null },
    }))
  },
  openArtifactViewer: (target) => {
    const width = resolveOpenedArtifactViewerWidth(get().artifactViewer.width, target.type)
    writePersisted({
      rightPanelOpen: false,
      workAreaOpen: true,
      artifactViewerTarget: target,
      artifactViewerWidth: width,
    })
    set((s) => ({
      artifactViewer: { ...s.artifactViewer, target, width },
      recentArtifactTargets: [
        target,
        ...s.recentArtifactTargets.filter((entry) => entry.id !== target.id),
      ].slice(0, 6),
      rightPanel: { ...s.rightPanel, open: false },
      workAreaOpen: true,
    }))
  },
  closeArtifactViewer: () => {
    writePersisted({ artifactViewerTarget: null })
    set((s) => ({ artifactViewer: { ...s.artifactViewer, target: null } }))
  },
  setArtifactViewerWidth: (width) => {
    const clamped = clampArtifactViewerWidth(width)
    writePersisted({ artifactViewerWidth: clamped })
    set((s) => ({ artifactViewer: { ...s.artifactViewer, width: clamped } }))
  },
  recordWorkAreaPage: (target) => {
    if (new URLSearchParams(target.href.split('?')[1] ?? '').has('conv')) return
    set((s) => {
      const title = target.title.trim() || target.href
      const titleKey = title.toLocaleLowerCase()
      // A feature host and the top bar can both record the same surface id —
      // never let the payload-less record drop the host's restore payload.
      const restore =
        target.restore ?? s.recentWorkAreaPages.find((entry) => entry.id === target.id)?.restore
      return {
        recentWorkAreaPages: [
          {
            id: target.id,
            title,
            href: target.href,
            ...(restore ? { restore } : {}),
          },
          ...s.recentWorkAreaPages.filter(
            (entry) =>
              entry.id !== target.id && entry.title.trim().toLocaleLowerCase() !== titleKey,
          ),
        ].slice(0, 8),
      }
    })
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
      artifactViewerTarget: null,
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
      artifactViewerTarget: null,
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
    lastConversationByScreen: sanitizeScreenConversations(persisted.screenConversations),
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
