'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqHubMenuSpacesSection({
  c,
  spacesSearchQuery,
  setBrowsePanelBucket,
  setCreateSpaceModalFor,
  spaceUserState,
  onHoldParentFlyout,
  onReleaseParentFlyout,
  onSubFlyoutOpenChange,
  onCloseParentFlyout,
}: {
  c: SidebarControllerReturn
  spacesSearchOpen: boolean
  setSpacesSearchOpen: Dispatch<SetStateAction<boolean>>
  spacesSearchQuery: string
  setSpacesSearchQuery: Dispatch<SetStateAction<string>>
  spacesSearchInputRef: RefObject<HTMLInputElement | null>
  hiddenSidebarCount: number
  hiddenEyeRef: RefObject<HTMLButtonElement | null>
  hiddenMenuOpen: boolean
  setHiddenMenuOpen: Dispatch<SetStateAction<boolean>>
  openHiddenMenu: () => void
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
  onHoldParentFlyout?: () => void
  onReleaseParentFlyout?: () => void
  onSubFlyoutOpenChange?: (open: boolean) => void
  onCloseParentFlyout?: () => void
}) {
  return (
    <div className="min-h-0">
      {c.sidebarListsLoading ? (
        <div className="flex justify-center px-2 py-6">
          <VibeyLoadingOrb state="processing" size="sm" text="Loading spaces..." />
        </div>
      ) : (
        <SidebarHqSpacesGroupedList
          controller={c}
          spaces={c.sidebarLists}
          campaigns={c.manageCampaigns}
          pathname={c.pathname}
          expandedIds={c.expandedSpaceCampaignIds}
          setExpandedIds={c.setExpandedSpaceCampaignIds}
          onCreateSpace={(campaignId) => void c.handleCreateList(campaignId)}
          patchCampaignConfig={c.patchCampaignConfig}
          isSubmitting={c.isSubmittingList}
          creatingName={c.newListName}
          setCreatingName={c.setNewListName}
          searchQuery={spacesSearchQuery}
          onOpenBrowseTemplates={setBrowsePanelBucket}
          onOpenCreateSpaceModal={(campaignId) => setCreateSpaceModalFor({ campaignId })}
          spaceUserState={spaceUserState}
          hasMore={c.sidebarListsHasMore}
          loadingMore={c.sidebarListsLoadingMore}
          onLoadMore={() => void c.loadMoreSidebarLists()}
          flyoutMode
          onHoldParentFlyout={onHoldParentFlyout}
          onReleaseParentFlyout={onReleaseParentFlyout}
          onSubFlyoutOpenChange={onSubFlyoutOpenChange}
          onCloseParentFlyout={onCloseParentFlyout}
        />
      )}
    </div>
  )
}
