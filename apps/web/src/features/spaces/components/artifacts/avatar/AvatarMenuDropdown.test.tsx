import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AvatarMenuDropdown } from './AvatarMenuDropdown'

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
  deleteAvatar: vi.fn(),
  displayName: 'Buyer Avatar',
}))

vi.mock('./use-avatar-menu-actions', () => ({
  useAvatarMenuActions: () => actionsMock,
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

  function Harness() {
    renderCount += 1
    return (
      <>
        <button ref={anchorRef} type="button">
          anchor
        </button>
        <AvatarMenuDropdown
          avatar={{ id: 'avatar-1', name: 'Buyer Avatar', campaign_id: 'campaign-1' }}
          anchorRef={anchorRef}
          onClose={onClose}
          onChanged={onChanged}
          onDeleted={onDeleted}
          onOpenFullView={onOpenFullView}
          pointerPosition={{ x: 120, y: 80 }}
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
  }
}

afterEach(() => {
  cleanup()
})

describe('AvatarMenuDropdown', () => {
  beforeEach(() => {
    actionsMock.copyId.mockReset()
    actionsMock.rename.mockReset()
    actionsMock.duplicateInCurrentCampaign.mockReset()
    actionsMock.moveToCampaign.mockReset()
    actionsMock.copyToCampaign.mockReset()
    actionsMock.deleteAvatar.mockReset()
    actionsMock.copyId.mockResolvedValue(undefined)
    actionsMock.rename.mockResolvedValue(undefined)
    actionsMock.duplicateInCurrentCampaign.mockResolvedValue(undefined)
    actionsMock.moveToCampaign.mockResolvedValue(undefined)
    actionsMock.copyToCampaign.mockResolvedValue(undefined)
    actionsMock.deleteAvatar.mockResolvedValue(undefined)
  })

  it('renders the current avatar menu actions and settles without render churn', () => {
    const { getRenderCount } = renderMenu()

    expect(screen.getByText('Copy ID')).toBeTruthy()
    expect(screen.getByText('Full screen view')).toBeTruthy()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Duplicate')).toBeTruthy()
    expect(screen.getByText('Copy to')).toBeTruthy()
    expect(screen.getByText('Move to')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(getRenderCount()).toBeLessThan(10)
  })

  it('delegates full-view, campaign, and delete actions', async () => {
    const { onClose, onDeleted, onOpenFullView } = renderMenu()

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
    expect(screen.getByText('Buyer Avatar')).toBeTruthy()

    fireEvent.click(screen.getByText('confirm delete'))
    await waitFor(() => expect(actionsMock.deleteAvatar).toHaveBeenCalledTimes(1))
    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalled()
  })
})
