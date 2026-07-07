import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SpaceDocDeliverablePreview } from './SpaceDocDeliverablePreview'

const previewMocks = vi.hoisted(() => ({
  exportSpaceDocVisualPdf: vi.fn(),
  fetchDocument: vi.fn(),
  fetchSpaceItem: vi.fn(),
  fetchSpaceItemById: vi.fn(),
  hashDocSource: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  visualizeSpaceDoc: vi.fn(),
  visualDocRenderCount: 0,
}))

vi.mock('@/lib/artifacts', () => ({
  fetchDocument: previewMocks.fetchDocument,
}))

vi.mock('@/components/spaces', () => ({
  DriveDocViewer: ({ driveFileId }: { driveFileId: string }) => (
    <div data-testid="drive-doc-viewer">{driveFileId}</div>
  ),
  DocEditorProseStyles: () => <div data-testid="doc-editor-prose-styles" />,
  VisualDocView: ({
    html,
    status,
    hasDocBody,
    isVisualizing,
  }: {
    html: string | null
    status: string
    hasDocBody: boolean
    isVisualizing: boolean
  }) => {
    previewMocks.visualDocRenderCount += 1
    return (
      <div
        data-testid="visual-doc-view"
        data-html={html ?? ''}
        data-status={status}
        data-has-doc-body={hasDocBody ? 'true' : 'false'}
        data-is-visualizing={isVisualizing ? 'true' : 'false'}
      />
    )
  },
}))

vi.mock('@/lib/spaces', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/spaces')
  return {
    ...actual,
    fetchSpaceItem: previewMocks.fetchSpaceItem,
    fetchSpaceItemById: previewMocks.fetchSpaceItemById,
    exportSpaceDocVisualPdf: previewMocks.exportSpaceDocVisualPdf,
    hashDocSource: previewMocks.hashDocSource,
    visualizeSpaceDoc: previewMocks.visualizeSpaceDoc,
  }
})

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <div data-testid="loading-orb" />,
}))

vi.mock('sonner', () => ({
  toast: {
    error: previewMocks.toastError,
    success: previewMocks.toastSuccess,
  },
}))

const baseSpaceItem = {
  id: 'item-1',
  space_id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Doc title',
  status: 'done',
  priority: null,
  assignee_type: 'unassigned',
  assignee_id: null,
  assignees: [],
  start_date: null,
  due_date: null,
  recurrence: null,
  parent_item_id: null,
  recurrence_parent_id: null,
  description: null,
  notes: null,
  doc_body: null,
  source: 'agent',
  linked_mission_id: null,
  form_id: null,
  task_execution_status: null,
  is_private: false,
  share_link_enabled: false,
  share_token: null,
  sort_order: 0,
  custom_data: {},
  created_at: '2026-06-28T10:40:00.000Z',
  updated_at: '2026-06-28T10:40:00.000Z',
}

function renderPreview() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return (
      <SpaceDocDeliverablePreview
        spaceId="space-1"
        itemId="item-1"
        title="Doc title"
      />
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('SpaceDocDeliverablePreview', () => {
  beforeEach(() => {
    for (const mock of Object.values(previewMocks)) {
      if (typeof mock === 'function' && 'mockReset' in mock) {
        mock.mockReset()
      }
    }
    previewMocks.visualDocRenderCount = 0
    previewMocks.hashDocSource.mockResolvedValue('doc-body-hash')
  })

  afterEach(() => {
    cleanup()
  })

  it('loads linked conversation document content and settles without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    previewMocks.fetchSpaceItemById.mockResolvedValue({
      ...baseSpaceItem,
      custom_data: { _conversation_document_id: 'document-1' },
    })
    previewMocks.fetchDocument.mockResolvedValue({
      id: 'document-1',
      content: { markdown: '# Linked Doc\n\nBody copy' },
    })

    const { getRenderCount } = renderPreview()

    expect(screen.getByTestId('loading-orb')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Linked Doc')).toBeTruthy())

    expect(previewMocks.fetchSpaceItemById).toHaveBeenCalledWith('item-1', 'Doc title')
    expect(previewMocks.fetchSpaceItem).not.toHaveBeenCalled()
    expect(previewMocks.fetchDocument).toHaveBeenCalledWith('document-1')
    expect(screen.getByText('Body copy')).toBeTruthy()

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(30)
    consoleErrorSpy.mockRestore()
  })

  it('falls back to the space item endpoint when direct lookup fails', async () => {
    previewMocks.fetchSpaceItemById.mockRejectedValue(new Error('not found'))
    previewMocks.fetchSpaceItem.mockResolvedValue({
      ...baseSpaceItem,
      doc_body: '<p>Fallback body</p>',
    })

    renderPreview()

    await waitFor(() => expect(screen.getByText('Fallback body')).toBeTruthy())

    expect(previewMocks.fetchSpaceItemById).toHaveBeenCalledWith('item-1', 'Doc title')
    expect(previewMocks.fetchSpaceItem).toHaveBeenCalledWith('space-1', 'item-1')
    expect(previewMocks.fetchDocument).not.toHaveBeenCalled()
  })

  it('visualizes doc content from the Visual tab and settles without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    previewMocks.fetchSpaceItemById.mockResolvedValue({
      ...baseSpaceItem,
      doc_body: '<p>Source body</p>',
    })
    previewMocks.visualizeSpaceDoc.mockResolvedValue({
      success: true,
      item_id: 'item-1',
      space_id: 'space-1',
      title: 'Doc title',
      html: '<main>Visual</main>',
      source_hash: 'visual-hash',
      custom_data: {
        _doc_visual_html: '<main>Visual</main>',
        _doc_visual_status: 'ready',
        _doc_visual_source_hash: 'visual-hash',
      },
    })

    const { getRenderCount } = renderPreview()

    await waitFor(() => expect(screen.getByText('Source body')).toBeTruthy())

    fireEvent.click(screen.getByRole('tab', { name: 'Visual' }))
    await waitFor(() => expect(screen.getByTestId('visual-doc-view')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Visualize' }))

    await waitFor(() =>
      expect(previewMocks.visualizeSpaceDoc).toHaveBeenCalledWith('space-1', 'item-1', {
        force: true,
      }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('visual-doc-view').dataset.html).toBe('<main>Visual</main>'),
    )

    expect(previewMocks.toastSuccess).toHaveBeenCalledWith('Visual doc is ready.')
    expect(screen.getByTestId('visual-doc-view').dataset.status).toBe('ready')
    expect(screen.getByTestId('visual-doc-view').dataset.hasDocBody).toBe('true')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(40)
    expect(previewMocks.visualDocRenderCount).toBeLessThan(20)
    consoleErrorSpy.mockRestore()
  })
})
