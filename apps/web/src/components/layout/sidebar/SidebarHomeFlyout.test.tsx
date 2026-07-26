import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarHomeFlyout } from './SidebarHomeFlyout'

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
})
