import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { makeSidebarHqController } from './SidebarHqSection.test-support'
import { SidebarSimpleSection } from './SidebarSimpleSection'

const programMocks = vi.hoisted(() => ({
  invalidateProgramsListCache: vi.fn(),
  loadProgramsCached: vi.fn(async () => [] as Array<Record<string, unknown>>),
  updateProgramUserState: vi.fn(async () => ({ is_favorite: false })),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/components/shell/ShellChatMenu', () => ({
  ShellChatMenu: ({ navigationSlot }: { navigationSlot?: ReactNode }) => (
    <div>
      {navigationSlot}
      <div>Chat history</div>
    </div>
  ),
}))
vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: null }) => unknown) =>
    selector({ activeOrgId: null }),
}))
vi.mock('@/features/spaces/hooks/use-space-user-state', () => ({
  useSpaceUserState: () => ({ favoriteIds: new Set<string>() }),
}))
vi.mock('@/lib/programs', () => ({
  invalidateProgramsListCache: programMocks.invalidateProgramsListCache,
  loadProgramsCached: programMocks.loadProgramsCached,
  updateProgramUserState: programMocks.updateProgramUserState,
  programDisplayName: (program: { name: string; system_kind?: string | null }) =>
    program.system_kind === 'clients' ? 'Client Spaces' : program.name,
}))
vi.mock('./SidebarHqHubLogoButton', () => ({
  SidebarHqHubLogoButton: ({ expanded }: { expanded: boolean }) => (
    <button
      type="button"
      aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
      onClick={() => useShellMenuDock.getState().setMenuCompact(expanded)}
    >
      ROAS
    </button>
  ),
}))
vi.mock('./SidebarHqMoreFlyoutBody', () => ({
  SidebarHqMoreFlyoutBody: () => <div>More flyout</div>,
}))
describe('SidebarSimpleSection', () => {
  beforeEach(() => {
    useShellMenuDock.setState({ menuStyle: 'simple', menuCompact: false })
    programMocks.invalidateProgramsListCache.mockReset()
    programMocks.loadProgramsCached.mockReset().mockResolvedValue([])
    programMocks.updateProgramUserState.mockReset().mockResolvedValue({ is_favorite: false })
  })

  afterEach(cleanup)

  it('combines new chat, primary navigation, favorites, More, and chats', () => {
    render(<SidebarSimpleSection c={makeSidebarHqController()} />)

    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New chat' }).querySelector('svg')).toHaveClass(
      'nav-glass-text-purple',
    )
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse menu' })).toBeInTheDocument()
    expect(screen.queryByText('Search')).not.toBeInTheDocument()
    expect(screen.getByText('All Tasks')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/clients')
    expect(screen.getByRole('link', { name: 'Client Campaigns' })).toHaveAttribute(
      'href',
      '/client-campaigns',
    )
    expect(screen.getByRole('link', { name: 'All Tasks' })).toHaveAttribute('href', '/all-tasks')
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
    expect(screen.getByText('Chat history')).toBeInTheDocument()
  })

  it('left-aligns the expanded wordmark header and centers the compact R header', () => {
    const { rerender, container } = render(<SidebarSimpleSection c={makeSidebarHqController()} />)
    expect(container.querySelector('.hub-sidebar-logo-header-start')).toBeTruthy()
    expect(container.querySelector('.hub-sidebar-logo-header')).toBeTruthy()

    useShellMenuDock.setState({ menuStyle: 'simple', menuCompact: true })
    rerender(<SidebarSimpleSection c={makeSidebarHqController()} />)
    expect(container.querySelector('.hub-sidebar-logo-header-start')).toBeNull()
    expect(container.querySelector('.hub-sidebar-logo-header')).toBeTruthy()
  })

  it('keeps the collapsed rail closed on hover and expands it on click', () => {
    useShellMenuDock.setState({ menuStyle: 'simple', menuCompact: true })
    const controller = makeSidebarHqController()
    const { container } = render(<SidebarSimpleSection c={controller} />)
    const newChat = screen.getByRole('button', { name: 'New chat' })

    expect(newChat.querySelector('svg')).toHaveClass('nav-glass-text-purple')
    fireEvent.click(newChat)
    expect(controller.router.push).toHaveBeenCalledWith('/home')
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meetings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clients' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Client Campaigns' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show favorites' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show chats' })).not.toBeInTheDocument()
    expect(screen.queryByText('Chat history')).not.toBeInTheDocument()
    fireEvent.mouseEnter(container.firstElementChild as Element)
    expect(screen.queryByText('Chat history')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Expand menu' }))
    expect(screen.getByText('Chat history')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse menu' })).toBeInTheDocument()
    expect(screen.getByText('All Tasks')).toBeInTheDocument()
  })

  it('opens More only after the More row is clicked', () => {
    render(<SidebarSimpleSection c={makeSidebarHqController()} />)
    const more = screen.getByRole('button', { name: 'More' })

    fireEvent.mouseEnter(more)
    expect(screen.queryByText('More flyout')).not.toBeInTheDocument()
    fireEvent.click(more)
    expect(screen.getByText('More flyout')).toBeInTheDocument()
  })

  it('shows only campaigns explicitly favorited by the user', () => {
    render(
      <SidebarSimpleSection
        c={makeSidebarHqController({
          manageCampaigns: [
            {
              id: 'personal',
              name: 'Personal',
              isFavorite: false,
              isPinned: true,
            },
            {
              id: 'general',
              name: 'General',
              isFavorite: true,
              isPinned: true,
            },
          ],
        })}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Personal' })).not.toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'General' })).toBeInTheDocument()
  })

  it('removes a system Program from favorites and persists the user state', async () => {
    const personalProgram = {
      id: 'program-personal',
      org_id: null,
      user_id: 'user-1',
      name: 'Personal',
      slug: 'personal',
      system_kind: 'personal',
      icon: null,
      icon_color: null,
      sort_order: 0,
      config: {},
      visibility: 'private',
      created_by: 'user-1',
      created_at: '2026-08-11T00:00:00.000Z',
      updated_at: '2026-08-11T00:00:00.000Z',
      deleted_at: null,
      is_favorite: true,
    }
    programMocks.loadProgramsCached
      .mockResolvedValueOnce([personalProgram])
      .mockResolvedValue([{ ...personalProgram, is_favorite: false }])
    render(<SidebarSimpleSection c={makeSidebarHqController()} />)

    const personal = await screen.findByRole('link', { name: 'Personal' })
    fireEvent.contextMenu(personal, { clientX: 40, clientY: 60 })
    fireEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }))

    await waitFor(() => {
      expect(programMocks.updateProgramUserState).toHaveBeenCalledWith('program-personal', false)
    })
    expect(screen.queryByRole('link', { name: 'Personal' })).not.toBeInTheDocument()
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
  })
})
