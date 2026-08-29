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
      rightPanel: { open: false },
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

  it('restores lastWorkAreaPageByConversation after a refresh', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastWorkAreaPageByConversation: {
          'conversation-1': {
            id: '/home/meetings?meeting=evt-1',
            title: 'Strategy call',
            href: '/home/meetings?meeting=evt-1',
            restore: { feature: 'home_meeting', data: { id: 'evt-1' } },
            conversationBound: true,
          },
        },
      }),
    )
    hydrateShellStoreFromStorage()
    expect(useShellStore.getState().lastWorkAreaPageByConversation['conversation-1']?.href).toBe(
      '/home/meetings?meeting=evt-1',
    )
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
      lastArtifactByConversation: {},
      artifactPinned: false,
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: false },
      rightPanel: { open: true },
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

  it('closes the artifact viewer when the summary panel opens', () => {
    useShellStore.getState().openArtifactViewer(target)
    useShellStore.getState().setRightPanelOpen(true)
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
  })

  it('restores each chat’s last artifact when switching conversations', () => {
    useShellStore.setState({
      lastArtifactByConversation: {},
      artifactPinned: false,
      artifactViewer: { target: null, width: 480 },
    })
    useShellStore.getState().openArtifactViewer(target, 'conversation-1')
    useShellStore
      .getState()
      .openArtifactViewer({ ...target, id: 'doc-2', title: 'Second doc' }, 'conversation-2')

    useShellStore.getState().syncArtifactViewerForConversation('conversation-1')
    expect(useShellStore.getState().artifactViewer.target).toMatchObject({
      id: 'doc-1',
      conversationId: 'conversation-1',
    })

    useShellStore.getState().syncArtifactViewerForConversation('conversation-2')
    expect(useShellStore.getState().artifactViewer.target).toMatchObject({
      id: 'doc-2',
      conversationId: 'conversation-2',
    })
  })

  it('keeps a pinned artifact open across chat switches and drawer opens', () => {
    useShellStore.setState({
      lastArtifactByConversation: {},
      artifactPinned: false,
      artifactViewer: { target: null, width: 480 },
    })
    useShellStore.getState().openArtifactViewer(target, 'conversation-1')
    useShellStore.getState().setArtifactPinned(true)

    useShellStore.getState().syncArtifactViewerForConversation('conversation-2')
    expect(useShellStore.getState().artifactViewer.target?.id).toBe('doc-1')

    useShellStore.getState().openChatDrawer('conversation-2')
    expect(useShellStore.getState().artifactViewer.target?.id).toBe('doc-1')
  })

  it('closes the unpinned artifact when opening a chat with no remembered artifact', () => {
    useShellStore.getState().openArtifactViewer(target)
    useShellStore.getState().openChatDrawer('conversation-1')
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
  })

  it('enforces a minimum artifact width and does not cap growth', () => {
    useShellStore.getState().setArtifactViewerWidth(100)
    expect(useShellStore.getState().artifactViewer.width).toBe(420)

    useShellStore.getState().setArtifactViewerWidth(1400)
    expect(useShellStore.getState().artifactViewer.width).toBe(1400)

    useShellStore.getState().setArtifactViewerWidth(2000)
    expect(useShellStore.getState().artifactViewer.width).toBe(2000)
  })

  it('opens editors at a usable width instead of the legacy 480 pane', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 })
    useShellStore.setState({ artifactViewer: { target: null, width: 480 } })
    useShellStore.getState().openArtifactViewer(target)
    expect(useShellStore.getState().artifactViewer.width).toBe(960)
  })
})

describe('shell work area', () => {
  beforeEach(() => {
    useShellStore.setState({
      workAreaOpen: false,
      chatDrawer: { open: false, conversationId: null, width: 420, minimized: true },
      recentWorkAreaPages: [],
      lastWorkAreaPageByConversation: {},
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

  it('excludes conversations and deduplicates equivalent named work surfaces', () => {
    useShellStore.getState().recordWorkAreaPage({
      id: '/home?conv=conversation-1',
      title: 'Launch chat',
      href: '/home?conv=conversation-1',
    })
    useShellStore.getState().recordWorkAreaPage({
      id: '/home/meetings?meeting=evt-1',
      title: 'Weekly planning',
      href: '/home/meetings?meeting=evt-1',
    })
    useShellStore.getState().recordWorkAreaPage({
      id: 'home-meeting:evt-1',
      title: 'Weekly planning',
      href: '/home/meetings?meeting=evt-1&space=space-1',
    })

    expect(useShellStore.getState().recentWorkAreaPages).toEqual([
      {
        id: 'home-meeting:evt-1',
        title: 'Weekly planning',
        href: '/home/meetings?meeting=evt-1&space=space-1',
      },
    ])
  })

  it('stores restore payloads on work-area memory entries', () => {
    useShellStore.getState().recordWorkAreaPage({
      id: 'home-meeting:evt-1',
      title: 'Aaron x Dylan x Nate',
      href: '/home',
      restore: { feature: 'home_meeting', data: { id: 'evt-1' } },
    })

    expect(useShellStore.getState().recentWorkAreaPages[0]?.restore).toEqual({
      feature: 'home_meeting',
      data: { id: 'evt-1' },
    })
  })

  it('keeps an existing restore payload when the same page is re-recorded without one', () => {
    const restore = { feature: 'home_meeting', data: { id: 'evt-1' } }
    useShellStore.getState().recordWorkAreaPage({
      id: '/home/meetings?meeting=evt-1',
      title: 'Aaron x Dylan x Nate',
      href: '/home/meetings?meeting=evt-1',
      restore,
    })
    useShellStore.getState().recordWorkAreaPage({
      id: '/home/meetings?meeting=evt-1',
      title: 'Aaron x Dylan x Nate',
      href: '/home/meetings?meeting=evt-1',
    })

    expect(useShellStore.getState().recentWorkAreaPages).toHaveLength(1)
    expect(useShellStore.getState().recentWorkAreaPages[0]?.restore).toEqual(restore)
  })

  it('remembers the work page for the conversation that used it', () => {
    useShellStore.setState({ lastWorkAreaPageByConversation: {} })
    useShellStore.getState().recordWorkAreaPage(
      {
        id: '/home/meetings?meeting=evt-1',
        title: 'Strategy call',
        href: '/home/meetings?meeting=evt-1',
        restore: { feature: 'home_meeting', data: { id: 'evt-1' } },
      },
      'conversation-1',
    )

    expect(useShellStore.getState().lastWorkAreaPageByConversation['conversation-1']).toMatchObject(
      {
        href: '/home/meetings?meeting=evt-1',
        conversationId: 'conversation-1',
        conversationBound: true,
      },
    )
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      lastWorkAreaPageByConversation: {
        'conversation-1': expect.objectContaining({ href: '/home/meetings?meeting=evt-1' }),
      },
    })
  })

  it('does not attach the current navigation page when opening an artifact in a chat', () => {
    useShellStore.setState({
      lastWorkAreaPageByConversation: {},
      recentWorkAreaPages: [
        {
          id: '/home/meetings?meeting=evt-1',
          title: 'Strategy call',
          href: '/home/meetings?meeting=evt-1',
        },
      ],
    })
    useShellStore.getState().openArtifactViewer(target, 'conversation-1')

    expect(
      useShellStore.getState().lastWorkAreaPageByConversation['conversation-1'],
    ).toBeUndefined()
  })
})

describe('screen-only destination navigation', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: 'conv-current', width: 420, minimized: false },
      artifactViewer: { target, width: 480 },
      artifactPinned: true,
      lastArtifactByConversation: { 'conv-current': target },
      workAreaOpen: false,
    })
  })

  it('shows the destination alone without forgetting the current conversation artifact', () => {
    useShellStore.getState().showScreenOnly()

    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: false,
      minimized: true,
      conversationId: 'conv-current',
    })
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
    expect(useShellStore.getState().artifactPinned).toBe(false)
    expect(useShellStore.getState().workAreaOpen).toBe(true)
    expect(useShellStore.getState().lastArtifactByConversation['conv-current']).toEqual(target)
  })

  it('keeps an open card beside a fresh docked chat', () => {
    useShellStore.getState().openFreshChatDrawer()

    expect(useShellStore.getState().chatDrawer).toMatchObject({ open: true, conversationId: null })
    expect(useShellStore.getState().artifactViewer.target).toEqual(target)
  })

  it('clears the visible card for full-screen new chat without deleting saved chat artifacts', () => {
    useShellStore.getState().requestNewChat()

    expect(useShellStore.getState().chatDrawer).toMatchObject({ open: false, conversationId: null })
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
    expect(useShellStore.getState().artifactPinned).toBe(false)
    expect(useShellStore.getState().lastArtifactByConversation['conv-current']).toEqual(target)
  })
})
