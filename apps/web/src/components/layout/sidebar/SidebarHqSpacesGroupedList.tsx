'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { LucideIcon, getIconColor } from '@/components/ui/IconPicker'
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
import {
  HubDockFlyout,
  HUB_DOCK_SUB_FLYOUT_LEAVE_MS,
  HUB_DOCK_SUB_FLYOUT_OFFSET_PX,
} from './HubDockFlyout'
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
  const subBucketData =
    flyoutMode && subBucket
      ? campaignBuckets.find((b) => b.bucket === subBucket) ?? null
      : null
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
      {otherBuckets.length > 0 && !flyoutMode ? <p className={groupHeaderCls}>Campaigns</p> : null}
      {otherBuckets.map((b) => (
        <Section
          key={b.bucket}
          {...b}
          {...sectionSharedProps}
          isExpanded={searchActive || expandedIds.has(b.bucket)}
          isCreating={creatingInBucket === b.bucket}
        />
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

      {flyoutMode && subBucketData && subAnchor ? (
        <HubDockFlyout
          anchor={subAnchor}
          title={subBucketData.label}
          nested
          offsetPx={HUB_DOCK_SUB_FLYOUT_OFFSET_PX}
          onEnter={() => {
            clearSubLeave()
            onHoldParentFlyout?.()
          }}
          onLeave={scheduleSubClose}
          onClose={() => {
            closeSubFlyout()
            onCloseParentFlyout?.()
          }}
          headerActions={[
            {
              kind: 'plus',
              title: 'New space',
              onClick: () => startCreating(subBucketData.campaignId),
            },
          ]}
        >
          {creatingInBucket === subBucketData.bucket ? (
            <div className="flex items-center gap-1.5 px-2 py-1" data-hub-dock-keep-open>
              <input
                value={creatingName}
                onChange={(e) => setCreatingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(subBucketData.campaignId)
                  if (e.key === 'Escape') cancelCreating()
                }}
                onBlur={() => {
                  if (!creatingName.trim()) cancelCreating()
                }}
                disabled={isSubmitting}
                autoFocus
                placeholder={isSubmitting ? 'Creating…' : 'Space name'}
                className="body-3 text-foreground placeholder:text-muted-foreground h-7 flex-1 rounded-md bg-transparent px-2 focus:outline-none disabled:opacity-50"
              />
            </div>
          ) : null}
          {subBucketData.sectionSpaces.length === 0 && creatingInBucket !== subBucketData.bucket ? (
            <p className="hub-dock-flyout-row-muted px-2.5 py-1.5 text-[13px]">No spaces yet</p>
          ) : (
            subBucketData.sectionSpaces.map((s) => {
              const spaceIcon =
                typeof s.schema?.icon === 'string' && s.schema.icon.length > 0
                  ? s.schema.icon
                  : 'layout-grid'
              const spaceColor = getIconColor(s.schema?.icon_color).textColor
              return (
                <Link
                  key={s.id}
                  href="/spaces"
                  data-hub-dock-navigate
                  onClick={() => {
                    useSpacesStore.getState().setActiveSpace(s.id)
                    useGlobalChatStore.getState().setCollapsed(true)
                    closeSubFlyout()
                    onCloseParentFlyout?.()
                  }}
                  className="hub-dock-flyout-row"
                >
                  <LucideIcon name={spaceIcon} className={`hub-dock-flyout-row-icon ${spaceColor}`} />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                </Link>
              )
            })
          )}
        </HubDockFlyout>
      ) : null}
    </div>
  )
}
