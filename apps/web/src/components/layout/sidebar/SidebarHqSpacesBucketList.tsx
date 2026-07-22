'use client'

import { Plus } from 'lucide-react'
import type { Space } from '@/features/spaces/types'
import type { Program } from '@/lib/programs'
import { SIDEBAR_MESSAGES } from '../config/sidebar-messages.config'
import { Section, SpaceRow, type SpaceRowSharedProps } from './SidebarHqSpacesRows'
import type { SidebarControllerReturn } from './useSidebarController'

type CampaignBucket = {
  bucket: string
  label: string
  campaignId: string
  campaignRow: Parameters<typeof Section>[0]['campaignRow']
  sectionSpaces: Space[]
}

type ProgramGroup = {
  key: string
  label: string
  buckets: CampaignBucket[]
}

export function SidebarHqSpacesBucketList({
  noResults,
  searchQuery,
  searchActive,
  flyoutMode,
  favoriteBuckets,
  otherProgramGroups,
  programs,
  expandedIds,
  creatingInBucket,
  sectionSharedProps,
  controller,
  sharedSpaces,
  favoriteIds,
  spaceRowProps,
  hasMore,
  loadingMore,
  onLoadMore,
  groupHeaderCls,
}: {
  noResults: boolean
  searchQuery?: string
  searchActive: boolean
  flyoutMode: boolean
  favoriteBuckets: CampaignBucket[]
  otherProgramGroups: ProgramGroup[]
  programs: Program[]
  expandedIds: Set<string>
  creatingInBucket: string | null
  sectionSharedProps: Omit<
    Parameters<typeof Section>[0],
    | 'bucket'
    | 'label'
    | 'campaignId'
    | 'sectionSpaces'
    | 'campaignRow'
    | 'isExpanded'
    | 'isCreating'
  >
  controller: SidebarControllerReturn
  sharedSpaces: Space[]
  favoriteIds: Set<string>
  spaceRowProps: SpaceRowSharedProps
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  groupHeaderCls: string
}) {
  return (
    <>
      {noResults ? (
        <p className="body-3 px-3 py-6 text-center text-[var(--color-muted-foreground)]">
          No spaces match “{searchQuery}”
        </p>
      ) : null}
      {favoriteBuckets.length > 0 ? (
        <div className={flyoutMode ? 'mb-1 space-y-0.5' : 'mb-3 space-y-0.5'}>
          {!flyoutMode ? <p className={groupHeaderCls}>Favourite</p> : null}
          {favoriteBuckets.map((b) => (
            <Section
              key={b.bucket}
              {...b}
              {...sectionSharedProps}
              isExpanded={searchActive || expandedIds.has(b.bucket)}
              isCreating={creatingInBucket === b.bucket}
            />
          ))}
        </div>
      ) : null}
      {otherProgramGroups.length > 0 && !flyoutMode ? (
        <p className={groupHeaderCls}>Campaigns</p>
      ) : null}
      {otherProgramGroups.map((group) => (
        <div key={group.key} className="mb-1 space-y-0.5">
          {programs.length > 0 ? <p className={groupHeaderCls}>{group.label}</p> : null}
          {group.buckets.map((b) => (
            <Section
              key={b.bucket}
              {...b}
              {...sectionSharedProps}
              isExpanded={searchActive || expandedIds.has(b.bucket)}
              isCreating={creatingInBucket === b.bucket}
            />
          ))}
        </div>
      ))}
      {!searchActive && !flyoutMode ? (
        <button
          type="button"
          onClick={() => controller.setShowNewCampaignModal(true)}
          className="rounded-spacing-2 hover:bg-hover-subtle flex w-full items-center gap-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
          aria-label="New campaign"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
          </span>
          <span className="body-3 min-w-0 flex-1 truncate text-left font-medium">New campaign</span>
        </button>
      ) : null}
      {sharedSpaces.length > 0 ? (
        <div className="mt-3 space-y-0.5">
          <p className={groupHeaderCls}>Shared with me</p>
          {sharedSpaces.map((s) => (
            <SpaceRow key={s.id} space={s} favorited={favoriteIds.has(s.id)} {...spaceRowProps} />
          ))}
        </div>
      ) : null}
      {!searchActive && hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="rounded-spacing-2 hover:bg-hover-subtle mt-3 flex w-full items-center justify-center px-3 py-2 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-60"
        >
          <span className="body-3 font-medium">
            {loadingMore
              ? SIDEBAR_MESSAGES.LOADING_MORE_SPACES.message
              : SIDEBAR_MESSAGES.LOAD_MORE_SPACES.message}
          </span>
        </button>
      ) : null}
    </>
  )
}
