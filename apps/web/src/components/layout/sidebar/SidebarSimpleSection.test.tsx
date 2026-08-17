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
  SidebarHqHubLogoButton: () => (
    <button type="button" onClick={() => useShellMenuDock.getState().setMenuCompact(false)}>
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
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse menu' })).toBeInTheDocument()
    expect(screen.queryByText('Search')).not.toBeInTheDocument()
    expect(screen.getByText('My Tasks')).toBeInTheDocument()
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

  it('keeps the collapsed rail closed on hover and expands it on click', () => {
    useShellMenuDock.setState({ menuStyle: 'simple', menuCompact: true })
    const { container } = render(<SidebarSimpleSection c={makeSidebarHqController()} />)

    expect(screen.queryByText('My Tasks')).not.toBeInTheDocument()
    fireEvent.mouseEnter(container.firstElementChild as Element)
    expect(screen.queryByText('My Tasks')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ROAS' }))
    expect(screen.getByText('My Tasks')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse menu' })).toBeInTheDocument()
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
