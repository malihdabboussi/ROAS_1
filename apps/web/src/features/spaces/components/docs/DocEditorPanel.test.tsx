import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocEditorPanel } from './DocEditorPanel'

const mocks = vi.hoisted(() => ({
  activeSpaceId: 'space-1',
  storeUpdateItem: vi.fn(),
  updateSpaceItem: vi.fn(),
  docItemUpdateArgs: null as Record<string, unknown> | null,
  docBodyAutosaveArgs: null as Record<string, unknown> | null,
}))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('../../store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      updateItem: mocks.storeUpdateItem,
      activeSpaceId: mocks.activeSpaceId,
      items: [],
    }),
}))
vi.mock('@/lib/spaces', () => ({ updateSpaceItem: mocks.updateSpaceItem }))
vi.mock('./DocEditorPanelInner', () => ({
  DocEditorPanelInner: ({ docFieldsSectionOpen }: { docFieldsSectionOpen: boolean }) => (
    <div data-testid="doc-fields-state">{String(docFieldsSectionOpen)}</div>
  ),
}))
vi.mock('./DocEditorPanelPortalShell', () => ({
  DocEditorPanelPortalShell: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('./hooks/use-doc-panel-resize', () => ({
  useDocPanelResize: () => ({
    panelWidth: 800,
    isResizing: false,
    handleResizePointerDown: vi.fn(),
  }),
}))
vi.mock('./hooks/use-doc-slide-panel-exit', () => ({
  useDocSlidePanelExit: () => ({
    panelSlideExiting: false,
    requestClosePanel: vi.fn(),
    onSlideAnimationComplete: vi.fn(),
  }),
}))
vi.mock('./hooks/use-doc-item-update', () => ({
  useDocItemUpdate: (args: Record<string, unknown>) => {
    mocks.docItemUpdateArgs = args
    return vi.fn()
  },
}))
vi.mock('./hooks/use-doc-escape-key', () => ({ useDocEscapeKey: vi.fn() }))
vi.mock('./hooks/use-doc-cover-image', () => ({
  useDocCoverImage: () => ({
    coverRepositioning: false,
    setCoverRepositioning: vi.fn(),
    coverFocalY: 50,
    coverContainerRef: { current: null },
    handleCoverDragStart: vi.fn(),
    handleCoverDragMove: vi.fn(),
    handleCoverDragEnd: vi.fn(),
  }),
}))
vi.mock('./hooks/use-doc-body-autosave', () => ({
  useDocBodyAutosave: (args: Record<string, unknown>) => {
    mocks.docBodyAutosaveArgs = args
    return {
      saveStatus: 'saved',
      handleDocBodyChange: vi.fn(),
      flushDocBodyChange: vi.fn(),
      localDocBodyRef: { current: '' },
    }
  },
}))
vi.mock('./hooks/use-doc-tiptap-editor', () => ({ useDocTiptapEditor: () => null }))
vi.mock('./hooks/use-doc-floating-toolbar', () => ({
  useDocFloatingToolbar: () => ({ floatingToolbarPos: null }),
}))
vi.mock('./lib/doc-visual-hash', () => ({ hashDocSource: vi.fn().mockResolvedValue('hash') }))
vi.mock('./doc-image-insert-bridge', () => ({ registerDocImageInsertHandler: vi.fn() }))

const item = {
  id: 'doc-1',
  space_id: 'space-1',
  title: 'Launch plan',
  doc_body: '<p>Ship it.</p>',
  custom_data: { _view_type: 'doc' },
} as never

describe('DocEditorPanel', () => {
  afterEach(() => {
    cleanup()
    mocks.activeSpaceId = 'space-1'
    mocks.storeUpdateItem.mockReset()
    mocks.updateSpaceItem.mockReset()
    mocks.docItemUpdateArgs = null
    mocks.docBodyAutosaveArgs = null
  })

  it('opens each document with Fields collapsed', () => {
    render(
      <DocEditorPanel
        item={item}
        categoryField={null}
        allFields={[]}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    )

    expect(screen.getByTestId('doc-fields-state').textContent).toBe('false')
  })

  it('routes saves through the document owning Space when opened outside the active Space', async () => {
    const otherSpaceItem = {
      id: 'doc-1',
      space_id: 'space-2',
      title: 'Launch plan',
      doc_body: '<p>Ship it.</p>',
      custom_data: { _view_type: 'doc' },
    } as never

    render(
      <DocEditorPanel
        item={otherSpaceItem}
        categoryField={null}
        allFields={[]}
        spaceIdOverride="space-2"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    )

    expect(mocks.docBodyAutosaveArgs?.activeSpaceId).toBe('space-2')
    const updateItem = mocks.docItemUpdateArgs?.storeUpdateItem as (
      itemId: string,
      patch: Record<string, unknown>,
    ) => Promise<void>
    await updateItem('doc-1', { title: 'Updated title' })

    expect(mocks.updateSpaceItem).toHaveBeenCalledWith('space-2', 'doc-1', {
      title: 'Updated title',
    })
    expect(mocks.storeUpdateItem).not.toHaveBeenCalled()
  })
})
