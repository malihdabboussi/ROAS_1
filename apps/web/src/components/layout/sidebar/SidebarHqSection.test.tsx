import type { MouseEvent, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarHqSection } from './SidebarHqSection'
import type { SidebarControllerReturn } from './useSidebarController'

const mocks = vi.hoisted(() => ({
  setActiveSpace: vi.fn(),
  setSpacesState: vi.fn(),
  loadRoster: vi.fn(async () => undefined),
  mutateSpaces: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/layout/AvatarDropdown', () => ({
  AvatarDropdown: ({ displayName }: { displayName: string }) => (
    <div data-testid="avatar-dropdown">{displayName}</div>
  ),
}))

vi.mock('@/components/layout/SidebarCreditsHover', () => ({
  SidebarCreditsHover: () => <button type="button">Credits</button>,
}))

vi.mock('@/components/layout/sidebar/SidebarAddSpaceDropdown', () => ({
  SidebarAddSpaceDropdown: () => null,
}))

vi.mock('@/components/layout/sidebar/SidebarBrainFlyout', () => ({
  SidebarBrainFlyout: () => <div>Brain flyout</div>,
  SidebarBrainNavLinks: () => <div>Brain links</div>,
}))

vi.mock('@/components/layout/sidebar/SidebarCampaignMenuPortal', () => ({
  SidebarCampaignMenuPortal: () => null,
}))

vi.mock('@/components/layout/sidebar/SidebarHiddenFromSidebarDropdown', () => ({
  SidebarHiddenFromSidebarDropdown: () => null,
}))

vi.mock('@/components/layout/sidebar/SidebarSpaceContextMenu', () => ({
  SidebarSpaceContextMenu: () => null,
}))

vi.mock('@/components/layout/sidebar/SidebarTeam2Flyout', () => ({
  SidebarTeam2Flyout: () => <div>Team flyout</div>,
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground', glassClass: 'surface-card' }),
  IconPicker: ({ customTrigger }: { customTrigger?: ReactNode }) => (
    <button type="button">{customTrigger ?? 'Icon picker'}</button>
  ),
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div>{text ?? 'Loading'}</div>,
}))

vi.mock('@/components/org', () => ({
  ShareModal: () => null,
}))

vi.mock('@/features/org/store/use-org-store', () => {
  const state = {
    activeOrgId: null,
    memberships: [],
    isOrgContext: () => false,
  }
  return {
    useOrgStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
  }
})

vi.mock('@/features/projects/services/projects.service', () => ({
  renameProject: mocks.renameProject,
  deleteProject: mocks.deleteProject,
}))

vi.mock('@/components/ui/dialogs/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div role="dialog">{title}</div> : null,
}))

vi.mock('@/features/spaces/components/CreateSpaceModal', () => ({
  CreateSpaceModal: () => null,
}))

vi.mock('@/features/spaces/components/templates/SpaceTemplatesBrowsePanel', () => ({
  SpaceTemplatesBrowsePanel: () => null,
}))

vi.mock('@/features/spaces/hooks/use-cached-spaces', () => ({
  cachedSpaces: { mutate: mocks.mutateSpaces },
}))

vi.mock('@/features/spaces/hooks/use-space-user-state', () => ({
  sortSpacesWithFavoritesFirst: <T,>(spaces: T[]) => spaces,
  useSpaceUserState: () => ({
    favoriteIds: new Set<string>(),
    hiddenIds: new Set<string>(),
    isFavorite: () => false,
    isHidden: () => false,
    toggleFavorite: vi.fn(async () => undefined),
    toggleHidden: vi.fn(async () => undefined),
    unhide: vi.fn(async () => undefined),
  }),
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  createSpace: vi.fn(),
  deleteSpace: vi.fn(),
  updateSpace: vi.fn(),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => {
  const state = {
    activeSpaceId: 'space-1',
    setActiveSpace: mocks.setActiveSpace,
    loadRoster: mocks.loadRoster,
  }
  const useSpacesStore = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state
  useSpacesStore.getState = () => state
  useSpacesStore.setState = mocks.setSpacesState
  return { useSpacesStore }
})

vi.mock('@/features/team/components/CampaignTeamManageModal', () => ({
  CampaignTeamManageModal: () => null,
}))

vi.mock('@/components/transfer', () => ({
  TransferDialog: () => null,
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: vi.fn(),
}))

function makeController(
  overrides: Partial<Record<keyof SidebarControllerReturn, unknown>> = {},
): SidebarControllerReturn {
  const controller = {
    pathname: '/home',
    router: { push: vi.fn() },
    activeCampaignId: null,
    sidebarMode: 'hq',
    setActiveCampaign: vi.fn(),
    setSidebarMode: vi.fn(),
    minimizePanel: vi.fn(),
    expandPanel: vi.fn(),
    role: 'member',
    roleLoading: false,
    hasManageAccess: true,
    isAdmin: false,
    storeHydrated: true,
    mounted: true,
    mobileDrawerOpen: false,
    setMobileDrawerOpen: vi.fn(),
    collapsed: false,
    setCollapsed: vi.fn(),
    studioSearchOpen: false,
    setStudioSearchOpen: vi.fn(),
    campaigns: [],
    campaignsLoading: false,
    isFreePlan: false,
    expandedCampaignIds: new Set<string>(),
    setExpandedCampaignIds: vi.fn(),
    isCreatingProject: false,
    setIsCreatingProject: vi.fn(),
    isSubmittingProject: false,
    newProjectName: '',
    setNewProjectName: vi.fn(),
    isCreatingCampaign: false,
    setIsCreatingCampaign: vi.fn(),
    newCampaignName: '',
    setNewCampaignName: vi.fn(),
    newCampaignIcon: 'folder-kanban',
    setNewCampaignIcon: vi.fn(),
    showNewCampaignModal: false,
    setShowNewCampaignModal: vi.fn(),
    editingCampaign: null,
    setEditingCampaign: vi.fn(),
    sidebarProjects: [],
    setSidebarProjects: vi.fn(),
    sidebarLists: [],
    sidebarListsLoading: false,
    reloadSidebarLists: vi.fn(async () => undefined),
    sidebarListsHasMore: false,
    sidebarListsLoadingMore: false,
    loadMoreSidebarLists: vi.fn(async () => []),
    isCreatingList: false,
    setIsCreatingList: vi.fn(),
    newListName: '',
    setNewListName: vi.fn(),
    isSubmittingList: false,
    handleCreateList: vi.fn(async () => undefined),
    handleCreateListFull: vi.fn(async () => undefined),
    deletingCampaign: null,
    setDeletingCampaign: vi.fn(),
    campaignMenuId: null,
    setCampaignMenuId: vi.fn(),
    campaignMenuTriggerRef: { current: null },
    campaignMenuAnchorRect: null,
    menuOpenId: null,
    setMenuOpenId: vi.fn(),
    moveSubmenuOpenId: null,
    setMoveSubmenuOpenId: vi.fn(),
    convMenuTriggerRef: { current: null },
    convMenuPosition: { top: 0, left: 0 },
    renamingId: null,
    setRenamingId: vi.fn(),
    renameValue: '',
    setRenameValue: vi.fn(),
    campaignsFlyout: false,
    setCampaignsFlyout: vi.fn(),
    campaignsFlyoutRef: { current: null },
    agentsFlyout: false,
    setAgentsFlyout: vi.fn(),
    agentsFlyoutRef: { current: null },
    activeManagePanel: null,
    setActiveManagePanel: vi.fn(),
    isPanelClosing: false,
    setIsPanelClosing: vi.fn(),
    expandedSpaceCampaignIds: new Set<string>(),
    setExpandedSpaceCampaignIds: vi.fn(),
    conversations: [],
    activeConversationId: null,
    unreadConversationIds: new Set<string>(),
    setActiveConversationId: vi.fn(),
    displayName: 'Sefy',
    email: 'sefy@example.com',
    avatarUrl: null,
    initials: 'S',
    sortedCampaigns: [],
    generalCampaign: null,
    manageCampaigns: [],
    hiddenCampaigns: [],
    filteredConversations: [],
    desktopWidth: 'md:w-[72px]',
    isActive: vi.fn((href: string) => href === '/home'),
    handleCreateProject: vi.fn(async () => undefined),
    handleNewChat: vi.fn(),
    handleSelectCampaign: vi.fn(),
    handlePinCampaign: vi.fn(),
    patchCampaignConfig: vi.fn(async () => undefined),
    toggleFavoriteCampaign: vi.fn(async () => undefined),
    toggleHiddenCampaign: vi.fn(async () => undefined),
    archiveCampaignById: vi.fn(async () => undefined),
    handleDeleteCampaign: vi.fn(async () => undefined),
    handleSelectConversation: vi.fn(async () => undefined),
    handleStudioSearchSelect: vi.fn(),
    handleStartRename: vi.fn(),
    handleSubmitRename: vi.fn(async () => undefined),
    handleToggleFavorite: vi.fn(),
    handleMoveToCampaign: vi.fn(),
    handleDeleteConversation: vi.fn(async () => undefined),
    requestCreateCampaign: vi.fn(),
    handleCreateCampaignInline: vi.fn(async () => undefined),
    handleNewCampaignModalCreate: vi.fn(async () => undefined),
    ...overrides,
  }
  return controller as unknown as SidebarControllerReturn
}

describe('SidebarHqSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the mobile HQ rail and expands spaces from the drawer', () => {
    const setMobileDrawerOpen = vi.fn()
    const reloadSidebarLists = vi.fn(async () => undefined)
    const controller = makeController({
      mobileDrawerOpen: true,
      setMobileDrawerOpen,
      reloadSidebarLists,
      sidebarLists: [
        {
          id: 'space-1',
          title: 'Launch Space',
          user_id: 'user-1',
          org_id: 'org-1',
          campaign_id: null,
          visibility: 'team',
          schema: { fields: [], views: [], icon: 'layout-grid' },
          created_at: '2026-06-22T00:00:00.000Z',
          updated_at: '2026-06-22T00:00:00.000Z',
        },
      ],
    })

    render(
      <SidebarHqSection c={controller} featureUpdates={{ hasUnread: true, onOpen: vi.fn() }} />,
    )

    expect(screen.getByText('Home')).toBeTruthy()
    expect(screen.getByText('Team')).toBeTruthy()
    expect(screen.getByText('Spaces')).toBeTruthy()
    expect(screen.queryByText('Projects')).toBeNull()
    expect(screen.queryByText('Flows')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Spaces/ }))

    expect(reloadSidebarLists).toHaveBeenCalledTimes(1)
    expect(screen.getByText('New Space')).toBeTruthy()
    fireEvent.click(screen.getByText('Launch Space'))

    expect(mocks.setActiveSpace).toHaveBeenCalledWith('space-1')
    expect(setMobileDrawerOpen).toHaveBeenCalledWith(false)
  })

  it('renders the desktop projects panel and starts inline project creation', () => {
    const setIsCreatingProject = vi.fn()
    const controller = makeController({
      isAdmin: true,
      activeManagePanel: 'projects',
      pathname: '/projects/project-1',
      sidebarProjects: [{ id: 'project-1', name: 'Alpha Project' }],
      setIsCreatingProject,
    })

    render(<SidebarHqSection c={controller} />)

    expect(screen.getAllByText('Projects')).toHaveLength(2)
    expect(screen.getByText('Alpha Project')).toBeTruthy()

    fireEvent.click(screen.getByTitle('New Project'))

    expect(setIsCreatingProject).toHaveBeenCalledWith(true)
  })

  it('loads the next spaces page from the desktop spaces panel', () => {
    const loadMoreSidebarLists = vi.fn(async () => [])
    const controller = makeController({
      activeManagePanel: 'spaces',
      sidebarListsHasMore: true,
      loadMoreSidebarLists,
      sidebarLists: [
        {
          id: 'space-1',
          title: 'Launch Space',
          user_id: 'user-1',
          org_id: 'org-1',
          campaign_id: null,
          visibility: 'team',
          schema: { fields: [], views: [], icon: 'layout-grid' },
          created_at: '2026-06-22T00:00:00.000Z',
          updated_at: '2026-06-22T00:00:00.000Z',
        },
      ],
    })

    render(<SidebarHqSection c={controller} />)

    fireEvent.click(screen.getByRole('button', { name: 'Load more spaces' }))

    expect(loadMoreSidebarLists).toHaveBeenCalledTimes(1)
  })
})
