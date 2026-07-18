import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { SpaceDocEditorPanelAdapter } from './SpaceDocEditorPanelAdapter'

const mocks = vi.hoisted(() => ({
  fetchSpaceItemById: vi.fn(),
  loadRoster: vi.fn(),
  loadSpaces: vi.fn(),
}))

vi.mock('@/features/spaces/components/docs/DocEditorPanel', () => ({
  DocEditorPanel: ({
    item,
    inline,
    spaceIdOverride,
    embedded,
    googleActionTarget,
  }: {
    item: { title: string }
    inline?: boolean
    spaceIdOverride?: string
    embedded?: boolean
    googleActionTarget?: HTMLElement | null
  }) => (
    <div
      data-testid="canonical-space-editor"
      data-inline={String(inline)}
      data-space-id={spaceIdOverride}
      data-embedded={String(embedded)}
      data-google-target={googleActionTarget?.dataset.testid ?? ''}
    >
      {item.title}
    </div>
  ),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      spaces: [
        {
          id: 'space-1',
          campaign_id: 'campaign-1',
          schema: { fields: [], views: [] },
        },
      ],
      roster: [],
      currentUserId: 'user-1',
      loadRoster: mocks.loadRoster,
      loadSpaces: mocks.loadSpaces,
    }),
}))

vi.mock('@/lib/spaces', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/spaces')
  return { ...actual, fetchSpaceItemById: mocks.fetchSpaceItemById }
})

const target: ShellArtifactViewerTarget = {
  id: 'doc-1',
  entityId: 'doc-1',
  entityTable: 'space_items',
  spaceId: 'space-1',
  title: 'Full Space doc',
  type: 'doc',
}

describe('SpaceDocEditorPanelAdapter', () => {
  beforeEach(() => {
    mocks.fetchSpaceItemById.mockReset().mockResolvedValue({
      id: 'doc-1',
      space_id: 'space-1',
      title: 'Full Space doc',
      doc_body: '<p>Canonical body</p>',
      custom_data: { _view_type: 'doc' },
    })
  })

  afterEach(cleanup)

  it('loads the real Space item into the canonical inline editor', async () => {
    render(<SpaceDocEditorPanelAdapter target={target} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('canonical-space-editor')).toBeTruthy())
    expect(screen.getByTestId('canonical-space-editor').dataset.inline).toBe('true')
    expect(screen.getByTestId('canonical-space-editor').dataset.spaceId).toBe('space-1')
  })

  it('supports Mission chrome while keeping the canonical editor body', async () => {
    const actionTarget = document.createElement('div')
    actionTarget.dataset.testid = 'mission-actions'
    render(
      <SpaceDocEditorPanelAdapter
        target={target}
        onClose={vi.fn()}
        embedded
        googleActionTarget={actionTarget}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('canonical-space-editor')).toBeTruthy())
    expect(screen.getByTestId('canonical-space-editor').dataset.embedded).toBe('true')
    expect(screen.getByTestId('canonical-space-editor').dataset.googleTarget).toBe(
      'mission-actions',
    )
  })
})
