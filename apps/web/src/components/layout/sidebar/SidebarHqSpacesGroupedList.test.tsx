import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import type { SidebarControllerReturn } from './useSidebarController'

const mocks = vi.hoisted(() => ({
  loadRoster: vi.fn(async () => undefined),
  setActiveSpace: vi.fn(),
  fetchPrograms: vi.fn(async () => [
    {
      id: 'prog-clients',
      name: 'Clients',
      slug: 'clients',
      system_kind: 'clients',
      icon: 'folder-kanban',
      icon_color: 'default',
      sort_order: 0,
      org_id: 'org-1',
      user_id: null,
      config: {},
      created_at: '',
      updated_at: '',
      deleted_at: null,
    },
  ]),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: {
    getState: () => ({ setCollapsed: vi.fn() }),
  },
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground' }),
  IconPicker: ({ customTrigger }: { customTrigger?: ReactNode }) => (
    <button type="button">{customTrigger ?? 'icon'}</button>
  ),
  LucideIcon: () => <span aria-hidden />,
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/features/spaces/hooks/use-cached-spaces', () => ({
  cachedSpaces: { mutate: vi.fn() },
}))

vi.mock('@/features/spaces/hooks/use-space-user-state', () => ({
  sortSpacesWithFavoritesFirst: <T,>(spaces: T[]) => spaces,
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  updateSpace: vi.fn(),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => {
  const state = {
    activeSpaceId: null,
    loadRoster: mocks.loadRoster,
    setActiveSpace: mocks.setActiveSpace,
  }
  const useSpacesStore = (selector: (current: typeof state) => unknown) => selector(state)
  useSpacesStore.getState = () => state
  useSpacesStore.setState = vi.fn()
  return { useSpacesStore }
})

vi.mock('@/lib/programs', () => ({
  fetchPrograms: mocks.fetchPrograms,
}))

vi.mock('./SidebarHqSpacesMenuLayers', () => ({
  SidebarHqCampaignMenuLayer: () => null,
  SidebarHqSpaceMenuLayer: () => null,
}))

const campaign = {
  id: 'campaign-1',
  name: 'Impact',
  icon: 'folder',
  config: {},
  isFavorite: false,
  program_id: 'prog-clients',
} as SidebarCampaignRow

describe('SidebarHqSpacesGroupedList', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('expands program → campaign → offers New space in the tree', async () => {
    const onOpenBrowseTemplates = vi.fn()
    const setExpandedIds = vi.fn()
    const setExpandedProgramIds = vi.fn()

    render(
      <SidebarHqSpacesGroupedList
        controller={
          {
            setShowNewCampaignModal: vi.fn(),
            setCreateCampaignProgramId: vi.fn(),
            setShowNewProgramModal: vi.fn(),
          } as unknown as SidebarControllerReturn
        }
        spaces={[]}
        campaigns={[campaign]}
        pathname="/spaces"
        expandedIds={new Set(['campaign-1'])}
        setExpandedIds={setExpandedIds}
        expandedProgramIds={new Set(['prog-clients'])}
        setExpandedProgramIds={setExpandedProgramIds}
        onCreateSpace={vi.fn()}
        isSubmitting={false}
        creatingName=""
        setCreatingName={vi.fn()}
        onOpenBrowseTemplates={onOpenBrowseTemplates}
        onOpenCreateSpaceModal={vi.fn()}
        spaceUserState={
          {
            favoriteIds: new Set<string>(),
            hiddenIds: new Set<string>(),
            isFavorite: vi.fn(() => false),
            toggleFavorite: vi.fn(),
            toggleHidden: vi.fn(),
          } as never
        }
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        flyoutMode
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Clients' }).getAttribute('href')).toBe(
        '/programs/prog-clients',
      )
    })

    expect(screen.getByRole('link', { name: 'Impact' }).getAttribute('href')).toBe(
      '/campaigns/campaign-1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'New space' }))
    fireEvent.click(screen.getByRole('button', { name: 'Browse templates' }))

    expect(onOpenBrowseTemplates).toHaveBeenCalledWith('campaign-1')
  })
})
