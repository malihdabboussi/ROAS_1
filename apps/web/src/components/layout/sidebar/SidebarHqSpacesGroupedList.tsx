'use client'

import { useEffect, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import {
  sortSpacesWithFavoritesFirst,
  useSpaceUserState,
} from '@/features/spaces/hooks/use-space-user-state'
import { updateSpace as updateSpaceRequest } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import { SIDEBAR_MESSAGES } from '../config/sidebar-messages.config'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarAddSpaceDropdown } from './SidebarAddSpaceDropdown'
import {
  SidebarHqCampaignMenuLayer,
  SidebarHqSpaceMenuLayer,
  type SidebarHqCampaignMenuState,
  type SidebarHqSpaceMenuState,
} from './SidebarHqSpacesMenuLayers'
import {
  Section,
  SpaceRow,
  type SectionMenuAnchorRect,
  type SpaceRowSharedProps,
} from './SidebarHqSpacesRows'
import type { SidebarControllerReturn } from './useSidebarController'

const SPACES_ROSTER_REFRESH_INTERVAL_MS = 60_000
let lastSpacesRosterLoadAt = 0

export function SidebarHqSpacesGroupedList({
  controller,
  spaces,
  campaigns,
  pathname,
  expandedIds,
  setExpandedIds,
  onCreateSpace,
  patchCampaignConfig,
  isSubmitting,
  creatingName,
  setCreatingName,
  searchQuery,
  onOpenBrowseTemplates,
  onOpenCreateSpaceModal,
  spaceUserState,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  controller: SidebarControllerReturn
  spaces: Space[]
  campaigns: SidebarCampaignRow[]
  pathname: string
  expandedIds: Set<string>
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>
  onCreateSpace: (campaignId?: string | null) => void
  patchCampaignConfig: (
    campaignId: string,
    configPatch: Record<string, unknown>,
  ) => void | Promise<void>
  isSubmitting: boolean
  creatingName: string
  setCreatingName: (v: string) => void
  searchQuery?: string
  onOpenBrowseTemplates: (bucket: string) => void
  onOpenCreateSpaceModal: (campaignId: string | null) => void
  spaceUserState: ReturnType<typeof useSpaceUserState>
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const { favoriteIds, hiddenIds, isFavorite, toggleFavorite, toggleHidden } = spaceUserState
  const [creatingInBucket, setCreatingInBucket] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<SidebarHqSpaceMenuState | null>(null)
  const [campaignMenuFor, setCampaignMenuFor] = useState<SidebarHqCampaignMenuState | null>(null)
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [addDropdownAnchor, setAddDropdownAnchor] = useState<DOMRect | null>(null)
  const [addDropdownBucket, setAddDropdownBucket] = useState<string | null>(null)
  const isOrgContext = useOrgStore((s) => s.activeOrgId !== null)

  const startRenameSpace = (space: Space) => {
    setRenamingSpaceId(space.id)
    setRenameDraft(space.title ?? '')
  }

  const submitRenameSpace = async () => {
    const id = renamingSpaceId
    if (!id) return
    const trimmed = renameDraft.trim()
    setRenamingSpaceId(null)
    setRenameDraft('')
    const original = spaces.find((s) => s.id === id)
    if (!trimmed || !original || trimmed === original.title) return
    try {
      await updateSpaceRequest(id, { title: trimmed })
      cachedSpaces.mutate((prev) =>
        (prev ?? []).map((sp) => (sp.id === id ? { ...sp, title: trimmed } : sp)),
      )
      useSpacesStore.setState((s) => ({
        spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, title: trimmed } : sp)),
      }))
    } catch {
      toast.error('Failed to rename space')
    }
  }

  useEffect(() => {
    if (Date.now() - lastSpacesRosterLoadAt < SPACES_ROSTER_REFRESH_INTERVAL_MS) return
    lastSpacesRosterLoadAt = Date.now()
    void useSpacesStore.getState().loadRoster()
  }, [])

  useEffect(() => {
    if (!activeSpaceId) return
    const active = spaces.find((s) => s.id === activeSpaceId)
    if (!active) return
    const bucket = active.campaign_id ?? ''
    setExpandedIds((prev) => {
      if (prev.has(bucket)) return prev
      return new Set([...prev, bucket])
    })
  }, [activeSpaceId, spaces, setExpandedIds])

  function toggle(bucket: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) next.delete(bucket)
      else next.add(bucket)
      return next
    })
  }

  function startCreating(bucket: string) {
    if (isOrgContext) {
      onOpenCreateSpaceModal(bucket || null)
      return
    }
    setExpandedIds((prev) => new Set([...prev, bucket]))
    setCreatingInBucket(bucket)
    setCreatingName('')
  }

  function openAddDropdown(e: MouseEvent<HTMLButtonElement>, bucket: string) {
    setAddDropdownAnchor(e.currentTarget.getBoundingClientRect())
    setAddDropdownBucket(bucket)
  }

  function cancelCreating() {
    setCreatingInBucket(null)
    setCreatingName('')
  }

  function handleSubmit(campaignId: string | null) {
    onCreateSpace(campaignId)
    setCreatingInBucket(null)
  }

  const q = (searchQuery ?? '').trim().toLowerCase()
  const searchActive = q.length > 0
  const matchSpace = (s: Space) => (s.title ?? '').toLowerCase().includes(q)
  const ownedSpaces = spaces.filter((s) => !s.share_meta && !hiddenIds.has(s.id))
  const sharedSpaces = searchActive
    ? spaces.filter((s) => !!s.share_meta && matchSpace(s))
    : spaces.filter((s) => !!s.share_meta)
  const campaignBuckets = campaigns
    .map((c) => {
      const allSection = ownedSpaces.filter((s) => s.campaign_id === c.id)
      const labelMatch = c.name.toLowerCase().includes(q)
      const filtered = searchActive && !labelMatch ? allSection.filter(matchSpace) : allSection
      return {
        bucket: c.id,
        label: c.name,
        campaignId: c.id,
        campaignRow: c,
        sectionSpaces: sortSpacesWithFavoritesFirst(filtered, favoriteIds),
        _labelMatch: labelMatch,
      }
    })
    .filter((b) => (searchActive ? b._labelMatch || b.sectionSpaces.length > 0 : true))
  const favoriteBuckets = campaignBuckets.filter((b) => b.campaignRow.isFavorite)
  const otherBuckets = campaignBuckets.filter((b) => !b.campaignRow.isFavorite)
  const noResults =
    searchActive &&
    favoriteBuckets.length === 0 &&
    otherBuckets.length === 0 &&
    sharedSpaces.length === 0
  const groupHeaderCls =
    'px-3 pb-1 pt-1 text-[10px] font-medium tracking-wider text-[var(--color-muted-foreground)]'

  const spaceRowProps: SpaceRowSharedProps = {
    pathname,
    activeSpaceId,
    renamingSpaceId,
    renameDraft,
    setRenameDraft,
    onSubmitRename: () => void submitRenameSpace(),
    onCancelRename: () => {
      setRenamingSpaceId(null)
      setRenameDraft('')
    },
    onOpenMenu: setMenuFor,
  }

  const sectionSharedProps = {
    searchActive,
    onToggle: toggle,
    patchCampaignConfig,
    onOpenCampaignMenu: (campaign: SidebarCampaignRow, anchorRect: SectionMenuAnchorRect) =>
      setCampaignMenuFor({ campaign, anchorRect }),
    onOpenAddDropdown: openAddDropdown,
    creatingName,
    setCreatingName,
    onSubmitCreate: handleSubmit,
    onCancelCreate: cancelCreating,
    isSubmitting,
    favoriteIds,
    spaceRowProps,
  }

  return (
    <div className="space-y-0.5">
      {noResults ? (
        <p className="body-3 px-3 py-6 text-center text-[var(--color-muted-foreground)]">
          No spaces match “{searchQuery}”
        </p>
      ) : null}
      {favoriteBuckets.length > 0 ? (
        <div className="mb-3 space-y-0.5">
          <p className={groupHeaderCls}>Favourite</p>
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
      {otherBuckets.length > 0 ? <p className={groupHeaderCls}>Campaigns</p> : null}
      {otherBuckets.map((b) => (
        <Section
          key={b.bucket}
          {...b}
          {...sectionSharedProps}
          isExpanded={searchActive || expandedIds.has(b.bucket)}
          isCreating={creatingInBucket === b.bucket}
        />
      ))}
      {!searchActive ? (
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

      <SidebarHqCampaignMenuLayer
        campaignMenuFor={campaignMenuFor}
        setCampaignMenuFor={setCampaignMenuFor}
        controller={controller}
        startCreating={startCreating}
      />
      <SidebarHqSpaceMenuLayer
        menuFor={menuFor}
        setMenuFor={setMenuFor}
        campaigns={campaigns}
        activeSpaceId={activeSpaceId}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        toggleHidden={toggleHidden}
        startRenameSpace={startRenameSpace}
      />

      <SidebarAddSpaceDropdown
        open={addDropdownAnchor !== null}
        anchorRect={addDropdownAnchor}
        onClose={() => {
          setAddDropdownAnchor(null)
          setAddDropdownBucket(null)
        }}
        onBlank={() => startCreating(addDropdownBucket ?? '')}
        onBrowse={() => {
          onOpenBrowseTemplates(addDropdownBucket ?? '')
          setAddDropdownAnchor(null)
          setAddDropdownBucket(null)
        }}
      />
    </div>
  )
}
