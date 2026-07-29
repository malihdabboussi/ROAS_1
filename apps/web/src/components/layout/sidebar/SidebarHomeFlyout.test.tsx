import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarHomeFlyout } from './SidebarHomeFlyout'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  ensureDelegationDesk: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/features/spaces/services/delegation-desk.service', () => ({
  ensureDelegationDesk: mocks.ensureDelegationDesk,
  findDelegationDesk: (spaces: Space[]) =>
    spaces.find((space) =>
      Boolean(
        (space.schema as typeof space.schema & { delegation_desk?: boolean }).delegation_desk,
      ),
    ) ?? null,
}))

const favoriteCampaign: SidebarCampaignRow = {
  id: 'campaign-1',
  name: 'Client delivery',
  icon: 'folder',
  isPinned: true,
  isSystemGeneral: false,
  isSystemPersonal: false,
  isFavorite: false,
  isHidden: false,
  program_id: null,
  config: {},
  created_at: '2026-07-26T00:00:00.000Z',
}

const favoriteSpace = {
  id: 'space-1',
  title: 'Weekly shipments',
} as Space

describe('SidebarHomeFlyout', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders every Home destination and marks the nested route active', () => {
    render(<SidebarHomeFlyout pathname="/home/meetings" />)

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/home')
    expect(screen.getByRole('link', { name: 'Inbox' }).getAttribute('href')).toBe('/home/inbox')
    expect(screen.getByRole('link', { name: 'My Tasks' }).getAttribute('href')).toBe(
      '/home/my-tasks',
    )
    expect(
      screen
        .getByRole('link', { name: 'Meetings' })
        .classList.contains('hub-dock-flyout-row-active'),
    ).toBe(true)
    expect(
      screen.getByRole('link', { name: 'Home' }).classList.contains('hub-dock-flyout-row-active'),
    ).toBe(false)
  })

  it('shows real pinned campaigns and favorite Spaces below Home destinations', () => {
    render(
      <SidebarHomeFlyout
        pathname="/home"
        favoriteCampaigns={[favoriteCampaign]}
        favoriteSpaces={[favoriteSpace]}
      />,
    )

    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Client delivery' })).toHaveAttribute(
      'href',
      '/campaigns/campaign-1',
    )
    expect(screen.getByRole('link', { name: 'Weekly shipments' })).toHaveAttribute(
      'href',
      '/spaces',
    )
  })

  it('always exposes the complete Delegation Desk and opens the existing desk', async () => {
    const desk = {
      id: 'desk-1',
      title: 'Delegation Desk',
      schema: { delegation_desk: true },
    } as unknown as Space
    mocks.ensureDelegationDesk.mockResolvedValue({ desk, createdDesk: false })

    render(<SidebarHomeFlyout pathname="/home/my-tasks" spaces={[desk]} />)

    const delegationDeskButton = screen.getByRole('button', { name: 'Delegation Desk' })
    expect(delegationDeskButton).toHaveClass('text-left')
    fireEvent.click(delegationDeskButton)

    await waitFor(() => {
      expect(mocks.ensureDelegationDesk).toHaveBeenCalledWith([desk])
      expect(mocks.push).toHaveBeenCalledWith('/spaces?space=desk-1')
    })
  })
})
