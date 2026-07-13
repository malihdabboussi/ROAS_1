'use client'

import { Eye, Search, X } from 'lucide-react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqHubMenuSpacesSection({
  c,
  spacesSearchOpen,
  setSpacesSearchOpen,
  spacesSearchQuery,
  setSpacesSearchQuery,
  spacesSearchInputRef,
  hiddenSidebarCount,
  hiddenEyeRef,
  hiddenMenuOpen,
  setHiddenMenuOpen,
  openHiddenMenu,
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
    <div className="min-h-0 pb-2">
      {spacesSearchOpen ? (
        <div className="gap-spacing-2 flex shrink-0 items-center px-2 py-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={spacesSearchInputRef}
              type="text"
              value={spacesSearchQuery}
              onChange={(e) => setSpacesSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSpacesSearchOpen(false)
                  setSpacesSearchQuery('')
                }
              }}
              placeholder="Search spaces…"
              className="body-4 box-border h-8 w-full rounded-lg border border-border bg-background pl-7 pr-8 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="button"
              onClick={() => {
                setSpacesSearchOpen(false)
                setSpacesSearchQuery('')
              }}
              className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {hiddenSidebarCount > 0 ? (
            <button
              ref={hiddenEyeRef}
              type="button"
              onClick={() => {
                if (hiddenMenuOpen) setHiddenMenuOpen(false)
                else openHiddenMenu()
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
              aria-label="Show hidden from sidebar"
              title="Hidden from sidebar"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-end gap-0.5 px-2 py-1">
          {hiddenSidebarCount > 0 ? (
            <button
              ref={hiddenEyeRef}
              type="button"
              onClick={() => {
                if (hiddenMenuOpen) setHiddenMenuOpen(false)
                else openHiddenMenu()
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
              aria-label="Show hidden from sidebar"
              title="Hidden from sidebar"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSpacesSearchOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
            aria-label="Search spaces"
            title="Search spaces"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="px-1">
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
          />
        )}
      </div>
    </div>
  )
}
