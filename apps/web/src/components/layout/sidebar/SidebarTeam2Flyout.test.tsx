import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('./useSidebarTeam2FlyoutData', () => ({
  useSidebarTeam2FlyoutData: () => ({
    create: vi.fn(),
    rename: vi.fn(),
    recolor: vi.fn(),
    reicon: vi.fn(),
    remove: vi.fn(),
    activeAgentKey: null,
    activeDmUserId: null,
    activeOrgId: 'org-1',
    agentsLoading: false,
    bootstrapLoading: false,
    canEditTeam: vi.fn(() => true),
    canManageOrgMembers: true,
    canManageTeamMembers: vi.fn(() => true),
    currentUserId: 'user-1',
    fallbackFetch: false,
    favoriteIds: new Set(),
    getAgentMenuContext: vi.fn(),
    getMemberByUserId: vi.fn(),
    handleRename: vi.fn(),
    loadOrgMembers: vi.fn(),
    markPersonDmRead: vi.fn(),
    people: [],
    peopleLoading: false,
    showOrgCollaboration: true,
    sortedAgents: [],
    sortedTeams: [],
    teamsLoading: false,
    unreadByPartnerId: {},
  }),
}))

vi.mock('./HomeCommunicationNav', () => ({ HomeCommunicationNav: () => null }))
vi.mock('./SidebarAgentDmRow', () => ({ SidebarAgentDmRow: () => null }))
vi.mock('./SidebarPersonRow', () => ({ SidebarPersonRow: () => null }))
vi.mock('./SidebarTeamRow', () => ({ SidebarTeamRow: () => null }))

describe('SidebarTeam2Flyout', () => {
  afterEach(() => {
    cleanup()
    mocks.searchParams = new URLSearchParams()
  })

  it('links directly to Manage People and marks it active', () => {
    mocks.searchParams = new URLSearchParams('section=people')

    render(<SidebarTeam2Flyout pathname="/team" embedded />)

    const link = screen.getByRole('link', { name: 'Manage People' })
    expect(link).toHaveAttribute('href', '/team?section=people')
    expect(link).toHaveClass('hub-dock-flyout-row-active')
    expect(screen.getByRole('link', { name: 'Manage Agents' })).not.toHaveClass(
      'hub-dock-flyout-row-active',
    )
  })
})
