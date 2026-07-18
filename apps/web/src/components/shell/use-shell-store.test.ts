import { beforeEach, describe, expect, it } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { useShellStore } from './use-shell-store'

const target: ShellArtifactViewerTarget = {
  id: 'doc-1',
  title: 'Launch brief',
  type: 'doc',
  entityId: 'doc-1',
  entityTable: 'space_items',
  spaceId: 'space-1',
}

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

describe('shell space work tabs', () => {
  beforeEach(() => {
    useShellStore.setState({
      spaceWorkOpen: false,
      spaceWorkBySpaceId: {},
    })
  })

  it('opens a tab, expands space work, and closes back to the next tab', () => {
    useShellStore.getState().openSpaceWorkTab({
      id: 'doc-1',
      kind: 'doc',
      title: 'Brief',
      spaceId: 'space-1',
    })
    useShellStore.getState().openSpaceWorkTab({
      id: 'task-1',
      kind: 'task',
      title: 'Ship',
      spaceId: 'space-1',
    })

    expect(useShellStore.getState().spaceWorkOpen).toBe(true)
    expect(useShellStore.getState().spaceWorkBySpaceId['space-1']?.tabs.map((t) => t.id)).toEqual([
      'task-1',
      'doc-1',
    ])
    expect(useShellStore.getState().spaceWorkBySpaceId['space-1']?.activeTabId).toBe('task-1')

    useShellStore.getState().closeSpaceWorkTab('space-1', 'task-1')
    expect(useShellStore.getState().spaceWorkBySpaceId['space-1']?.activeTabId).toBe('doc-1')
  })
})
