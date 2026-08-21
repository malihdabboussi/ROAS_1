import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceMappingCell } from './SpaceMappingCell'

const mocks = vi.hoisted(() => ({
  transferItemToSpace: vi.fn(),
  useSpaceMappingGroups: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/work-items', () => ({
  transferItemToSpace: mocks.transferItemToSpace,
  useSpaceMappingGroups: mocks.useSpaceMappingGroups,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

const GROUPS = [
  {
    campaignId: 'campaign-1',
    campaignName: 'Launch',
    label: 'Acme Co · Launch',
    spaces: [{ id: 'space-2', title: 'Ad Production', visibility: 'team' as const }],
  },
]

describe('SpaceMappingCell', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the current mapping and relocates the item when a space is picked', async () => {
    mocks.useSpaceMappingGroups.mockReturnValue(GROUPS)
    mocks.transferItemToSpace.mockResolvedValue({})
    const onMoved = vi.fn()

    render(
      <SpaceMappingCell
        sourceSpaceId="space-1"
        itemId="item-1"
        itemTitle="Send recap"
        label="Meetings"
        pathLabel="Ops · General · Meetings"
        onMoved={onMoved}
      />,
    )

    const trigger = screen.getByRole('button', {
      name: 'Change mapping for Send recap — currently in Meetings',
    })
    expect(trigger).toHaveTextContent('Meetings')

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('button', { name: /Ad Production/ }))

    await waitFor(() => {
      expect(mocks.transferItemToSpace).toHaveBeenCalledWith('space-1', 'item-1', 'space-2')
      expect(onMoved).toHaveBeenCalledWith({ id: 'space-2', title: 'Ad Production' })
    })
  })

  it('surfaces an error toast when the transfer fails', async () => {
    mocks.useSpaceMappingGroups.mockReturnValue(GROUPS)
    mocks.transferItemToSpace.mockRejectedValue(new Error('nope'))
    const onMoved = vi.fn()

    render(
      <SpaceMappingCell
        sourceSpaceId="space-1"
        itemId="item-1"
        itemTitle="Send recap"
        label="Meetings"
        onMoved={onMoved}
        errorMessage="Could not move that task."
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change mapping for Send recap — currently in Meetings',
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: /Ad Production/ }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Could not move that task.')
      expect(onMoved).not.toHaveBeenCalled()
    })
  })
})
