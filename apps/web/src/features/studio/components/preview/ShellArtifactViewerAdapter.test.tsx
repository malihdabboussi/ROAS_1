import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
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
})
