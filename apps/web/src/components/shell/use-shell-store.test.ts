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
      spaceWorkOpen: true,
      rightPanel: { open: false, tab: 'tasks' },
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
})

describe('shell artifact viewer state', () => {
  beforeEach(() => {
    useShellStore.setState({
      artifactViewer: { target: null, width: 480 },
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

describe('shell space work dock', () => {
  beforeEach(() => {
    useShellStore.setState({
      spaceWorkOpen: false,
    })
  })

  it('toggles the Space dock open without item tabs', () => {
    useShellStore.getState().setSpaceWorkOpen(true)
    expect(useShellStore.getState().spaceWorkOpen).toBe(true)
    useShellStore.getState().toggleSpaceWorkOpen()
    expect(useShellStore.getState().spaceWorkOpen).toBe(false)
  })
})
