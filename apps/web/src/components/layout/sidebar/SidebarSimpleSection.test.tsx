import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { useShellStore } from '@/components/shell/use-shell-store'
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
vi.mock('./SidebarProjectsFlyout', () => ({
  SidebarProjectsFlyout: () => <div>Projects flyout</div>,
}))
describe('SidebarSimpleSection', () => {
  beforeEach(() => {
    useShellMenuDock.setState({ menuStyle: 'simple', menuCompact: false })
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: null, width: 420, minimized: false },
      artifactViewer: { target: null, width: 480 },
    })
    programMocks.invalidateProgramsListCache.mockReset()
    programMocks.loadProgramsCached.mockReset().mockResolvedValue([])
    programMocks.updateProgramUserState.mockReset().mockResolvedValue({ is_favorite: false })
  })

  afterEach(cleanup)

  it('combines new chat, all primary navigation, favorites, and chats without More', () => {
    render(<SidebarSimpleSection c={makeSidebarHqController({ isAdmin: true })} />)

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
    expect(screen.getByRole('link', { name: 'Launches' })).toHaveAttribute('href', '/launches')
    expect(screen.getByRole('link', { name: 'Artifacts' })).toHaveAttribute('href', '/artifacts')
    expect(screen.getByRole('link', { name: 'All Tasks' })).toHaveAttribute('href', '/all-tasks')
    expect(screen.getByRole('link', { name: 'Programs' })).toHaveAttribute('href', '/programs')
    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/team')
    expect(screen.getByRole('link', { name: 'Brain' })).toHaveAttribute('href', '/brain')
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Flows' })).toHaveAttribute('href', '/flows')
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
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
    const controller = makeSidebarHqController({ isAdmin: true })
    const { container } = render(<SidebarSimpleSection c={controller} />)
    const newChat = screen.getByRole('button', { name: 'New chat' })

    expect(newChat.querySelector('svg')).toHaveClass('nav-glass-text-purple')
    fireEvent.click(newChat)
    expect(controller.router.push).toHaveBeenCalledWith('/home?chat=new')
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meetings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clients' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Client Campaigns' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Launches' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Artifacts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Programs' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Brain' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Flows' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
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

  it('opens a docked fresh chat beside a destination card', () => {
    const controller = makeSidebarHqController({ pathname: '/home/inbox' })
    const nonceBefore = useShellStore.getState().newChatNonce
    render(<SidebarSimpleSection c={controller} />)

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))

    expect(controller.router.push).not.toHaveBeenCalled()
    expect(useShellStore.getState().chatDrawer).toMatchObject({ open: true, conversationId: null })
    expect(useShellStore.getState().newChatNonce).toBe(nonceBefore + 1)
  })

  it('opens full-screen new chat when a chat is already visible', () => {
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: 'conv-1', width: 420, minimized: false },
    })
    const controller = makeSidebarHqController({ pathname: '/home/inbox' })
    render(<SidebarSimpleSection c={controller} />)

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))

    expect(controller.router.push).toHaveBeenCalledWith('/home?chat=new')
  })

  it('shows primary destinations without the open chat or artifact viewer', () => {
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: 'conv-1', width: 420, minimized: false },
      artifactViewer: {
        target: { id: 'doc-1', title: 'Plan', type: 'doc', conversationId: 'conv-1' },
        width: 480,
      },
      artifactPinned: true,
    })
    render(<SidebarSimpleSection c={makeSidebarHqController()} />)

    fireEvent.click(screen.getByRole('link', { name: 'Inbox' }))

    expect(useShellStore.getState().chatDrawer.open).toBe(false)
    expect(useShellStore.getState().artifactViewer.target).toBeNull()
    expect(useShellStore.getState().artifactPinned).toBe(false)
  })

  it('opens Projects directly from its sidebar row', () => {
    render(<SidebarSimpleSection c={makeSidebarHqController({ isAdmin: true })} />)
    const projects = screen.getByRole('button', { name: 'Projects' })

    expect(screen.queryByText('Projects flyout')).not.toBeInTheDocument()
    fireEvent.click(projects)
    expect(screen.getByText('Projects flyout')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })

  it('keeps Projects hidden for non-admin members', () => {
    render(<SidebarSimpleSection c={makeSidebarHqController({ isAdmin: false })} />)

    expect(screen.queryByRole('button', { name: 'Projects' })).not.toBeInTheDocument()
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
