'use client'

import Link from 'next/link'
import { ListTodo, Plus } from 'lucide-react'
import type { Space } from '@/features/spaces/types'
import type { Program } from '@/lib/programs'
import { SIDEBAR_MESSAGES } from '../config/sidebar-messages.config'
import {
  Section,
  SpaceRow,
  type SectionMenuAnchorRect,
  type SpaceRowSharedProps,
} from './SidebarHqSpacesRows'
import { SidebarProgramFolder } from './SidebarProgramFolder'
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
  program: Program | null
  buckets: CampaignBucket[]
}

export function ProgramRowsSkeleton() {
  return (
    <div className="space-y-1 px-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-secondary/60 rounded-spacing-2 flex h-7 items-center gap-2 px-2">
          <span className="bg-muted-foreground/20 h-4 w-4 shrink-0 rounded" />
          <span className="bg-muted-foreground/15 h-3 flex-1 rounded" />
        </div>
      ))}
    </div>
  )
}

export function SidebarHqSpacesBucketList({
  noResults,
  searchQuery,
  searchActive,
  flyoutMode,
  programsReady,
  favoriteBuckets,
  otherProgramGroups,
  programs,
  expandedIds,
  expandedProgramIds,
  onToggleProgram,
  onCreateCampaignInProgram,
  onOpenProgramMenu,
  onNewProgram,
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
  /** False until programs fetch settles — never flash flat campaign list. */
  programsReady: boolean
  favoriteBuckets: CampaignBucket[]
  otherProgramGroups: ProgramGroup[]
  programs: Program[]
  expandedIds: Set<string>
  expandedProgramIds: Set<string>
  onToggleProgram: (key: string) => void
  onCreateCampaignInProgram?: (programId: string | null) => void
  onOpenProgramMenu?: (program: Program, anchorRect: SectionMenuAnchorRect) => void
  onNewProgram?: () => void
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
  if (!programsReady) {
    return <ProgramRowsSkeleton />
  }

  return (
    <>
      {flyoutMode && !searchActive ? (
        <Link
          href="/all-tasks"
          data-hub-dock-navigate
          className="rounded-spacing-2 hover:bg-hover-subtle text-muted-foreground hover:text-foreground mb-1 flex min-w-0 items-center gap-2 px-2 py-1.5 transition-colors"
        >
          <ListTodo className="icon-sm shrink-0" aria-hidden />
          <span className="body-3 min-w-0 flex-1 truncate font-medium">All Tasks</span>
        </Link>
      ) : null}
      {noResults ? (
        <p className="body-3 text-muted-foreground px-3 py-6 text-center">
          No spaces match “{searchQuery}”
        </p>
      ) : null}
      {favoriteBuckets.length > 0 ? (
        <div className={flyoutMode ? 'mb-1 min-w-0 space-y-0.5' : 'mb-3 min-w-0 space-y-0.5'}>
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
      {otherProgramGroups.length > 0 && !flyoutMode && programs.length === 0 ? (
        <p className={groupHeaderCls}>Programs</p>
      ) : null}
      {otherProgramGroups.map((group) => {
        const programExpanded = searchActive || expandedProgramIds.has(group.key)
        const campaignRows = group.buckets.map((b) => (
          <Section
            key={b.bucket}
            {...b}
            {...sectionSharedProps}
            isExpanded={searchActive || expandedIds.has(b.bucket)}
            isCreating={creatingInBucket === b.bucket}
          />
        ))

        if (programs.length > 0 || group.program != null || group.key === '__ungrouped__') {
          return (
            <SidebarProgramFolder
              key={group.key}
              groupKey={group.key}
              label={group.label}
              program={group.program}
              campaignCount={group.buckets.length}
              isExpanded={programExpanded}
              onToggle={onToggleProgram}
              onCreateCampaign={
                group.program || group.key === '__ungrouped__'
                  ? onCreateCampaignInProgram
                  : undefined
              }
              onOpenMenu={group.program ? onOpenProgramMenu : undefined}
              compact={flyoutMode}
            >
              {campaignRows}
            </SidebarProgramFolder>
          )
        }

        return (
          <div
            key={group.key}
            className={flyoutMode ? 'mb-2 min-w-0 space-y-0.5' : 'mb-1 min-w-0 space-y-0.5'}
          >
            {campaignRows}
          </div>
        )
      })}
      {!searchActive && flyoutMode && onNewProgram ? (
        <button
          type="button"
          onClick={onNewProgram}
          className="rounded-spacing-2 hover:bg-hover-subtle text-muted-foreground hover:text-foreground mt-1 flex w-full min-w-0 items-center gap-0.5 transition-colors"
          aria-label="New program"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <Plus className="icon-md shrink-0" aria-hidden />
          </span>
          <span className="body-3 min-w-0 flex-1 truncate text-left font-medium">New Program</span>
        </button>
      ) : null}
      {!searchActive && !flyoutMode ? (
        <button
          type="button"
          onClick={() => controller.setShowNewCampaignModal(true)}
          className="rounded-spacing-2 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center gap-0.5 transition-colors"
          aria-label="New campaign"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <Plus className="icon-md shrink-0" aria-hidden />
          </span>
          <span className="body-3 min-w-0 flex-1 truncate text-left font-medium">New campaign</span>
        </button>
      ) : null}
      {sharedSpaces.length > 0 ? (
        <div className="mt-3 min-w-0 space-y-0.5">
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
          className="rounded-spacing-2 hover:bg-hover-subtle text-muted-foreground hover:text-foreground mt-3 flex w-full items-center justify-center px-3 py-2 transition-colors disabled:opacity-60"
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
