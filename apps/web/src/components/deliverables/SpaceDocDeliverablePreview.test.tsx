import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceDocDeliverablePreview } from './SpaceDocDeliverablePreview'

vi.mock('@/components/spaces/SpaceDocEditorPanelAdapter', () => ({
  SpaceDocEditorPanelAdapter: ({
    target,
    embedded,
    googleActionTarget,
  }: {
    target: { id: string; spaceId?: string; title: string }
    embedded?: boolean
    googleActionTarget?: HTMLElement | null
  }) => (
    <div
      data-testid="canonical-space-editor"
      data-item-id={target.id}
      data-space-id={target.spaceId}
      data-title={target.title}
      data-embedded={String(embedded)}
      data-google-target={googleActionTarget?.dataset.testid ?? ''}
    />
  ),
}))

describe('SpaceDocDeliverablePreview', () => {
  afterEach(cleanup)

  it('uses the canonical editable Space editor inside deliverable chrome', () => {
    const googleActionTarget = document.createElement('div')
    googleActionTarget.dataset.testid = 'google-action'

    render(
      <SpaceDocDeliverablePreview
        spaceId="space-1"
        itemId="item-1"
        title="Strategy map"
        googleActionTarget={googleActionTarget}
      />,
    )

    const editor = screen.getByTestId('canonical-space-editor')
    expect(editor.dataset.itemId).toBe('item-1')
    expect(editor.dataset.spaceId).toBe('space-1')
    expect(editor.dataset.title).toBe('Strategy map')
    expect(editor.dataset.embedded).toBe('true')
    expect(editor.dataset.googleTarget).toBe('google-action')
  })

  it('exports the loaded native doc to Google Docs and preserves Space metadata', async () => {
    const replace = vi.fn()
    const open = vi.spyOn(window, 'open').mockReturnValue({
      close: vi.fn(),
      location: { replace },
      opener: null,
    } as unknown as Window)
    previewMocks.fetchSpaceItemById.mockResolvedValue({
      ...baseSpaceItem,
      doc_body: '<p>Source body</p>',
      custom_data: { existing: 'value' },
    })
    previewMocks.createGoogleDocFromHtml.mockResolvedValue({
      success: true,
      file: {
        id: 'google-doc-1',
        name: 'Doc title',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: 'https://docs.google.com/document/d/google-doc-1/edit',
      },
    })
    previewMocks.updateSpaceItem.mockResolvedValue(baseSpaceItem)

    renderPreview()
    await waitFor(() => expect(screen.getByText('Source body')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Export to Google Docs' }))

    await waitFor(() =>
      expect(previewMocks.createGoogleDocFromHtml).toHaveBeenCalledWith(
        'Doc title',
        expect.stringContaining('<p>Source body</p>'),
      ),
    )
    expect(previewMocks.updateSpaceItem).toHaveBeenCalledWith('space-1', 'item-1', {
      custom_data: expect.objectContaining({
        existing: 'value',
        _google_doc_file_id: 'google-doc-1',
      }),
    })
    expect(replace).toHaveBeenCalledWith('https://docs.google.com/document/d/google-doc-1/edit')
    expect(previewMocks.toastSuccess).toHaveBeenCalledWith('Google Doc created.')
    open.mockRestore()
  })
})
