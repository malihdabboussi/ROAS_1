import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormMenuDropdown } from './FormMenuDropdown'

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
      created_at: '2026-06-28T00:00:00.000Z',
      updated_at: '2026-06-28T00:00:00.000Z',
    },
    {
      id: 'campaign-2',
      user_id: 'user-1',
      name: 'Follow-up',
      campaign_type: 'standard',
      status: 'active',
      config: { icon: 'clipboard-list' },
      metrics: {},
      created_at: '2026-06-28T00:00:00.000Z',
      updated_at: '2026-06-28T00:00:00.000Z',
    },
  ],
  campaignsLoading: false,
  isPublished: true,
  liveUrl: 'https://forms.example/lead',
  embedSnippet: '<iframe />',
  displayName: 'Lead form',
  copyLink: vi.fn(),
  copyId: vi.fn(),
  copyEmbedCode: vi.fn(),
  openInNewTab: vi.fn(),
  rename: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  duplicateInCurrentCampaign: vi.fn(),
  moveToCampaign: vi.fn(),
  copyToCampaign: vi.fn(),
  goToTargetSpace: vi.fn(),
  exportResponsesCsv: vi.fn(),
  deleteForm: vi.fn(),
}))

vi.mock('./use-form-menu-actions', () => ({
  useFormMenuActions: () => actionsMock,
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
  const onOpenFullView = vi.fn()
  const onOpenSettings = vi.fn()
  const onOpenResponses = vi.fn()
  const onRequestRename = vi.fn()

  function Harness() {
    renderCount += 1
    return (
      <>
        <button ref={anchorRef} type="button">
          anchor
        </button>
        <FormMenuDropdown
          form={{
            id: 'form-1',
            name: 'Lead form',
            status: 'published',
            share_token: 'share-token',
            visibility: 'public',
            published_url: 'https://forms.example/lead',
            campaign_id: 'campaign-1',
            space_id: 'space-1',
            target_space_id: 'space-2',
          }}
          anchorRef={anchorRef}
          onClose={onClose}
          onChanged={onChanged}
          onOpenFullView={onOpenFullView}
          onOpenSettings={onOpenSettings}
          onOpenResponses={onOpenResponses}
          onRequestRename={onRequestRename}
          pointerPosition={{ x: 120, y: 80 }}
        />
      </>
    )
  }

  render(<Harness />)

  return {
    getRenderCount: () => renderCount,
    onClose,
    onOpenFullView,
    onOpenSettings,
    onOpenResponses,
    onRequestRename,
  }
}

afterEach(() => {
  cleanup()
})

describe('FormMenuDropdown', () => {
  beforeEach(() => {
    actionsMock.copyLink.mockReset()
    actionsMock.copyId.mockReset()
    actionsMock.copyEmbedCode.mockReset()
    actionsMock.openInNewTab.mockReset()
    actionsMock.rename.mockReset()
    actionsMock.publish.mockReset()
    actionsMock.unpublish.mockReset()
    actionsMock.duplicateInCurrentCampaign.mockReset()
    actionsMock.moveToCampaign.mockReset()
    actionsMock.copyToCampaign.mockReset()
    actionsMock.goToTargetSpace.mockReset()
    actionsMock.exportResponsesCsv.mockReset()
    actionsMock.deleteForm.mockReset()
    actionsMock.copyLink.mockResolvedValue(undefined)
    actionsMock.copyId.mockResolvedValue(undefined)
    actionsMock.copyEmbedCode.mockResolvedValue(undefined)
    actionsMock.rename.mockResolvedValue(undefined)
    actionsMock.publish.mockResolvedValue(undefined)
    actionsMock.unpublish.mockResolvedValue(undefined)
    actionsMock.duplicateInCurrentCampaign.mockResolvedValue(undefined)
    actionsMock.moveToCampaign.mockResolvedValue(undefined)
    actionsMock.copyToCampaign.mockResolvedValue(undefined)
    actionsMock.exportResponsesCsv.mockResolvedValue(undefined)
    actionsMock.deleteForm.mockResolvedValue(undefined)
  })

  it('renders the current form menu actions and settles without render churn', () => {
    const { getRenderCount } = renderMenu()

    expect(screen.getByText('Copy link')).toBeTruthy()
    expect(screen.getByText('Copy ID')).toBeTruthy()
    expect(screen.getByText('New tab')).toBeTruthy()
    expect(screen.getByText('Full screen view')).toBeTruthy()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Form settings')).toBeTruthy()
    expect(screen.getByText('Unpublish')).toBeTruthy()
    expect(screen.getByText('Copy embed code')).toBeTruthy()
    expect(screen.getByText('View responses')).toBeTruthy()
    expect(screen.getByText('Export responses (CSV)')).toBeTruthy()
    expect(screen.getByText('Go to target space')).toBeTruthy()
    expect(screen.getByText('Duplicate')).toBeTruthy()
    expect(screen.getByText('Copy to')).toBeTruthy()
    expect(screen.getByText('Move to')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(getRenderCount()).toBeLessThan(10)
  })

  it('delegates menu, campaign, and delete actions', async () => {
    const {
      onClose,
      onOpenFullView,
      onOpenSettings,
      onOpenResponses,
      onRequestRename,
    } = renderMenu()

    fireEvent.click(screen.getByText('Copy link'))
    fireEvent.click(screen.getByText('Copy ID'))
    fireEvent.click(screen.getByText('New tab'))
    fireEvent.click(screen.getByText('Full screen view'))
    fireEvent.click(screen.getByText('Rename'))
    fireEvent.click(screen.getByText('Form settings'))
    fireEvent.click(screen.getByText('Unpublish'))
    fireEvent.click(screen.getByText('Copy embed code'))
    fireEvent.click(screen.getByText('View responses'))
    fireEvent.click(screen.getByText('Export responses (CSV)'))
    fireEvent.click(screen.getByText('Go to target space'))
    fireEvent.click(screen.getByText('Duplicate'))

    await waitFor(() => expect(actionsMock.copyLink).toHaveBeenCalledTimes(1))
    expect(actionsMock.copyId).toHaveBeenCalledTimes(1)
    expect(actionsMock.openInNewTab).toHaveBeenCalledTimes(1)
    expect(onOpenFullView).toHaveBeenCalledTimes(1)
    expect(onRequestRename).toHaveBeenCalledTimes(1)
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(actionsMock.unpublish).toHaveBeenCalledTimes(1)
    expect(actionsMock.copyEmbedCode).toHaveBeenCalledTimes(1)
    expect(onOpenResponses).toHaveBeenCalledTimes(1)
    expect(actionsMock.exportResponsesCsv).toHaveBeenCalledTimes(1)
    expect(actionsMock.goToTargetSpace).toHaveBeenCalledTimes(1)
    expect(actionsMock.duplicateInCurrentCampaign).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Copy to'))
    fireEvent.click(screen.getByText('Follow-up'))
    expect(actionsMock.copyToCampaign).toHaveBeenCalledWith('campaign-2')

    fireEvent.click(screen.getByText('Move to'))
    fireEvent.click(screen.getByText('Follow-up'))
    expect(actionsMock.moveToCampaign).toHaveBeenCalledWith('campaign-2')

    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByTestId('delete-confirm')).toBeTruthy()
    expect(screen.getByText('Lead form')).toBeTruthy()

    fireEvent.click(screen.getByText('confirm delete'))
    await waitFor(() => expect(actionsMock.deleteForm).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalled()
  })
})
