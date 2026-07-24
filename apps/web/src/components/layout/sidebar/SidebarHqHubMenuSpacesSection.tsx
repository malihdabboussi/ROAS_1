'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { ProgramRowsSkeleton } from './SidebarHqSpacesBucketList'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqHubMenuSpacesSection({
  c,
  spacesSearchQuery,
  setBrowsePanelBucket,
  setCreateSpaceModalFor,
  spaceUserState,
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
}) {
  return (
    <div className="min-h-0">
      {c.sidebarListsLoading ? (
        <ProgramRowsSkeleton />
      ) : (
        <SidebarHqSpacesGroupedList
          controller={c}
          spaces={c.sidebarLists}
          campaigns={c.manageCampaigns}
          pathname={c.pathname}
          expandedIds={c.expandedSpaceCampaignIds}
          setExpandedIds={c.setExpandedSpaceCampaignIds}
          expandedProgramIds={c.expandedProgramIds}
          setExpandedProgramIds={c.setExpandedProgramIds}
          onCreateSpace={(campaignId) => void c.handleCreateList(campaignId)}
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
          onNewProgram={() => c.setShowNewProgramModal(true)}
        />
      )}
    </div>
  )
}
