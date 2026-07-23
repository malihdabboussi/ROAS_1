import type { MouseEvent, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarHqSection } from './SidebarHqSection'
import { makeSidebarHqController } from './SidebarHqSection.test-support'

const mocks = vi.hoisted(() => ({
  setActiveSpace: vi.fn(),
  setSpacesState: vi.fn(),
  loadRoster: vi.fn(async () => undefined),
  mutateSpaces: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
  setActiveView: vi.fn(),
  fetchPrograms: vi.fn(async () => []),
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

vi.mock('@/lib/programs', () => ({
  fetchPrograms: mocks.fetchPrograms,
  createProgram: vi.fn(),
  updateProgram: vi.fn(),
  deleteProgram: vi.fn(),
}))

vi.mock('@/components/layout/AvatarDropdown', () => ({
  AvatarDropdown: ({ displayName }: { displayName: string }) => (
    <div data-testid="avatar-dropdown">{displayName}</div>
  ),
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

vi.mock('@/components/global-chat/store/use-global-chat-store', () => {
  const state = {
    collapsed: true,
    setCollapsed: vi.fn(),
    expandAndFocus: vi.fn(),
    setWorkContext: vi.fn(),
  }
  const useGlobalChatStore = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state
  useGlobalChatStore.getState = () => state
  return { useGlobalChatStore }
})

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
    spaces: [
      {
        id: 'space-1',
        title: 'Launch Space',
        campaign_id: 'campaign-1',
        schema: {
          views: [
            { id: 'all-artifacts', type: 'all_artifacts', name: 'All Artifacts' },
            { id: 'docs', type: 'docs', name: 'Docs' },
            { id: 'media', type: 'media', name: 'Media' },
          ],
        },
      },
    ],
    setActiveSpace: mocks.setActiveSpace,
    setActiveView: mocks.setActiveView,
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

describe('SidebarHqSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the mobile HQ hub menu drawer', () => {
    const setMobileDrawerOpen = vi.fn()
    const reloadSidebarLists = vi.fn(async () => undefined)
    const controller = makeSidebarHqController({
      mobileDrawerOpen: true,
      setMobileDrawerOpen,
      reloadSidebarLists,
      hubMenuExpandedSections: new Set(),
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
    expect(screen.getByText('Programs')).toBeTruthy()
    expect(screen.getByText('More')).toBeTruthy()
  })

  it('loads the next spaces page from the desktop spaces panel', async () => {
    const loadMoreSidebarLists = vi.fn(async () => [])
    const controller = makeSidebarHqController({
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Load more spaces' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Load more spaces' }))

    expect(loadMoreSidebarLists).toHaveBeenCalledTimes(1)
  })
})
