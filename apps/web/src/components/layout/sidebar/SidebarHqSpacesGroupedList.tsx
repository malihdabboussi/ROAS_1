'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from 'react'
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
import { fetchPrograms, type Program } from '@/lib/programs'
import { groupSidebarCampaignsByProgram } from './group-sidebar-campaigns-by-program'
import { HUB_DOCK_SUB_FLYOUT_LEAVE_MS } from './HubDockFlyout'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarHqSpacesBucketList } from './SidebarHqSpacesBucketList'
import { SidebarHqSpacesListOverlays } from './SidebarHqSpacesListOverlays'
import type {
  SidebarHqCampaignMenuState,
  SidebarHqSpaceMenuState,
} from './SidebarHqSpacesMenuLayers'
import { SidebarHqSpacesNestedFlyout } from './SidebarHqSpacesNestedFlyout'
import { type SectionMenuAnchorRect, type SpaceRowSharedProps } from './SidebarHqSpacesRows'
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
  flyoutMode = false,
  onHoldParentFlyout,
  onReleaseParentFlyout,
  onSubFlyoutOpenChange,
  onCloseParentFlyout,
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
  /** Dock flyout: nested spaces sub-flyout on campaign hover; no New campaign row. */
  flyoutMode?: boolean
  onHoldParentFlyout?: () => void
  onReleaseParentFlyout?: () => void
  onSubFlyoutOpenChange?: (open: boolean) => void
  onCloseParentFlyout?: () => void
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
  const [subBucket, setSubBucket] = useState<string | null>(null)
  const [subAnchor, setSubAnchor] = useState<DOMRect | null>(null)
  const subLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOrgContext = useOrgStore((s) => s.activeOrgId !== null)
  const [programs, setPrograms] = useState<Program[]>([])

  useEffect(() => {
    void fetchPrograms()
      .then(setPrograms)
      .catch(() => setPrograms([]))
  }, [isOrgContext])

  const clearSubLeave = useCallback(() => {
    if (subLeaveTimer.current) {
      clearTimeout(subLeaveTimer.current)
      subLeaveTimer.current = null
    }
  }, [])

  const closeSubFlyout = useCallback(() => {
    clearSubLeave()
    setSubBucket(null)
    setSubAnchor(null)
    onSubFlyoutOpenChange?.(false)
  }, [clearSubLeave, onSubFlyoutOpenChange])

  const openSubFlyout = useCallback(
    (bucket: string, anchor: DOMRect) => {
      clearSubLeave()
      onHoldParentFlyout?.()
      setSubBucket(bucket)
      setSubAnchor(anchor)
      onSubFlyoutOpenChange?.(true)
    },
    [clearSubLeave, onHoldParentFlyout, onSubFlyoutOpenChange],
  )

  const scheduleSubClose = useCallback(() => {
    clearSubLeave()
    subLeaveTimer.current = setTimeout(() => {
      subLeaveTimer.current = null
      closeSubFlyout()
      onReleaseParentFlyout?.()
    }, HUB_DOCK_SUB_FLYOUT_LEAVE_MS)
  }, [clearSubLeave, closeSubFlyout, onReleaseParentFlyout])

  useEffect(() => () => clearSubLeave(), [clearSubLeave])

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
  const otherProgramGroups = useMemo(() => {
    const rows = otherBuckets.map((b) => b.campaignRow)
    const groups = groupSidebarCampaignsByProgram(rows, programs)
    return groups
      .map((group) => ({
        ...group,
        buckets: group.campaigns
          .map((campaign) => otherBuckets.find((b) => b.bucket === campaign.id))
          .filter((b): b is (typeof otherBuckets)[number] => !!b),
      }))
      .filter((g) => g.buckets.length > 0 || (!searchActive && g.program != null))
  }, [otherBuckets, programs, searchActive])
  const subBucketData =
    flyoutMode && subBucket ? (campaignBuckets.find((b) => b.bucket === subBucket) ?? null) : null
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
    flyoutMode,
    onHoverCampaign: flyoutMode ? openSubFlyout : undefined,
    onLeaveCampaign: flyoutMode ? scheduleSubClose : undefined,
  }

  return (
    <div className="space-y-0.5">
      <SidebarHqSpacesBucketList
        noResults={noResults}
        searchQuery={searchQuery}
        searchActive={searchActive}
        flyoutMode={flyoutMode}
        favoriteBuckets={favoriteBuckets}
        otherProgramGroups={otherProgramGroups}
        programs={programs}
        expandedIds={expandedIds}
        creatingInBucket={creatingInBucket}
        sectionSharedProps={sectionSharedProps}
        controller={controller}
        sharedSpaces={sharedSpaces}
        favoriteIds={favoriteIds}
        spaceRowProps={spaceRowProps}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        groupHeaderCls={groupHeaderCls}
      />

      <SidebarHqSpacesListOverlays
        campaignMenuFor={campaignMenuFor}
        setCampaignMenuFor={setCampaignMenuFor}
        menuFor={menuFor}
        setMenuFor={setMenuFor}
        controller={controller}
        startCreating={startCreating}
        campaigns={campaigns}
        activeSpaceId={activeSpaceId}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        toggleHidden={toggleHidden}
        startRenameSpace={startRenameSpace}
        addDropdownAnchor={addDropdownAnchor}
        addDropdownBucket={addDropdownBucket}
        setAddDropdownAnchor={setAddDropdownAnchor}
        setAddDropdownBucket={setAddDropdownBucket}
        onOpenBrowseTemplates={onOpenBrowseTemplates}
      />

      {flyoutMode && subBucketData && subAnchor ? (
        <SidebarHqSpacesNestedFlyout
          anchor={subAnchor}
          label={subBucketData.label}
          campaignId={subBucketData.campaignId}
          bucket={subBucketData.bucket}
          sectionSpaces={subBucketData.sectionSpaces}
          creatingInBucket={creatingInBucket}
          creatingName={creatingName}
          setCreatingName={setCreatingName}
          isSubmitting={isSubmitting}
          onSubmitCreate={handleSubmit}
          onCancelCreate={cancelCreating}
          onOpenAddDropdown={openAddDropdown}
          onEnter={() => {
            clearSubLeave()
            onHoldParentFlyout?.()
          }}
          onLeave={scheduleSubClose}
          onClose={() => {
            closeSubFlyout()
            onCloseParentFlyout?.()
          }}
          onCloseParentFlyout={onCloseParentFlyout}
          closeSubFlyout={closeSubFlyout}
        />
      ) : null}
    </div>
  )
}
