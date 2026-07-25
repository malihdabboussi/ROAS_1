'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { toast } from 'sonner'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { sortSpacesWithFavoritesFirst } from '@/features/spaces/hooks/use-space-user-state'
import { updateSpace as updateSpaceRequest } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import {
  loadProgramsCached,
  peekProgramsMemoryCache,
  readProgramsLocalCache,
  type Program,
} from '@/lib/programs'
import { groupSidebarCampaignsByProgram } from './group-sidebar-campaigns-by-program'
import { toggleIdInSet } from './sidebar-expand-persistence'
import { SidebarTreeDndProvider } from './sidebar-tree-dnd'
import { createSidebarTreeMutationHandlers } from './sidebar-tree-mutation-handlers'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarHqSpacesBucketList } from './SidebarHqSpacesBucketList'
import type { SidebarHqSpacesGroupedListProps } from './SidebarHqSpacesGroupedList.types'
import { SidebarHqSpacesListOverlays } from './SidebarHqSpacesListOverlays'
import type {
  SidebarHqCampaignMenuState,
  SidebarHqSpaceMenuState,
} from './SidebarHqSpacesMenuLayers'
import { type SectionMenuAnchorRect, type SpaceRowSharedProps } from './SidebarHqSpacesRows'
import { SidebarProgramOverlays } from './SidebarProgramOverlays'
import { useAutoLoadRemainingSpaces } from './use-auto-load-remaining-spaces'

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
  expandedProgramIds,
  setExpandedProgramIds,
  onNewProgram,
}: SidebarHqSpacesGroupedListProps) {
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const { favoriteIds, hiddenIds, isFavorite, toggleFavorite, toggleHidden } = spaceUserState
  const [creatingInBucket, setCreatingInBucket] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<SidebarHqSpaceMenuState | null>(null)
  const [campaignMenuFor, setCampaignMenuFor] = useState<SidebarHqCampaignMenuState | null>(null)
  const [programMenuFor, setProgramMenuFor] = useState<{
    program: Program
    anchorRect: SectionMenuAnchorRect
  } | null>(null)
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [addDropdownAnchor, setAddDropdownAnchor] = useState<DOMRect | null>(null)
  const [addDropdownBucket, setAddDropdownBucket] = useState<string | null>(null)
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null)
  const [deletingProgramBusy, setDeletingProgramBusy] = useState(false)
  const [sharingProgram, setSharingProgram] = useState<Program | null>(null)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const isOrgContext = activeOrgId !== null
  const [programs, setPrograms] = useState<Program[]>(() => {
    return peekProgramsMemoryCache(activeOrgId) ?? readProgramsLocalCache(activeOrgId) ?? []
  })
  const [programsReady, setProgramsReady] = useState(
    () =>
      peekProgramsMemoryCache(activeOrgId) != null || readProgramsLocalCache(activeOrgId) != null,
  )
  const { handleMoveSpace, handleMoveCampaign, handleReorderPrograms, handleReorderSpaces } =
    createSidebarTreeMutationHandlers({
      activeOrgId,
      programs,
      setPrograms,
      spaces,
      favoriteIds,
      setExpandedIds,
      setExpandedProgramIds,
      controller,
    })

  // Page remaining spaces only after the user expands a campaign/program — not on hover open.
  useAutoLoadRemainingSpaces({
    enabled: flyoutMode && (expandedIds.size > 0 || expandedProgramIds.size > 0),
    hasMore,
    loadingMore,
    onLoadMore,
  })

  useEffect(() => {
    let cancelled = false
    const cached = peekProgramsMemoryCache(activeOrgId) ?? readProgramsLocalCache(activeOrgId)
    if (cached) {
      setPrograms(cached)
      setProgramsReady(true)
    } else {
      setProgramsReady(false)
    }

    const load = (opts?: { forceSkeleton?: boolean }) => {
      if (opts?.forceSkeleton && !peekProgramsMemoryCache(activeOrgId)) {
        setProgramsReady(false)
      }
      void loadProgramsCached(activeOrgId)
        .then((rows) => {
          if (cancelled) return
          setPrograms(rows)
        })
        .catch(() => {
          if (cancelled) return
          if (!cached) setPrograms([])
        })
        .finally(() => {
          if (!cancelled) setProgramsReady(true)
        })
    }
    load()
    const onChanged = () => load({ forceSkeleton: false })
    window.addEventListener('roas:programs-changed', onChanged)
    return () => {
      cancelled = true
      window.removeEventListener('roas:programs-changed', onChanged)
    }
  }, [activeOrgId])

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
    const campaign = campaigns.find((c) => c.id === active.campaign_id)
    setExpandedIds((prev) => {
      if (prev.has(bucket)) return prev
      return new Set([...prev, bucket])
    })
    if (campaign?.program_id) {
      setExpandedProgramIds((prev) => {
        if (prev.has(campaign.program_id as string)) return prev
        return new Set([...prev, campaign.program_id as string])
      })
    }
  }, [activeSpaceId, spaces, campaigns, setExpandedIds, setExpandedProgramIds])

  function toggle(bucket: string) {
    setExpandedIds((prev) => toggleIdInSet(prev, bucket))
  }

  function toggleProgram(key: string) {
    setExpandedProgramIds((prev) => toggleIdInSet(prev, key))
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

  function createCampaignInProgram(programId: string | null) {
    controller.setCreateCampaignProgramId(programId)
    controller.setShowNewCampaignModal(true)
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
        key: group.key,
        label: group.label,
        program: group.program,
        buckets: group.campaigns
          .map((campaign) => otherBuckets.find((b) => b.bucket === campaign.id))
          .filter((b): b is (typeof otherBuckets)[number] => !!b),
      }))
      .filter((g) => g.buckets.length > 0 || (!searchActive && g.program != null))
  }, [otherBuckets, programs, searchActive])
  const noResults =
    searchActive &&
    favoriteBuckets.length === 0 &&
    otherBuckets.length === 0 &&
    sharedSpaces.length === 0
  const groupHeaderCls = 'typo-section-label text-muted-foreground px-3 pb-1 pt-1'

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
    <SidebarTreeDndProvider
      onMoveSpace={(spaceId, toCampaignId) => void handleMoveSpace(spaceId, toCampaignId)}
      onMoveCampaign={handleMoveCampaign}
      onReorderPrograms={(activeId, overId) => void handleReorderPrograms(activeId, overId)}
      onReorderSpaces={(campaignId, activeId, overId) =>
        void handleReorderSpaces(campaignId, activeId, overId)
      }
    >
      <div className="min-w-0 space-y-0.5">
        <SidebarHqSpacesBucketList
          enableDnd
          noResults={noResults}
          searchQuery={searchQuery}
          searchActive={searchActive}
          flyoutMode={flyoutMode}
          programsReady={programsReady}
          favoriteBuckets={favoriteBuckets}
          otherProgramGroups={otherProgramGroups}
          programs={programs}
          expandedIds={expandedIds}
          expandedProgramIds={expandedProgramIds}
          onToggleProgram={toggleProgram}
          onCreateCampaignInProgram={createCampaignInProgram}
          onOpenProgramMenu={(program, anchorRect) => setProgramMenuFor({ program, anchorRect })}
          onNewProgram={onNewProgram}
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

        <SidebarProgramOverlays
          programMenuFor={programMenuFor}
          setProgramMenuFor={setProgramMenuFor}
          sharingProgram={sharingProgram}
          setSharingProgram={setSharingProgram}
          deletingProgram={deletingProgram}
          setDeletingProgram={setDeletingProgram}
          deletingProgramBusy={deletingProgramBusy}
          setDeletingProgramBusy={setDeletingProgramBusy}
          setPrograms={setPrograms}
          onCreateCampaign={createCampaignInProgram}
        />
      </div>
    </SidebarTreeDndProvider>
  )
}
