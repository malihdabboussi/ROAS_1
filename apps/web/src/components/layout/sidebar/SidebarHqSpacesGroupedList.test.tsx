import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import type { SidebarControllerReturn } from './useSidebarController'

const mocks = vi.hoisted(() => ({
  loadRoster: vi.fn(async () => undefined),
  setActiveSpace: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: {
    getState: () => ({ setCollapsed: vi.fn() }),
  },
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground' }),
  LucideIcon: () => <span aria-hidden />,
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: null }) => unknown) =>
    selector({ activeOrgId: null }),
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
} as SidebarCampaignRow

describe('SidebarHqSpacesGroupedList', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('offers templates from the nested campaign New space action', () => {
    const onOpenBrowseTemplates = vi.fn()

    render(
      <SidebarHqSpacesGroupedList
        controller={{ setShowNewCampaignModal: vi.fn() } as unknown as SidebarControllerReturn}
        spaces={[]}
        campaigns={[campaign]}
        pathname="/spaces"
        expandedIds={new Set()}
        setExpandedIds={vi.fn()}
        onCreateSpace={vi.fn()}
        patchCampaignConfig={vi.fn()}
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

    fireEvent.mouseEnter(screen.getByText('Impact'))
    fireEvent.click(screen.getByRole('button', { name: 'New space' }))
    fireEvent.click(screen.getByRole('button', { name: 'Browse templates' }))

    expect(onOpenBrowseTemplates).toHaveBeenCalledWith('campaign-1')
  })
})
