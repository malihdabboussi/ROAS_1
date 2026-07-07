import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StudioPresentationMenuDropdown } from './StudioPresentationMenuDropdown'

const actionsMock = vi.hoisted(() => ({
  campaigns: [],
  campaignsLoading: false,
  copyId: vi.fn(),
  rename: vi.fn(),
  duplicateInCurrentCampaign: vi.fn(),
  moveToCampaign: vi.fn(),
  copyToCampaign: vi.fn(),
  deletePresentation: vi.fn(),
  displayName: 'Studio Deck',
}))

vi.mock('@/lib/artifacts/use-presentation-menu-actions', () => ({
  usePresentationMenuActions: () => actionsMock,
}))

function renderStudioMenu() {
  const anchorRef = createRef<HTMLButtonElement>()
  let renderCount = 0
  const onClose = vi.fn()
  const onDeleted = vi.fn()

  function Harness() {
    renderCount += 1
    return (
      <>
        <button ref={anchorRef} type="button">
          anchor
        </button>
        <StudioPresentationMenuDropdown
          presentation={{ id: 'presentation-1', name: 'Studio Deck', campaign_id: null }}
          anchorRef={anchorRef}
          onClose={onClose}
          onDeleted={onDeleted}
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
  }
}

afterEach(() => {
  cleanup()
})

describe('StudioPresentationMenuDropdown', () => {
  beforeEach(() => {
    actionsMock.copyId.mockReset()
    actionsMock.rename.mockReset()
    actionsMock.duplicateInCurrentCampaign.mockReset()
    actionsMock.moveToCampaign.mockReset()
    actionsMock.copyToCampaign.mockReset()
    actionsMock.deletePresentation.mockReset()
    actionsMock.deletePresentation.mockResolvedValue(undefined)
  })

  it('mounts the shared menu and handles Studio delete confirmation without render churn', async () => {
    const { getRenderCount, onClose, onDeleted } = renderStudioMenu()

    expect(screen.getByText('Copy ID')).toBeTruthy()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(getRenderCount()).toBeLessThan(10)

    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete presentation?')).toBeTruthy()
    expect(screen.getByText(/Studio Deck/)).toBeTruthy()

    fireEvent.click(screen.getByText('Approve delete'))
    await waitFor(() => expect(actionsMock.deletePresentation).toHaveBeenCalledTimes(1))
    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
