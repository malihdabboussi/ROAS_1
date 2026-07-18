import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationMenuDropdown } from './PresentationMenuDropdown'

const actionsMock = vi.hoisted(() => ({
  campaigns: [
    {
      id: 'campaign-1',
      user_id: 'user-1',
      name: 'Launch',
      campaign_type: 'standard',
      status: 'active',
      config: {},
      metrics: {},
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
    },
    {
      id: 'campaign-2',
      user_id: 'user-1',
      name: 'Sales',
      campaign_type: 'standard',
      status: 'active',
      config: { icon: 'megaphone' },
      metrics: {},
      created_at: '2026-06-27T00:00:00.000Z',
      updated_at: '2026-06-27T00:00:00.000Z',
    },
  ],
  campaignsLoading: false,
  copyId: vi.fn(),
  rename: vi.fn(),
  duplicateInCurrentCampaign: vi.fn(),
  moveToCampaign: vi.fn(),
  copyToCampaign: vi.fn(),
  deletePresentation: vi.fn(),
  displayName: 'Launch Deck',
}))

vi.mock('./use-presentation-menu-actions', () => ({
  usePresentationMenuActions: () => actionsMock,
}))

vi.mock('../SpacesArtifactDeleteConfirmModal', () => ({
  SpacesArtifactDeleteConfirmModal: ({
    entityName,
    onConfirm,
    open,
  }: {
    entityName: string
    onConfirm: () => void | Promise<void>
    open: boolean
  }) =>
    open ? (
      <div data-testid="delete-confirm">
        <span>{entityName}</span>
        <button type="button" onClick={() => void onConfirm()}>
          confirm delete
        </button>
      </div>
    ) : null,
}))

function renderMenu() {
  const anchorRef = createRef<HTMLButtonElement>()
  let renderCount = 0
  const onClose = vi.fn()
  const onChanged = vi.fn()
  const onDeleted = vi.fn()
  const onOpenFullView = vi.fn()
  const onViewportChange = vi.fn()
  const onCopyDownloadLink = vi.fn()
  const onDownloadHtml = vi.fn()
  const onExportPdf = vi.fn()
  const onExportPpt = vi.fn()
  const onOpenCanva = vi.fn()

  function Harness() {
    renderCount += 1
    return (
      <>
        <button ref={anchorRef} type="button">
          anchor
        </button>
        <PresentationMenuDropdown
          presentation={{ id: 'presentation-1', name: 'Launch Deck', campaign_id: 'campaign-1' }}
          anchorRef={anchorRef}
          onClose={onClose}
          onChanged={onChanged}
          onDeleted={onDeleted}
          onOpenFullView={onOpenFullView}
          pointerPosition={{ x: 120, y: 80 }}
          previewOverflow={{
            viewport: 'desktop',
            onViewportChange,
            fileUrl: 'https://example.com/launch.html',
            exporting: null,
            copied: false,
            onCopyDownloadLink,
            onDownloadHtml,
            onExportPdf,
            onExportPpt,
            openingCanva: false,
            onOpenCanva,
          }}
        />
      </>
    )
  }

  render(<Harness />)

  return {
    getRenderCount: () => renderCount,
    onClose,
    onDeleted,
    onOpenFullView,
    onViewportChange,
    onCopyDownloadLink,
    onDownloadHtml,
    onExportPdf,
    onExportPpt,
    onOpenCanva,
  }
}

afterEach(() => {
  cleanup()
})

describe('PresentationMenuDropdown', () => {
  beforeEach(() => {
    actionsMock.copyId.mockReset()
    actionsMock.rename.mockReset()
    actionsMock.duplicateInCurrentCampaign.mockReset()
    actionsMock.moveToCampaign.mockReset()
    actionsMock.copyToCampaign.mockReset()
    actionsMock.deletePresentation.mockReset()
    actionsMock.copyId.mockResolvedValue(undefined)
    actionsMock.rename.mockResolvedValue(undefined)
    actionsMock.duplicateInCurrentCampaign.mockResolvedValue(undefined)
    actionsMock.moveToCampaign.mockResolvedValue(undefined)
    actionsMock.copyToCampaign.mockResolvedValue(undefined)
    actionsMock.deletePresentation.mockResolvedValue(undefined)
  })

  it('renders the current presentation menu actions and settles without render churn', () => {
    const { getRenderCount } = renderMenu()

    expect(screen.getByText('Copy ID')).toBeTruthy()
    expect(screen.getByText('Preview size')).toBeTruthy()
    expect(screen.getByText('Export')).toBeTruthy()
    expect(screen.getByText('Full screen view')).toBeTruthy()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Duplicate')).toBeTruthy()
    expect(screen.getByText('Copy to')).toBeTruthy()
    expect(screen.getByText('Move to')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(getRenderCount()).toBeLessThan(10)
  })

  it('delegates preview, export, campaign, and delete actions', async () => {
    const {
      onClose,
      onDeleted,
      onOpenFullView,
      onViewportChange,
      onCopyDownloadLink,
      onDownloadHtml,
      onExportPdf,
      onExportPpt,
      onOpenCanva,
    } = renderMenu()

    fireEvent.click(screen.getByText('Preview size'))
    fireEvent.click(screen.getByText('Tablet'))
    expect(onViewportChange).toHaveBeenCalledWith('tablet')
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Export'))
    fireEvent.click(screen.getByText('Copy download link'))
    expect(onCopyDownloadLink).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Download HTML'))
    expect(onDownloadHtml).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Export as PDF'))
    expect(onExportPdf).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Export as PPT'))
    expect(onExportPpt).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Open in Canva'))
    expect(onOpenCanva).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Full screen view'))
    expect(onOpenFullView).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Copy to'))
    fireEvent.click(screen.getByText('Sales'))
    expect(actionsMock.copyToCampaign).toHaveBeenCalledWith('campaign-2')

    fireEvent.click(screen.getByText('Move to'))
    fireEvent.click(screen.getByText('Sales'))
    expect(actionsMock.moveToCampaign).toHaveBeenCalledWith('campaign-2')

    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByTestId('delete-confirm')).toBeTruthy()
    expect(screen.getByText('Launch Deck')).toBeTruthy()

    fireEvent.click(screen.getByText('confirm delete'))
    await waitFor(() => expect(actionsMock.deletePresentation).toHaveBeenCalledTimes(1))
    expect(onDeleted).toHaveBeenCalledTimes(1)
  })
})
