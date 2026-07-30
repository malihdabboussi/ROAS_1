import { beforeEach, describe, expect, it } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import {
  hydrateShellStoreFromStorage,
  resetShellStoreHydrationForTests,
  useShellStore,
} from './use-shell-store'

const STORAGE_KEY = 'vibey.shell.v1'

const target: ShellArtifactViewerTarget = {
  id: 'doc-1',
  title: 'Launch brief',
  type: 'doc',
  entityId: 'doc-1',
  entityTable: 'space_items',
  spaceId: 'space-1',
}

describe('shell persisted prefs hydration', () => {
  beforeEach(() => {
    resetShellStoreHydrationForTests()
    window.localStorage.removeItem(STORAGE_KEY)
    useShellStore.setState({
      sidebarPinned: false,
      menuMode: 'home',
      workAreaOpen: true,
      chatHistoryCollapsed: false,
      chatDrawer: { open: false, conversationId: null, width: 420, minimized: false },
      rightPanel: { open: false, tab: 'tasks' },
      artifactViewer: { target: null, width: 480 },
    })
  })

  it('restores sidebarPinned from localStorage after hydrateShellStoreFromStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarPinned: true }))
    hydrateShellStoreFromStorage()
    expect(useShellStore.getState().sidebarPinned).toBe(true)
  })

  it('does not re-read localStorage on repeated hydrate calls', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarPinned: true }))
    hydrateShellStoreFromStorage()
    useShellStore.setState({ sidebarPinned: false })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarPinned: true }))
    hydrateShellStoreFromStorage()
    expect(useShellStore.getState().sidebarPinned).toBe(false)
  })

  it('restores and clamps the chat history rail width', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chatHistoryWidth: 900, chatHistoryCollapsed: true }),
    )
    hydrateShellStoreFromStorage()
    expect(useShellStore.getState().chatHistoryWidth).toBe(420)
    expect(useShellStore.getState().chatHistoryCollapsed).toBe(true)

    useShellStore.getState().setChatHistoryWidth(100)
    expect(useShellStore.getState().chatHistoryWidth).toBe(180)
  })

  it('persists independent chat history collapse state', () => {
    useShellStore.getState().setChatHistoryCollapsed(true)

    expect(useShellStore.getState().chatHistoryCollapsed).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      chatHistoryCollapsed: true,
    })
  })

  it('restores the open chat and active conversation after a refresh', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        chatDrawerOpen: true,
        chatDrawerConversationId: 'conversation-1',
        chatDrawerMinimized: false,
      }),
    )

    hydrateShellStoreFromStorage()

    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: true,
      conversationId: 'conversation-1',
      minimized: false,
    })
  })

  it('persists open, minimized, restored, and explicitly closed chat states', () => {
    useShellStore.getState().openChatDrawer('conversation-1')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      chatDrawerOpen: true,
      chatDrawerConversationId: 'conversation-1',
      chatDrawerMinimized: false,
    })

    useShellStore.getState().minimizeChatDrawer()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      chatDrawerOpen: false,
      chatDrawerConversationId: 'conversation-1',
      chatDrawerMinimized: true,
    })

    useShellStore.getState().restoreChatDrawer()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      chatDrawerOpen: true,
      chatDrawerConversationId: 'conversation-1',
      chatDrawerMinimized: false,
    })

    useShellStore.getState().closeChatDrawer()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      chatDrawerOpen: false,
      chatDrawerConversationId: null,
      chatDrawerMinimized: false,
    })
  })

  it('restores the active artifact after a refresh and clears it when explicitly closed', () => {
    useShellStore.getState().openArtifactViewer(target)

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      artifactViewerTarget: target,
    })

    useShellStore.setState({
      artifactViewer: { target: null, width: 480 },
    })
    resetShellStoreHydrationForTests()
    hydrateShellStoreFromStorage()

    expect(useShellStore.getState().artifactViewer.target).toEqual(target)

    useShellStore.getState().closeArtifactViewer()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      artifactViewerTarget: null,
    })
  })
})

describe('shell artifact viewer state', () => {
  beforeEach(() => {
    useShellStore.setState({
      artifactViewer: { target: null, width: 480 },
      recentArtifactTargets: [],
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: false },
      rightPanel: { open: true, tab: 'files' },
    })
  })

  it('opens one artifact and collapses the summary panel', () => {
    useShellStore.getState().openArtifactViewer(target)

    expect(useShellStore.getState().artifactViewer.target).toEqual(target)
    expect(useShellStore.getState().rightPanel.open).toBe(false)
  })

  it('swaps artifact content in place', () => {
    useShellStore.getState().openArtifactViewer(target)
    useShellStore.getState().openArtifactViewer({ ...target, id: 'doc-2', title: 'Second doc' })

    expect(useShellStore.getState().artifactViewer.target?.id).toBe('doc-2')
    expect(useShellStore.getState().recentArtifactTargets.map((entry) => entry.id)).toEqual([
      'doc-2',
      'doc-1',
    ])
  })

  it('closes the artifact viewer when the summary panel or chat opens', () => {
    useShellStore.getState().openArtifactViewer(target)
    useShellStore.getState().setRightPanelOpen(true)
    expect(useShellStore.getState().artifactViewer.target).toBeNull()

    useShellStore.getState().openArtifactViewer(target)
    useShellStore.getState().openChatDrawer('conversation-1')
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
  })

  it('clamps the resizable viewer width', () => {
    useShellStore.getState().setArtifactViewerWidth(100)
    expect(useShellStore.getState().artifactViewer.width).toBe(360)

    useShellStore.getState().setArtifactViewerWidth(1000)
    expect(useShellStore.getState().artifactViewer.width).toBe(720)
  })
})

describe('shell work area', () => {
  beforeEach(() => {
    useShellStore.setState({
      workAreaOpen: false,
      chatDrawer: { open: false, conversationId: null, width: 420, minimized: true },
      recentWorkAreaPages: [],
    })
  })

  it('toggles the work area on any route', () => {
    useShellStore.getState().setWorkAreaOpen(true)
    expect(useShellStore.getState().workAreaOpen).toBe(true)
    useShellStore.getState().toggleWorkAreaOpen()
    expect(useShellStore.getState().workAreaOpen).toBe(false)
  })

  it('opens the chat drawer when the work area collapses', () => {
    useShellStore.getState().setWorkAreaOpen(true)
    useShellStore.getState().setWorkAreaOpen(false)
    expect(useShellStore.getState().chatDrawer.open).toBe(true)
    expect(useShellStore.getState().chatDrawer.minimized).toBe(false)
  })

  it('preserves the current artifact while its work surface is collapsed', () => {
    useShellStore.getState().openArtifactViewer(target)
    useShellStore.getState().setWorkAreaOpen(false)

    expect(useShellStore.getState().artifactViewer.target).toEqual(target)
  })

  it('keeps named page history unique and most-recent-first', () => {
    const agenda = { id: '/home', title: 'Agenda', href: '/home' }
    const skills = { id: '/team/skills', title: 'Skills', href: '/team/skills' }

    useShellStore.getState().recordWorkAreaPage(agenda)
    useShellStore.getState().recordWorkAreaPage(skills)
    useShellStore.getState().recordWorkAreaPage(agenda)

    expect(useShellStore.getState().recentWorkAreaPages).toEqual([agenda, skills])
  })
})
