import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { VIBEY_OPEN_MEDIA_EVENT } from '@/lib/media/open-media-asset-in-app'
import { ShellArtifactViewerAdapter } from './ShellArtifactViewerAdapter'

vi.mock('next/navigation', () => ({ usePathname: () => '/chat' }))

vi.mock('@/components/deliverables/deliverable-entity-preview-renderer', () => ({
  renderDeliverableEntityPreview: vi.fn(),
}))

vi.mock('@/components/deliverables/use-deliverable-entity-content', () => ({
  useDeliverableEntityContent: () => ({
    effectiveContent: null,
    entityContentLoading: false,
    isEntityType: false,
    isTextContent: true,
  }),
}))

vi.mock('@/components/deliverables/DeliverablePreviewBody', () => ({
  DeliverablePreviewBody: () => <div data-testid="lightweight-preview" />,
}))

vi.mock('@/components/shell/ShellArtifactViewerPanel', () => ({
  ShellArtifactViewerPanel: ({ children }: { children: React.ReactNode }) => (
    <aside>{children}</aside>
  ),
}))

vi.mock('@/components/spaces/SpaceDocEditorPanelAdapter', () => ({
  SpaceDocEditorPanelAdapter: () => <div data-testid="canonical-space-editor" />,
}))

vi.mock('@/components/shell/ShellTaskArtifactViewerAdapter', () => ({
  ShellTaskArtifactViewerAdapter: ({
    target,
  }: {
    target: { entityId?: string; id: string; spaceId?: string }
  }) => (
    <div data-testid="canonical-task-panel">
      {target.spaceId}:{target.entityId || target.id}
    </div>
  ),
}))

vi.mock('./ShellMediaArtifactViewer', () => ({
  ShellMediaArtifactViewer: ({ target }: { target: ShellArtifactViewerTarget }) => (
    <div data-testid="media-studio">
      {target.type}:{target.mediaAssetId}
    </div>
  ),
}))

const target: ShellArtifactViewerTarget = {
  id: 'doc-1',
  entityId: 'doc-1',
  entityTable: 'space_items',
  spaceId: 'space-1',
  title: 'Full Space doc',
  type: 'doc',
  internalUrl: '/spaces?space=space-1&item=doc-1',
}

describe('ShellArtifactViewerAdapter', () => {
  beforeEach(() => {
    useShellStore.setState({ artifactViewer: { target, width: 480 } })
  })

  afterEach(cleanup)

  it('renders the canonical inline Space editor instead of the lightweight preview', async () => {
    render(<ShellArtifactViewerAdapter />)

    await waitFor(() => expect(screen.getByTestId('canonical-space-editor')).toBeTruthy())
    expect(screen.queryByTestId('lightweight-preview')).toBeNull()
  })

  it('renders created tasks in the canonical right-side task panel', async () => {
    useShellStore.setState({
      artifactViewer: {
        width: 480,
        target: {
          id: 'task-1',
          entityId: 'task-1',
          entityTable: 'space_items',
          spaceId: 'delegation-desk-1',
          title: 'Review the captured work',
          type: 'task',
        },
      },
    })

    render(<ShellArtifactViewerAdapter />)

    await waitFor(() => expect(screen.getByTestId('canonical-task-panel')).toBeTruthy())
    expect(screen.getByText('delegation-desk-1:task-1')).toBeTruthy()
  })

  it('opens the image studio when a chat image has no mounted Space consumer', async () => {
    useShellStore.setState({ artifactViewer: { target: null, width: 480 } })
    render(<ShellArtifactViewerAdapter />)

    act(() => {
      window.dispatchEvent(
        new CustomEvent(VIBEY_OPEN_MEDIA_EVENT, {
          detail: {
            mediaAssetId: '0f3fa1a4-6c8e-4282-bc68-00161152e039',
            title: 'Generated dog',
          },
          cancelable: true,
        }),
      )
    })

    await waitFor(() => expect(screen.getByTestId('media-studio')).toBeTruthy())
    expect(screen.getByText('image:0f3fa1a4-6c8e-4282-bc68-00161152e039')).toBeTruthy()
  })

  it('opens the media studio as video when kind is video', async () => {
    useShellStore.setState({ artifactViewer: { target: null, width: 480 } })
    render(<ShellArtifactViewerAdapter />)

    act(() => {
      window.dispatchEvent(
        new CustomEvent(VIBEY_OPEN_MEDIA_EVENT, {
          detail: {
            mediaAssetId: '548941d2-dc17-4943-a0d2-37a66e263aa6',
            title: 'Processed media',
            kind: 'video',
            fileUrl: 'https://example.com/story.mp4',
          },
          cancelable: true,
        }),
      )
    })

    await waitFor(() => expect(screen.getByTestId('media-studio')).toBeTruthy())
    expect(screen.getByText('video:548941d2-dc17-4943-a0d2-37a66e263aa6')).toBeTruthy()
  })
})
