'use client'

import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getIconColor } from '@/components/ui/IconPicker'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import type { MediaAsset } from '@/lib/services/media-api'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { ArtifactPreviewSelection } from '../components/artifacts/artifact-preview-selection'
import {
  ARTIFACT_QUERY_KEY,
  useArtifactDetailQuery,
} from '../components/artifacts/use-artifact-detail-query'
import type { ContactsViewHandle } from '../components/contacts/ContactsView'
import { SpaceContentRouter } from '../components/content'
import { SpaceBreadcrumbHeader, SpaceMoreMenu, SpaceSwitcherDropdown } from '../components/header'
import { MEDIA_QUERY_KEY, useMediaDetailQuery } from '../components/media/use-media-detail-query'
import type { MissionsViewHandle } from '../components/MissionsView'
import { SpaceModalsHost } from '../components/modals'
import type { CampaignFinanceTabHandle } from '../components/reporting/FinanceOverviewView'
import { buildNewViewDef, ViewSwitcher } from '../components/ViewSwitcher'
import { useAllSocialResearchAccountActions } from '../hooks/use-all-social-research-account-actions'
import { cachedSpaces } from '../hooks/use-cached-spaces'
import { useCustomizeViewActions } from '../hooks/use-customize-view-actions'
import { useSpaceActiveView } from '../hooks/use-space-active-view'
import { useSpaceArtifactActions } from '../hooks/use-space-artifact-actions'
import { useSpaceCampaignDocs } from '../hooks/use-space-campaign-docs'
import { useSpaceCampaignName } from '../hooks/use-space-campaign-name'
import { useSpaceCurrentUserToolbarMeta } from '../hooks/use-space-current-user-toolbar-meta'
import { useSpaceCustomizeStageBounds } from '../hooks/use-space-customize-stage-bounds'
import { useSpaceFieldOptionActions } from '../hooks/use-space-field-option-actions'
import { useSpaceItemsRealtime } from '../hooks/use-space-items-realtime'
import { useSpaceSocialAccountActions } from '../hooks/use-space-social-account-actions'
import { useSpaceSwitcherState } from '../hooks/use-space-switcher-state'
import { useSpaceToolbarFilters } from '../hooks/use-space-toolbar-filters'
import { useSpaceToolbarState } from '../hooks/use-space-toolbar-state'
import { useSpaceUserState } from '../hooks/use-space-user-state'
import { useViewPatchFlush } from '../hooks/use-view-patch-flush'
import { ALL_ARTIFACTS_GROUP_BY_OPTIONS, isArtifactSurfaceViewType } from '../lib/all-artifacts'
import { getAllSocialResearchConfig } from '../lib/all-social-research'
import { applySpaceToolbarFilters } from '../lib/apply-space-toolbar-filters'
import { CONTACTS_GROUP_BY_OPTIONS } from '../lib/contacts-group-by-options'
import {
  ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS,
  IG_RESEARCH_GROUP_BY_OPTIONS,
} from '../lib/ig-research-group-by'
import { MEDIA_GROUP_BY_OPTIONS, normalizeMediaGroupBy } from '../lib/media-group-by-options'
import { MISSION_GROUP_BY_OPTIONS } from '../lib/mission-group-by-options'
import { usesPaidAdsInlineDetail } from '../lib/paid-ads-display-mode'
import { updateSpace } from '../services/spaces.service'
import { useSpacesStore } from '../store/use-spaces-store'
import {
  DEFAULT_MEDIA_VIEW_CONFIG,
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  REPORTING_VIEW_TYPES,
  socialResearchConfigKeyForPlatform,
  type ContactsConfig,
  type DocsConfig,
  type DocsDriveCardSize,
  type DocsDriveGroupBy,
  type MediaViewConfig,
  type MissionsConfig,
  type SocialPlatform,
  type SocialResearchConfig,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'
import { resolveToolbar } from '../views'
import { SaveViewSlot } from '../views/_shared/SaveViewSeparator'
import type { SpaceToolbarContext } from '../views/types'

// Preview slide-over stacks (incl. @xyflow/react via AdStudioLayout and the
// per-kind artifact previews) load on demand so they stay out of the base
// /spaces chunk that every space view pays for (perf-optimize pattern 7).
function PreviewHostLoading() {
  return null
}
const ArtifactPreviewPanelHost = dynamic(
  () =>
    import('../components/artifacts/ArtifactPreviewPanelHost').then(
      (mod) => mod.ArtifactPreviewPanelHost,
    ),
  { loading: PreviewHostLoading },
)
const MediaPreviewPanelHost = dynamic(
  () => import('../views/media/MediaPreviewPanel').then((mod) => mod.MediaPreviewPanelHost),
  { loading: PreviewHostLoading },
)

type InlineArtifactOpenDetail = {
  artifactType?: string
  artifactId?: string
  documentId?: string
  name?: string
  spaceId?: string
  spaceItemId?: string
}

type OpenMissionsViewDetail = {
  spaceId?: unknown
  openCapture?: unknown
  openPlaybook?: unknown
}

const MISSIONS_VIEW_CATALOG_ITEM = {
  type: 'missions',
  label: 'Missions',
  icon: 'rocket',
  description: 'Campaign mission control',
} as const

function buildMissionsViewForSchema(existingViews: ViewDef[]): ViewDef {
  const base = buildNewViewDef(MISSIONS_VIEW_CATALOG_ITEM)
  const existingIds = new Set(existingViews.map((view) => view.id))
  const existingNames = new Set(existingViews.map((view) => view.name))
  if (!existingIds.has(base.id) && !existingNames.has(base.name)) return base

  let n = 2
  let nextId = `${base.id}_${n}`
  while (existingIds.has(nextId)) {
    n += 1
    nextId = `${base.id}_${n}`
  }
  let nextName = `${base.name} ${n}`
  while (existingNames.has(nextName)) {
    n += 1
    nextName = `${base.name} ${n}`
  }
  return { ...base, id: nextId, name: nextName }
}

function artifactTypeToSpaceViewType(artifactType: string): string | null {
  switch (artifactType) {
    case 'funnel':
      return 'funnels'
    case 'offer':
      return 'offers'
    case 'ad-campaign':
      return 'ad_campaigns'
    case 'sequence':
      return 'sequences'
    case 'presentation':
      return 'presentations'
    case 'avatar':
      return 'avatars'
    case 'social-post':
      return 'social_posts'
    case 'ad':
      return 'ads'
    case 'blog-post':
      return 'websites'
    case 'document':
    case 'space_doc':
    case 'visual-doc':
      return 'docs'
    case 'email':
      return 'emails'
    case 'instagram-research':
      return 'instagram_research'
    case 'tiktok-research':
      return 'tiktok_research'
    case 'youtube-research':
      return 'youtube_research'
    case 'twitter-research':
      return 'twitter_research'
    default:
      return null
  }
}

export function SpaceItemsContainer() {
  const items = useSpacesStore((s) => s.items)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const itemsLoadedForSpaceId = useSpacesStore((s) => s.itemsLoadedForSpaceId)
  const spaces = useSpacesStore((s) => s.spaces)
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const activeViewId = useSpacesStore((s) => s.activeViewId)
  const setActiveView = useSpacesStore((s) => s.setActiveView)
  const updateItem = useSpacesStore((s) => s.updateItem)
  const deleteItem = useSpacesStore((s) => s.deleteItem)
  const pushToAgent = useSpacesStore((s) => s.pushToAgent)
  const roster = useSpacesStore((s) => s.roster)
  const currentUserId = useSpacesStore((s) => s.currentUserId)
  const refresh = useSpacesStore((s) => s.refresh)
  const patchActiveSpaceSchema = useSpacesStore((s) => s.patchActiveSpaceSchema)
  const viewOverrides = useSpacesStore((s) => s.viewOverrides)
  const patchViewOverride = useSpacesStore((s) => s.patchViewOverride)
  const resetViewOverride = useSpacesStore((s) => s.resetViewOverride)
  const sessionViewDrafts = useSpacesStore((s) => s.sessionViewDrafts)
  const applySessionDraft = useSpacesStore((s) => s.applySessionDraft)
  const clearSessionDraft = useSpacesStore((s) => s.clearSessionDraft)
  const createItem = useSpacesStore((s) => s.createItem)
  const createSpace = useSpacesStore((s) => s.createSpace)
  const deleteSpace = useSpacesStore((s) => s.deleteSpace)
  const applyRealtimeItemChange = useSpacesStore((s) => s.applyRealtimeItemChange)

  // Subscribe to row-level item changes so agent/other-user edits appear
  // without full-list refetches that can clobber local optimistic UI.
  useSpaceItemsRealtime(activeSpaceId, applyRealtimeItemChange)

  const patchSchema = patchActiveSpaceSchema as (s: SpaceSchema | Partial<SpaceSchema>) => void

  const missionsViewRef = useRef<MissionsViewHandle | null>(null)
  const pendingMissionCaptureOpenRef = useRef(false)
  const pendingPlaybookOpenRef = useRef(false)
  const financeOverviewRef = useRef<CampaignFinanceTabHandle | null>(null)
  const contactsViewRef = useRef<ContactsViewHandle | null>(null)
  const spaceBelowViewTabsRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSpaceViewSyncKeyRef = useRef<string | null>(null)
  const urlSpaceItemDeepLinkRef = useRef<string | null>(null)

  useEffect(() => {
    if (spaces.length === 0) return
    const spaceParam = searchParams.get('space')
    if (!spaceParam || !spaces.some((s) => s.id === spaceParam)) return
    const vParam = searchParams.get('v')
    const urlKey = `${spaceParam}\u0000${vParam ?? ''}`
    const urlSearchChanged = urlSpaceViewSyncKeyRef.current !== urlKey
    if (urlSearchChanged) urlSpaceViewSyncKeyRef.current = urlKey
    if (activeSpaceId !== spaceParam) {
      setActiveSpace(spaceParam)
    }
    const targetSpace = spaces.find((s) => s.id === spaceParam)
    if (
      urlSearchChanged &&
      vParam &&
      targetSpace?.schema?.views?.some((v: { id: string }) => v.id === vParam)
    ) {
      setActiveView(vParam)
    }
  }, [spaces, searchParams, activeSpaceId, setActiveSpace, setActiveView])

  useEffect(() => {
    const spaceParam = searchParams.get('space')
    if (!spaceParam || spaces.some((space) => space.id === spaceParam)) return

    let cancelled = false
    void (async () => {
      await cachedSpaces.reload()
      if (cancelled) return
      await useSpacesStore.getState().loadSpaces()
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, spaces])

  const [artifactDeepDetail, setArtifactDeepDetail] = useState<{
    id: string
    title: string
  } | null>(null)
  const [artifactPreviewSelection, setArtifactPreviewSelection] =
    useState<ArtifactPreviewSelection | null>(null)
  const [mediaPreviewAsset, setMediaPreviewAsset] = useState<MediaAsset | null>(null)
  const [mediaDeepDetail, setMediaDeepDetail] = useState<{ id: string; title: string } | null>(null)
  const prevActiveViewIdForArtifactQsRef = useRef<string | null>(null)
  const { artifactId, setArtifactQuery } = useArtifactDetailQuery()
  const { mediaId: mediaDetailId, setMediaQuery: setMediaDetailQuery } = useMediaDetailQuery()

  const toolbar = useSpaceToolbarState(activeViewId ?? undefined)
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null
  const { isFavorite, toggleFavorite, toggleHidden } = useSpaceUserState()

  // Sidebar context menu (Sharing & Permissions / Automations) sets
  // `pendingMenuAction` and navigates here. Open the matching modal
  // for the active space, then clear the flag.
  useEffect(() => {
    if (!activeSpace) return
    const pending = useSpacesStore.getState().pendingMenuAction
    if (!pending || pending.spaceId !== activeSpace.id) return
    if (pending.action === 'share') {
      toolbar.setSpaceShareDualNavigator(false)
      toolbar.setSpaceShareOpen(true)
    } else if (pending.action === 'automations') {
      toolbar.setAutomationsOpen(true)
    }
    useSpacesStore.setState({ pendingMenuAction: null })
  }, [activeSpace, toolbar])
  const switcher = useSpaceSwitcherState(activeSpace, toolbar.moreMenuRef)
  const {
    switcherOpen,
    setSwitcherOpen,
    dropdownPos,
    titleDraft,
    setTitleDraft,
    switcherTriggerRef,
    dropdownRef,
  } = switcher

  const {
    schemaEditorOpen,
    setSchemaEditorOpen,
    customizeSubjectViewId,
    setCustomizeSubjectViewId,
    panelInitialView,
    setPanelInitialView,
    customizeDropdownAnchorRef,
    closeCustomizePanel,
    openCustomizeFromToolbar,
    statusEditorOpen,
    setStatusEditorOpen,
    categoryEditorOpen,
    setCategoryEditorOpen,
    automationsOpen,
    setAutomationsOpen,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    spaceToolbarSearch,
    setSpaceToolbarSearch,
    assigneeFilterOpen,
    setAssigneeFilterOpen,
    selectedItem,
    setSelectedItem,
    taskHistory,
    pushTaskAndOpen,
    popTask,
    openSpaceItemModal,
    docEditorItem,
    setDocEditorItem,
    spaceShareOpen,
    setSpaceShareOpen,
    spaceShareDualNavigator,
    setSpaceShareDualNavigator,
    moreMenuOpen,
    setMoreMenuOpen,
    moreMenuBtnRef,
    moreMenuRef,
    moreMenuPos,
    setMoreMenuPos,
    groupByOpen,
    setGroupByOpen,
    docsDisplayMenuOpen,
    setDocsDisplayMenuOpen,
    docsDisplayBtnRef,
    docsDisplayMenuRef,
    igDisplayMenuOpen,
    setIgDisplayMenuOpen,
    igDisplayBtnRef,
    igDisplayMenuRef,
    igSortMenuOpen,
    setIgSortMenuOpen,
    igSortBtnRef,
    igOutlierMenuOpen,
    setIgOutlierMenuOpen,
    igOutlierBtnRef,
    subtasksMenuOpen,
    setSubtasksMenuOpen,
    groupByBtnRef,
    subtasksBtnRef,
    contactsDetailToolbarLeftRef,
    contactsDetailToolbarLeftPx,
    setContactsDetailToolbarLeftPx,
    contactDetailOpen,
    setContactDetailOpen,
    artifactDetailOpen,
    setArtifactDetailOpen,
    contactCommsLoaded,
    setContactCommsLoaded,
    contactCommunicationTab,
    setContactCommunicationTab,
    contactDetailColumnLayout,
    setContactDetailColumnLayout,
    financePlusOpen,
    setFinancePlusOpen,
    financePlusRootRef,
    docsPlusOpen,
    setDocsPlusOpen,
    docsPlusRootRef,
    docsSourceFilterOpen,
    setDocsSourceFilterOpen,
    docsSourceFilterBtnRef,
    docsSourceFilterWrapRef,
    docsSourceFilterDropdownRef,
    docsListSourceMenuOpen,
    setDocsListSourceMenuOpen,
    docsListSourceWrapRef,
    reportingToolbarApi,
    setReportingToolbarApi,
    financeToolbarSearch,
    setFinanceToolbarSearch,
    financeSearchOpen,
    setFinanceSearchOpen,
    contactsSearch,
    setContactsSearch,
    contactsSearchOpen,
    setContactsSearchOpen,
    contactsSort,
    setContactsSort,
    contactsSortOpen,
    setContactsSortOpen,
    contactsLoading,
    setContactsLoading,
    contactsAddOpen,
    setContactsAddOpen,
    contactsAddRootRef,
    contactsManualOpen,
    setContactsManualOpen,
    contactsCsvOpen,
    setContactsCsvOpen,
    contactsGhlOpen,
    setContactsGhlOpen,
    contactsAcOpen,
    setContactsAcOpen,
    contactsSegmentPanelOpen,
    setContactsSegmentPanelOpen,
    activeContactsSegmentId,
    setActiveContactsSegmentId,
    activeContactsSegmentName,
    setActiveContactsSegmentName,
    expandedSwitcherIds,
    setExpandedSwitcherIds,
    resetContactCommunicationTab,
    handleCommunicationLoaded,
    handleContactDetailLayout,
  } = toolbar

  useEffect(() => {
    const spaceParam = searchParams.get('space')
    const itemParam = searchParams.get('item')
    if (!itemParam || !spaceParam || spaceParam !== activeSpaceId) {
      urlSpaceItemDeepLinkRef.current = null
      return
    }
    if (!activeSpace || activeSpace.id !== spaceParam) return
    if (itemsLoadedForSpaceId !== activeSpaceId) return

    const sig = `${spaceParam}:${itemParam}`
    if (urlSpaceItemDeepLinkRef.current === sig) return

    const item = items.find((i) => i.id === itemParam)
    if (!item) {
      urlSpaceItemDeepLinkRef.current = sig
      return
    }

    const vt = (item.custom_data as Record<string, unknown> | undefined)?._view_type
    if (vt === 'doc') {
      setSelectedItem(null)
      setDocEditorItem(item)
    } else {
      setDocEditorItem(null)
      openSpaceItemModal(item)
    }

    urlSpaceItemDeepLinkRef.current = sig
  }, [
    searchParams,
    activeSpaceId,
    activeSpace,
    itemsLoadedForSpaceId,
    items,
    openSpaceItemModal,
    setDocEditorItem,
    setSelectedItem,
  ])

  useEffect(() => {
    if (!selectedItem) return
    const fresh = items.find((i) => i.id === selectedItem.id)
    if (fresh) setSelectedItem(fresh)
    else setSelectedItem(null)
  }, [items, selectedItem, setSelectedItem])

  useEffect(() => {
    const onOpenTask = (e: Event) => {
      const d = (e as CustomEvent<{ itemId?: unknown; spaceId?: unknown }>).detail
      if (typeof d?.itemId !== 'string') return
      if (typeof d?.spaceId === 'string' && d.spaceId !== activeSpaceId) return
      const item = items.find((i) => i.id === d.itemId)
      if (item) openSpaceItemModal(item)
    }
    window.addEventListener('space-vibey:open-task', onOpenTask as EventListener)
    return () => window.removeEventListener('space-vibey:open-task', onOpenTask as EventListener)
  }, [activeSpaceId, items, openSpaceItemModal])

  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const openIntegrationsLibrary = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'library')
      window.history.replaceState({}, '', url.toString())
    }
    openWorkspaceSettings('integrations')
  }, [openWorkspaceSettings])

  const docsCloud = useCloudAttach({
    behavior: 'toast_if_disconnected',
  })

  const activeViewStuff = useSpaceActiveView({
    activeSpace,
    activeViewId,
    customizeSubjectViewId,
    viewOverrides,
    sessionViewDrafts,
    setActiveView,
  })
  const {
    activeSchema,
    activeView,
    customizePanelTargetView,
    visibleViews,
    visibleFields,
    groupableFields,
    groupByField,
    fieldsById,
    fieldsForUi,
    isTeamSpace,
    canSaveForEveryone,
    canCustomizeViews,
  } = activeViewStuff

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const handleFocusViewType = (event: Event) => {
      const viewType = (event as CustomEvent).detail?.view_type
      if (typeof viewType !== 'string') return
      const focusMatchingView = () => {
        const currentSchema = useSpacesStore
          .getState()
          .spaces.find((space) => space.id === activeSpaceId)?.schema
        const target = currentSchema?.views?.find((view) => view.type === viewType)
        if (target) {
          setActiveView(target.id)
          return true
        }
        return false
      }
      retryTimer = setTimeout(() => {
        if (focusMatchingView()) return
        void useSpacesStore
          .getState()
          .refresh()
          .then(() => {
            retryTimer = setTimeout(focusMatchingView, 200)
          })
      }, 200)
    }
    window.addEventListener('space:focus-view-type', handleFocusViewType as EventListener)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('space:focus-view-type', handleFocusViewType as EventListener)
    }
  }, [activeSpaceId, setActiveView])

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const handleOpenInlineArtifact = (event: Event) => {
      const detail = (event as CustomEvent<InlineArtifactOpenDetail>).detail
      if (!detail?.artifactType || !detail?.artifactId) return
      const viewType = artifactTypeToSpaceViewType(detail.artifactType)
      if (!viewType) return
      const targetSpaceId =
        typeof detail.spaceId === 'string' && detail.spaceId.trim()
          ? detail.spaceId.trim()
          : activeSpaceId
      const isSpaceDoc =
        detail.artifactType === 'space_doc' ||
        detail.artifactType === 'visual-doc' ||
        (detail.artifactType === 'document' && typeof detail.spaceItemId === 'string')
      const targetItemId =
        typeof detail.spaceItemId === 'string' && detail.spaceItemId.trim()
          ? detail.spaceItemId.trim()
          : isSpaceDoc
            ? detail.artifactId
            : null

      if (targetSpaceId && targetSpaceId !== activeSpaceId) {
        setActiveSpace(targetSpaceId)
      }

      if (isSpaceDoc && targetSpaceId && targetItemId) {
        setArtifactPreviewSelection(null)
        setArtifactQuery(null)
        const item =
          targetSpaceId === activeSpaceId ? items.find((i) => i.id === targetItemId) : null
        if (
          item &&
          (item.custom_data as Record<string, unknown> | undefined)?._view_type === 'doc'
        ) {
          setSelectedItem(null)
          setDocEditorItem(item)
        }
        const p = new URLSearchParams(searchParams.toString())
        p.set('space', targetSpaceId)
        p.set('item', targetItemId)
        const qs = p.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }

      const focusMatchingView = () => {
        const currentSchema = useSpacesStore
          .getState()
          .spaces.find((space) => space.id === targetSpaceId)?.schema
        const target = currentSchema?.views?.find((view) => view.type === viewType)
        if (target) {
          setActiveView(target.id)
          return true
        }
        return false
      }

      if (!isSpaceDoc) {
        setArtifactPreviewSelection(null)
        setArtifactQuery(detail.artifactId)
      }
      window.dispatchEvent(
        new CustomEvent('space:artifact-focus', {
          detail: {
            type: detail.artifactType,
            id: detail.artifactId,
            name: detail.name ?? 'Artifact',
          },
        }),
      )

      const _focusedNow = focusMatchingView()
      if (_focusedNow) return
      void refresh().then(() => {
        retryTimer = setTimeout(() => {
          focusMatchingView()
        }, 200)
      })
    }

    window.addEventListener('vibey-open-artifact', handleOpenInlineArtifact as EventListener)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('vibey-open-artifact', handleOpenInlineArtifact as EventListener)
    }
  }, [
    activeSpaceId,
    items,
    pathname,
    refresh,
    router,
    searchParams,
    setActiveSpace,
    setActiveView,
    setArtifactQuery,
    setDocEditorItem,
    setSelectedItem,
  ])

  useEffect(() => {
    setReportingToolbarApi(null)
  }, [activeView?.type, setReportingToolbarApi])

  useEffect(() => {
    if (activeView?.type !== 'finance_overview') {
      setFinanceToolbarSearch('')
      setFinanceSearchOpen(false)
    }
  }, [activeView?.type, setFinanceToolbarSearch, setFinanceSearchOpen])

  useEffect(() => {
    if (activeView?.type !== 'contacts') {
      setContactsSegmentPanelOpen(false)
      setActiveContactsSegmentId(null)
      setActiveContactsSegmentName(null)
    }
  }, [
    activeView?.type,
    setContactsSegmentPanelOpen,
    setActiveContactsSegmentId,
    setActiveContactsSegmentName,
  ])

  useEffect(() => {
    if (activeView?.type !== 'contacts' || !contactDetailOpen) {
      setContactDetailColumnLayout(null)
    }
  }, [activeView?.type, contactDetailOpen, setContactDetailColumnLayout])

  useLayoutEffect(() => {
    if (activeView?.type !== 'contacts' || !contactDetailOpen) {
      setContactsDetailToolbarLeftPx(0)
      return
    }
    const el = contactsDetailToolbarLeftRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setContactsDetailToolbarLeftPx(el.getBoundingClientRect().width)
    })
    ro.observe(el)
    setContactsDetailToolbarLeftPx(el.getBoundingClientRect().width)
    return () => {
      ro.disconnect()
    }
  }, [activeView?.type, contactDetailOpen, setContactsDetailToolbarLeftPx])

  useEffect(() => {
    if (!contactDetailOpen) {
      setContactCommunicationTab('all')
      setContactCommsLoaded(false)
    }
  }, [contactDetailOpen, setContactCommunicationTab, setContactCommsLoaded])

  const customizeStageBounds = useSpaceCustomizeStageBounds(spaceBelowViewTabsRef)

  const { allCampaigns, campaignName, switcherTree } = useSpaceCampaignName(activeSpace)

  const { customizeFlushCtxRef, flushPendingViewPatch, handleViewPatch, pendingViewPatchRef } =
    useViewPatchFlush({
      customizePanelTargetView,
      activeView,
      activeSchema,
      activeSpace,
      isTeamSpace,
      patchViewOverride,
      patchActiveSpaceSchema: patchSchema,
      refresh,
      applySessionDraft,
      clearSessionDraft,
      sessionViewDrafts,
    })

  const focusMissionsView = useCallback(
    async (options?: { openCapture?: boolean; openPlaybook?: boolean }) => {
      if (!activeSpace || !activeSchema) return
      if (options?.openCapture) pendingMissionCaptureOpenRef.current = true
      if (options?.openPlaybook) pendingPlaybookOpenRef.current = true

      const existingMissionsView = activeSchema.views.find((view) => view.type === 'missions')
      if (existingMissionsView) {
        setActiveView(existingMissionsView.id)
        return
      }

      const newView = buildMissionsViewForSchema(activeSchema.views)
      const nextSchema = { ...activeSchema, views: [...activeSchema.views, newView] }
      patchSchema(nextSchema)
      await updateSpace(activeSpace.id, { schema: nextSchema })
      setActiveView(newView.id)
    },
    [activeSchema, activeSpace, patchSchema, setActiveView],
  )

  useEffect(() => {
    const handleOpenMissionsView = (event: Event) => {
      const detail = (event as CustomEvent<OpenMissionsViewDetail>).detail
      if (typeof detail?.spaceId === 'string' && detail.spaceId !== activeSpaceId) return
      void focusMissionsView({
        openCapture: detail?.openCapture === true,
        openPlaybook: detail?.openPlaybook === true,
      })
    }
    window.addEventListener('space:open-missions-view', handleOpenMissionsView as EventListener)
    return () =>
      window.removeEventListener(
        'space:open-missions-view',
        handleOpenMissionsView as EventListener,
      )
  }, [activeSpaceId, focusMissionsView])

  useEffect(() => {
    if (!pendingMissionCaptureOpenRef.current || activeView?.type !== 'missions') return
    let attempts = 0
    const timer = window.setInterval(() => {
      const handle = missionsViewRef.current
      attempts += 1
      if (!handle && attempts < 20) return
      window.clearInterval(timer)
      if (!handle) return
      pendingMissionCaptureOpenRef.current = false
      handle.openNewMissionCapture()
    }, 50)
    return () => window.clearInterval(timer)
  }, [activeView?.id, activeView?.type])

  useEffect(() => {
    if (!pendingPlaybookOpenRef.current || activeView?.type !== 'missions') return
    let attempts = 0
    const timer = window.setInterval(() => {
      const handle = missionsViewRef.current
      attempts += 1
      if (!handle && attempts < 20) return
      window.clearInterval(timer)
      if (!handle) return
      pendingPlaybookOpenRef.current = false
      handle.openStartPlaybook()
    }, 50)
    return () => window.clearInterval(timer)
  }, [activeView?.id, activeView?.type])

  const {
    handleSaveForEveryone,
    handleResetViewToDefault,
    handleSaveViewDraft,
    handleEnableAutosaveAndFlush,
    handleSaveAsNewView,
    handleRevertViewDraft,
    handleViewPinToStart,
    handleDeleteActiveView,
  } = useCustomizeViewActions({
    customizePanelTargetView,
    activeSchema,
    activeSpace,
    activeViewId,
    activeView,
    canSaveForEveryone,
    customizeFlushCtxRef,
    patchActiveSpaceSchema: patchSchema,
    refresh,
    resetViewOverride,
    sessionViewDrafts,
    setActiveView,
    clearSessionDraft,
    pendingViewPatchRef,
    flushPendingViewPatch,
    closeCustomizePanel,
    handleViewPatch,
  })

  const activeDraft = customizePanelTargetView
    ? sessionViewDrafts[customizePanelTargetView.id]
    : undefined
  const hasDraft = !!(activeDraft && Object.keys(activeDraft).length > 0)

  useEffect(() => {
    if (!hasDraft) return
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void handleSaveViewDraft()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [hasDraft, customizePanelTargetView?.id, handleSaveViewDraft])

  const {
    handleCreateFieldOption,
    handleUpdateFieldOption,
    handleDeleteFieldOption,
    handleTagCustomSwatchesChange,
  } = useSpaceFieldOptionActions({
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema: patchSchema,
    refresh,
  })

  const {
    toggleToolbarAssignedToMe,
    toggleToolbarAssigneeParticipant,
    toggleToolbarMissionAgent,
    toggleToolbarShowCompleted,
    clearToolbarAssigneeFilter,
  } = useSpaceToolbarFilters(activeView, handleViewPatch)

  const campaignIdEarly = activeSpace?.campaign_id ?? null
  const docsSurfaceActive = Boolean(activeSchema && activeSpace && activeView?.type === 'docs')
  const {
    reloadCampaignDocs,
    loadCampaignDocs,
    driveMappingsSyncing,
    setDriveMappingsSyncing,
    docItems,
    docsLoading,
    hasDriveDocs,
    campaignDocsIncludeRequested,
    campaignDocsLoading,
    campaignDocsSynced,
  } = useSpaceCampaignDocs({
    isDocsView: docsSurfaceActive,
    campaignId: campaignIdEarly,
    activeSpaceId,
    currentUserId,
    itemsLoadedForSpaceId,
    items,
  })

  useEffect(() => {
    if (!docEditorItem) return
    const id = docEditorItem.id
    const fromDocs = docItems.find((i) => i.id === id)
    if (fromDocs) {
      setDocEditorItem(fromDocs)
      return
    }
    const fromStore = items.find((i) => i.id === id)
    if (fromStore) setDocEditorItem(fromStore)
    else setDocEditorItem(null)
  }, [items, docItems, docEditorItem?.id, setDocEditorItem])

  useEffect(() => {
    const fromSource =
      artifactId &&
      docItems.find((item) => {
        const cd = (item.custom_data ?? {}) as Record<string, unknown>
        return cd._source_id === artifactId
      })
    const synthetic = artifactId && docItems.find((item) => item.id === `cdoc:${artifactId}`)
    const match = fromSource ?? synthetic ?? null
    if (!docsSurfaceActive || !artifactId || docsLoading) return
    if (match) setDocEditorItem(match)
  }, [docsSurfaceActive, artifactId, docsLoading, docItems, setDocEditorItem])

  /**
   * Pick the platform from whichever view the customize panel is editing
   * (falls back to the active view, then to 'instagram' so existing handlers
   * keep behaving the same when no social-research view is involved).
   */
  const socialAccountTargetView = customizePanelTargetView ?? activeView
  const socialAccountPlatform: SocialPlatform =
    socialAccountTargetView?.type === 'tiktok_research'
      ? 'tiktok'
      : socialAccountTargetView?.type === 'youtube_research'
        ? 'youtube'
        : socialAccountTargetView?.type === 'twitter_research'
          ? 'twitter'
          : 'instagram'
  const isAllSocialAccountView = socialAccountTargetView?.type === 'all_social_research'
  const {
    handleAddAccount: handleIgAddAccount,
    handleSyncAccount: handleIgSyncAccount,
    handleRemoveAccount: handleIgRemoveAccount,
  } = useSpaceSocialAccountActions({
    platform: socialAccountPlatform,
    activeView: isAllSocialAccountView ? null : socialAccountTargetView,
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema: patchSchema,
    applySessionDraft,
    refresh,
  })
  const {
    handleAddAccount: handleAllSocialAddAccount,
    handleSyncAccount: handleAllSocialSyncAccount,
    handleRemoveAccount: handleAllSocialRemoveAccount,
  } = useAllSocialResearchAccountActions({
    activeView: isAllSocialAccountView ? socialAccountTargetView : null,
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema: patchSchema,
    applySessionDraft,
    refresh,
  })

  const artifactSurfaceEarly = Boolean(
    activeSchema && activeSpace && activeView && isArtifactSurfaceViewType(activeView.type),
  )
  const [campaignArtifactViewKeys, setCampaignArtifactViewKeys] = useState<Record<string, boolean>>(
    {},
  )
  const artifactCampaignKey =
    artifactSurfaceEarly && activeSpace?.id && activeView?.id
      ? `${activeSpace.id}:${activeView.id}`
      : null
  const includeCampaignArtifacts =
    artifactCampaignKey !== null && campaignArtifactViewKeys[artifactCampaignKey] === true

  const loadCampaignArtifacts = useCallback(() => {
    if (!artifactCampaignKey) return
    setCampaignArtifactViewKeys((prev) =>
      prev[artifactCampaignKey] ? prev : { ...prev, [artifactCampaignKey]: true },
    )
  }, [artifactCampaignKey])
  const {
    artifactConfig,
    artifactGroupById,
    handleArtifactConfigPatch,
    handleCreateArtifact,
    handleCreatePresentationFromHtml,
    handleCreateFunnel,
    artifactPrimaryLabel,
  } = useSpaceArtifactActions({
    activeSpace,
    activeView,
    isArtifactView: artifactSurfaceEarly,
    handleViewPatch,
  })
  const artifactSlidePreviewOpen = artifactPreviewSelection !== null

  useEffect(() => {
    if (!artifactSurfaceEarly && artifactPreviewSelection) {
      setArtifactPreviewSelection(null)
    }
  }, [artifactSurfaceEarly, artifactPreviewSelection])

  const { toolbarMeAvatarUrl, toolbarMeInitials, toolbarAssigneeAvatars } =
    useSpaceCurrentUserToolbarMeta(roster, currentUserId, activeView)

  if (!activeSpaceId || !activeSpace || !activeSchema) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)]">
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
          Select or create a space to get started
        </div>
      </div>
    )
  }

  const isMissionsView = activeView?.type === 'missions'
  const isIgResearchView = activeView?.type === 'instagram_research'
  const isTiktokResearchView = activeView?.type === 'tiktok_research'
  const isYoutubeResearchView = activeView?.type === 'youtube_research'
  const isTwitterResearchView = activeView?.type === 'twitter_research'
  const isAllSocialResearchView = activeView?.type === 'all_social_research'
  const isAdsResearchView = activeView?.type === 'ads_research'
  const isAllArtifactsView = activeView?.type === 'all_artifacts'
  const isSocialResearchView =
    isIgResearchView ||
    isTiktokResearchView ||
    isYoutubeResearchView ||
    isTwitterResearchView ||
    isAllSocialResearchView
  const socialPlatform: SocialPlatform | null = isAllSocialResearchView
    ? null
    : isTiktokResearchView
      ? 'tiktok'
      : isYoutubeResearchView
        ? 'youtube'
        : isTwitterResearchView
          ? 'twitter'
          : isIgResearchView
            ? 'instagram'
            : null
  const socialResearchConfigKey = isAllSocialResearchView
    ? 'all_social_research_config'
    : socialPlatform
      ? socialResearchConfigKeyForPlatform(socialPlatform)
      : null
  const isDocsView = activeView?.type === 'docs'
  const isContactsView = activeView?.type === 'contacts'
  const isChannelsSurface = activeView?.type === 'channels' || activeView?.type === 'channel'
  const isReportingView = activeView ? REPORTING_VIEW_TYPES.has(activeView.type) : false
  const isArtifactView = activeView ? isArtifactSurfaceViewType(activeView.type) : false
  const isMediaView = activeView?.type === 'media'
  const isFinanceOverviewView = activeView?.type === 'finance_overview'
  const isAdsPerformanceView = activeView?.type === 'ads_performance'
  const isSocialReportingView = activeView?.type === 'social_reporting'

  useEffect(() => {
    if (!mediaDetailId) setMediaDeepDetail(null)
  }, [mediaDetailId])

  useEffect(() => {
    if (isArtifactView || isDocsView || isMediaView) return
    setArtifactDetailOpen(false)
    setArtifactDeepDetail(null)
    setMediaDeepDetail(null)
    if (!searchParams.get(ARTIFACT_QUERY_KEY) && !searchParams.get(MEDIA_QUERY_KEY)) return
    const p = new URLSearchParams(searchParams.toString())
    p.delete(ARTIFACT_QUERY_KEY)
    p.delete(MEDIA_QUERY_KEY)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [
    isArtifactView,
    isDocsView,
    isMediaView,
    pathname,
    router,
    searchParams,
    setArtifactDetailOpen,
  ])

  useEffect(() => {
    const prev = prevActiveViewIdForArtifactQsRef.current
    prevActiveViewIdForArtifactQsRef.current = activeViewId ?? null
    if (prev === null || prev === activeViewId) return
    setArtifactDeepDetail(null)
    setMediaDeepDetail(null)
    if (isDocsView) return
    if (!searchParams.get(ARTIFACT_QUERY_KEY) && !searchParams.get(MEDIA_QUERY_KEY)) return
    const p = new URLSearchParams(searchParams.toString())
    p.delete(ARTIFACT_QUERY_KEY)
    p.delete(MEDIA_QUERY_KEY)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [activeViewId, isDocsView, pathname, router, searchParams])

  useEffect(() => {
    if (!isMediaView && mediaPreviewAsset) {
      setMediaPreviewAsset(null)
    }
  }, [isMediaView, mediaPreviewAsset])

  const regularItems = useMemo(
    () => items.filter((item) => !(item.custom_data as Record<string, unknown>)?._view_type),
    [items],
  )

  const statusFieldForToolbar = useMemo(() => fieldsById.get('status'), [fieldsById])

  const filteredRegularItems = useMemo(() => {
    if (!activeView) return regularItems
    const t = activeView.type
    if (t !== 'list' && t !== 'table' && t !== 'kanban' && t !== 'calendar') return regularItems
    return applySpaceToolbarFilters(
      regularItems,
      activeView,
      statusFieldForToolbar,
      roster,
      currentUserId,
      spaceToolbarSearch,
    )
  }, [regularItems, activeView, statusFieldForToolbar, roster, currentUserId, spaceToolbarSearch])

  const showSpaceItemQuickFilters =
    !!activeView &&
    (activeView.type === 'list' ||
      activeView.type === 'table' ||
      activeView.type === 'kanban' ||
      activeView.type === 'calendar' ||
      activeView.type === 'missions')

  const folderLabel = campaignName ?? (activeSpace.campaign_id ? '…' : 'Personal')
  const spaceIconName = activeSchema.icon ?? 'layout-grid'
  const spaceIconColor = getIconColor(activeSchema.icon_color)

  const missionsMc: MissionsConfig = activeView?.missions_config ?? {}
  const missionsGroupByLabel = missionsMc.group_by
    ? (MISSION_GROUP_BY_OPTIONS.find((o) => o.id === missionsMc.group_by)?.label ??
      missionsMc.group_by)
    : null

  const igConfig: SocialResearchConfig = isAllSocialResearchView
    ? getAllSocialResearchConfig(activeView!)
    : {
        ...DEFAULT_SOCIAL_RESEARCH_CONFIG,
        ...(socialResearchConfigKey ? activeView?.[socialResearchConfigKey] : undefined),
      }
  const igGroupByLabel = igConfig.group_by
    ? ((isAllSocialResearchView
        ? ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS
        : IG_RESEARCH_GROUP_BY_OPTIONS
      ).find((o) => o.id === igConfig.group_by)?.label ?? igConfig.group_by)
    : null

  const contactsCc: ContactsConfig = activeView?.contacts_config ?? {}
  const contactsScope: 'campaign' | 'all' = contactsCc.scope ?? 'campaign'
  const contactsStatusFilter: 'all' | 'lead' | 'customer' = contactsCc.status_filter ?? 'all'
  const contactsGroupByLabel = contactsCc.group_by
    ? (CONTACTS_GROUP_BY_OPTIONS.find((o) => o.id === contactsCc.group_by)?.label ??
      contactsCc.group_by)
    : null

  const mediaViewConfig = useMemo(
    () => ({ ...DEFAULT_MEDIA_VIEW_CONFIG, ...(activeView?.media_config ?? {}) }),
    [activeView?.media_config],
  )

  const mediaGbNormalized = normalizeMediaGroupBy(mediaViewConfig.group_by)
  const mediaGroupByLabel =
    mediaGbNormalized !== 'none'
      ? (MEDIA_GROUP_BY_OPTIONS.find((o) => o.id === mediaGbNormalized)?.label ?? mediaGbNormalized)
      : null

  const handleMediaViewConfigPatch = useCallback(
    (patch: Partial<MediaViewConfig>) => {
      void handleViewPatch({ media_config: { ...mediaViewConfig, ...patch } })
    },
    [handleViewPatch, mediaViewConfig],
  )

  const mediaSlidePreviewOpen = mediaPreviewAsset !== null

  const docsConfigToolbar: DocsConfig = useMemo(
    () => ({ display_mode: 'grid', ...(activeView?.docs_config ?? {}) }),
    [activeView?.docs_config],
  )

  const docsPreTreeDisplayModeRef = useRef<'grid' | 'list'>('grid')
  useEffect(() => {
    const dm = docsConfigToolbar.display_mode ?? 'grid'
    if (dm !== 'tree') {
      docsPreTreeDisplayModeRef.current = dm === 'list' ? 'list' : 'grid'
    }
  }, [docsConfigToolbar.display_mode])

  const docsIsTreeLayout = isDocsView && (docsConfigToolbar.display_mode ?? 'grid') === 'tree'

  useEffect(() => {
    if (!isDocsView || !activeSpace?.campaign_id) return
    const filters = docsConfigToolbar.doc_source_filters ?? []
    if (filters.includes('campaign')) {
      loadCampaignDocs()
    }
  }, [isDocsView, activeSpace?.campaign_id, docsConfigToolbar.doc_source_filters, loadCampaignDocs])

  const [docsDriveBrowseActive, setDocsDriveBrowseActive] = useState(false)
  useEffect(() => {
    if (!isDocsView) setDocsDriveBrowseActive(false)
  }, [isDocsView, activeViewId])
  const docsDriveGroupBy: DocsDriveGroupBy = docsConfigToolbar.drive_group_by ?? 'flat'
  const setDocsDriveGroupBy = useCallback(
    (next: DocsDriveGroupBy) => {
      void handleViewPatch({
        docs_config: { ...docsConfigToolbar, drive_group_by: next },
      })
    },
    [docsConfigToolbar, handleViewPatch],
  )
  const docsDriveCardSize: DocsDriveCardSize = docsConfigToolbar.drive_card_size ?? 'preview'
  const setDocsDriveCardSize = useCallback(
    (next: DocsDriveCardSize) => {
      void handleViewPatch({
        docs_config: { ...docsConfigToolbar, drive_card_size: next },
      })
    },
    [docsConfigToolbar, handleViewPatch],
  )

  const artifactGroupByLabel = artifactGroupById
    ? activeView?.type === 'all_artifacts'
      ? (ALL_ARTIFACTS_GROUP_BY_OPTIONS.find((o) => o.id === artifactGroupById)?.label ??
        artifactGroupById)
      : (groupableFields.find((field) => field.id === artifactGroupById)?.name ?? artifactGroupById)
    : null

  useEffect(() => {
    if (docsIsTreeLayout) setDocsDisplayMenuOpen(false)
  }, [docsIsTreeLayout])

  const showGroupByInToolbar = !isReportingView && !isChannelsSurface
  const showSubtasksToolbar =
    !!activeView &&
    (activeView.type === 'list' ||
      activeView.type === 'table' ||
      activeView.type === 'kanban' ||
      activeView.type === 'calendar' ||
      activeView.type === 'missions') &&
    !isReportingView &&
    !isContactsView &&
    !isChannelsSurface &&
    !isDocsView &&
    !isSocialResearchView
  const showAddColumnsToolbar =
    !!activeView &&
    !isReportingView &&
    !isSocialResearchView &&
    !isChannelsSurface &&
    !docsIsTreeLayout &&
    (activeView.type === 'list' ||
      activeView.type === 'table' ||
      activeView.type === 'kanban' ||
      activeView.type === 'docs' ||
      activeView.type === 'missions' ||
      activeView.type === 'contacts' ||
      isArtifactView)

  const ToolbarForView = resolveToolbar(activeView?.type)
  const toolbarCtx: SpaceToolbarContext = {
    activeSpace,
    activeView,
    activeSchema,
    activeViewId,
    activeSpaceId,
    isMissionsView,
    isIgResearchView,
    isTiktokResearchView,
    isYoutubeResearchView,
    isTwitterResearchView,
    isAllSocialResearchView,
    isAllArtifactsView,
    isSocialResearchView,
    socialPlatform,
    socialResearchConfigKey,
    isDocsView,
    isContactsView,
    isChannelsSurface,
    isReportingView,
    isArtifactView,
    isMediaView,
    isFinanceOverviewView,
    isAdsPerformanceView,
    isSocialReportingView,
    docsIsTreeLayout,
    showGroupByInToolbar,
    showSubtasksToolbar,
    showAddColumnsToolbar,
    showSpaceItemQuickFilters,
    roster,
    currentUserId,
    fieldsById,
    groupableFields,
    groupByField,
    igConfig,
    igGroupByLabel,
    missionsMc,
    missionsGroupByLabel,
    contactsGroupByLabel,
    mediaGroupByLabel,
    artifactConfig,
    artifactGroupByLabel,
    artifactPrimaryLabel,
    artifactSlidePreviewOpen,
    mediaViewConfig,
    handleMediaViewConfigPatch,
    mediaSlidePreviewOpen,
    docsConfigToolbar,
    docsPreTreeDisplayModeRef,
    artifactCampaignId: campaignIdEarly,
    includeCampaignArtifacts,
    loadCampaignArtifacts,
    docsDriveBrowseActive,
    docsDriveGroupBy,
    setDocsDriveGroupBy,
    docsDriveCardSize,
    setDocsDriveCardSize,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
    groupByOpen,
    setGroupByOpen,
    groupByBtnRef,
    subtasksMenuOpen,
    setSubtasksMenuOpen,
    subtasksBtnRef,
    docsDisplayMenuOpen,
    setDocsDisplayMenuOpen,
    docsDisplayBtnRef,
    docsDisplayMenuRef,
    igDisplayMenuOpen,
    setIgDisplayMenuOpen,
    igDisplayBtnRef,
    igDisplayMenuRef,
    igSortMenuOpen,
    setIgSortMenuOpen,
    igSortBtnRef,
    igOutlierMenuOpen,
    setIgOutlierMenuOpen,
    igOutlierBtnRef,
    docsSourceFilterOpen,
    setDocsSourceFilterOpen,
    docsSourceFilterBtnRef,
    docsSourceFilterWrapRef,
    docsSourceFilterDropdownRef,
    docsListSourceMenuOpen,
    setDocsListSourceMenuOpen,
    docsListSourceWrapRef,
    spaceToolbarSearch,
    setSpaceToolbarSearch,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    financeSearchOpen,
    setFinanceSearchOpen,
    financeToolbarSearch,
    setFinanceToolbarSearch,
    contactsSearch,
    setContactsSearch,
    contactsSearchOpen,
    setContactsSearchOpen,
    contactsSort,
    setContactsSort,
    contactsSortOpen,
    setContactsSortOpen,
    contactsLoading,
    contactsAddOpen,
    setContactsAddOpen,
    contactsAddRootRef,
    setContactsManualOpen,
    setContactsCsvOpen,
    setContactsGhlOpen,
    setContactsAcOpen,
    contactsSegmentPanelOpen,
    setContactsSegmentPanelOpen,
    activeContactsSegmentName,
    setActiveContactsSegmentId,
    setActiveContactsSegmentName,
    contactDetailOpen,
    contactDetailColumnLayout,
    contactsDetailToolbarLeftRef,
    contactsDetailToolbarLeftPx,
    contactCommsLoaded,
    contactCommunicationTab,
    setContactCommunicationTab,
    artifactDetailOpen: artifactDetailOpen || Boolean(artifactId),
    artifactDeepDetail,
    mediaDetailOpen: Boolean(mediaDetailId),
    mediaDeepDetail,
    hasDraft,
    handleSaveViewDraft,
    handleEnableAutosaveAndFlush,
    handleSaveAsNewView,
    handleRevertViewDraft,
    reportingToolbarApi,
    openIntegrationsLibrary,
    financePlusOpen,
    setFinancePlusOpen,
    financePlusRootRef,
    docsPlusOpen,
    setDocsPlusOpen,
    docsPlusRootRef,
    docsCloud,
    toggleToolbarShowCompleted,
    toggleToolbarAssignedToMe,
    clearToolbarAssigneeFilter,
    setAssigneeFilterOpen,
    toolbarMeAvatarUrl,
    toolbarMeInitials,
    toolbarAssigneeAvatars,
    setDriveMappingsSyncing,
    refresh,
    docsCampaignId: campaignIdEarly,
    campaignDocsIncludeRequested,
    campaignDocsLoading,
    campaignDocsSynced,
    loadCampaignDocs,
    contactsViewRef,
    missionsViewRef,
    financeOverviewRef,
    handleViewPatch,
    handleArtifactConfigPatch,
    handleCreateArtifact,
    handleCreatePresentationFromHtml,
    handleCreateFunnel,
    createItem,
  }

  return (
    <div
      className={
        isArtifactView
          ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-bl-2xl rounded-br-2xl rounded-tl-2xl border border-[var(--border)]'
          : 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)]'
      }
    >
      <SpaceBreadcrumbHeader
        activeSpace={activeSpace}
        folderLabel={folderLabel}
        spaceIconName={spaceIconName}
        spaceIconColor={spaceIconColor}
        switcherOpen={switcherOpen}
        switcherTriggerRef={switcherTriggerRef}
        onToggleSwitcher={() => setSwitcherOpen((o) => !o)}
        onOpenAutomations={() => setAutomationsOpen(true)}
        onOpenShare={() => {
          setSpaceShareDualNavigator(false)
          setSpaceShareOpen(true)
        }}
      />

      <SpaceSwitcherDropdown
        open={switcherOpen}
        dropdownPos={dropdownPos}
        dropdownRef={dropdownRef}
        moreMenuBtnRef={moreMenuBtnRef}
        activeSpace={activeSpace}
        activeSpaceId={activeSpaceId}
        activeSchema={activeSchema}
        spaceIconName={spaceIconName}
        spaceIconColor={spaceIconColor}
        titleDraft={titleDraft}
        setTitleDraft={setTitleDraft}
        schemaEditorOpen={schemaEditorOpen}
        switcherTree={switcherTree}
        expandedSwitcherIds={expandedSwitcherIds}
        setExpandedSwitcherIds={setExpandedSwitcherIds}
        setActiveSpace={setActiveSpace}
        setSwitcherOpen={setSwitcherOpen}
        patchActiveSpaceSchema={patchActiveSpaceSchema}
        closeCustomizePanel={closeCustomizePanel}
        openCustomizeFromToolbar={openCustomizeFromToolbar}
        moreMenuOpen={moreMenuOpen}
        setMoreMenuOpen={setMoreMenuOpen}
        setMoreMenuPos={setMoreMenuPos}
      />

      <SpaceMoreMenu
        open={moreMenuOpen}
        pos={moreMenuPos}
        moreMenuRef={moreMenuRef}
        activeSpace={activeSpace}
        allCampaigns={allCampaigns}
        isFavorite={activeSpace ? isFavorite(activeSpace.id) : false}
        setMoreMenuOpen={setMoreMenuOpen}
        setSwitcherOpen={setSwitcherOpen}
        setAutomationsOpen={setAutomationsOpen}
        setSpaceShareOpen={setSpaceShareOpen}
        createSpace={createSpace}
        deleteSpace={deleteSpace}
        onToggleFavorite={() => {
          if (activeSpace) void toggleFavorite(activeSpace.id)
        }}
        onRename={() => setSwitcherOpen(true)}
        onPatchSchemaIcon={async (patch) => {
          if (!activeSpace) return
          const next = {
            ...(activeSpace.schema as unknown as Record<string, unknown>),
            ...patch,
          }
          patchActiveSpaceSchema(next)
          await updateSpace(activeSpace.id, { schema: next as unknown as SpaceSchema })
        }}
        onOpenCampaign={
          activeSpace?.campaign_id
            ? () => {
                openInNewTab(`/campaigns/${activeSpace.campaign_id}`)
              }
            : undefined
        }
        onHide={
          activeSpace && !activeSpace.share_meta
            ? () => void toggleHidden(activeSpace.id, activeSpace.title ?? 'Untitled')
            : undefined
        }
        onMoveToCampaign={async (cid) => {
          if (!activeSpace) return
          if ((activeSpace.campaign_id ?? null) === cid) return
          try {
            await updateSpace(activeSpace.id, { campaign_id: cid })
            useSpacesStore.setState((s) => ({
              spaces: s.spaces.map((sp) =>
                sp.id === activeSpace.id ? { ...sp, campaign_id: cid } : sp,
              ),
            }))
            toast.success('Moved space')
          } catch {
            toast.error('Failed to move space')
          }
        }}
        onCopyToCampaign={async (cid) => {
          if (!activeSpace) return
          try {
            const dup = await createSpace(`${activeSpace.title} (copy)`)
            if (cid !== null) await updateSpace(dup.id, { campaign_id: cid })
            useSpacesStore.setState((s) => ({
              spaces: s.spaces.map((sp) =>
                sp.id === dup.id ? { ...sp, campaign_id: cid ?? null } : sp,
              ),
            }))
            toast.success(`Copied as "${dup.title}"`)
          } catch {
            toast.error('Failed to copy space')
          }
        }}
      />

      <ViewSwitcher
        views={visibleViews}
        activeViewId={activeView?.id ?? null}
        onSelectView={(viewId) => setActiveView(viewId)}
        hasCampaign={!!activeSpace.campaign_id}
        canAccessEditorViews={canCustomizeViews}
        onAddView={async (newView) => {
          if (!activeSchema || !activeSpace) return
          const nextSchema = { ...activeSchema, views: [...activeSchema.views, newView] }
          patchActiveSpaceSchema(nextSchema)
          await updateSpace(activeSpace.id, { schema: nextSchema })
          setActiveView(newView.id)
        }}
        onReorderViews={async (reorderedVisible) => {
          if (!activeSchema || !activeSpace || reorderedVisible.length === 0) return
          const visibleIds = new Set(visibleViews.map((v) => v.id))
          const hiddenViews = activeSchema.views.filter((v) => !visibleIds.has(v.id))
          const cleared = reorderedVisible.map((v) => ({ ...v, pinned_to_start: false }))
          const nextSchema = { ...activeSchema, views: [...cleared, ...hiddenViews] }
          patchActiveSpaceSchema(nextSchema)
          await updateSpace(activeSpace.id, { schema: nextSchema })
        }}
        onTabContextCustomize={
          canCustomizeViews
            ? (viewId, anchorEl) => {
                customizeDropdownAnchorRef.current = anchorEl
                setCustomizeSubjectViewId(viewId)
                setPanelInitialView('main')
                setSchemaEditorOpen(true)
              }
            : undefined
        }
        rightSlot={null}
      />

      <div ref={spaceBelowViewTabsRef} className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          data-spaces-preview-dismiss-zone
        >
          <ToolbarForView ctx={toolbarCtx} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <SpaceContentRouter
              docsDriveGroupBy={docsDriveGroupBy}
              docsDriveCardSize={docsDriveCardSize}
              onDocsDriveBrowseActiveChange={setDocsDriveBrowseActive}
              activeView={activeView}
              activeSchema={activeSchema}
              activeSpace={activeSpace}
              isContactsView={isContactsView}
              isIgResearchView={isIgResearchView}
              isTiktokResearchView={isTiktokResearchView}
              isYoutubeResearchView={isYoutubeResearchView}
              isTwitterResearchView={isTwitterResearchView}
              isAllSocialResearchView={isAllSocialResearchView}
              isAdsResearchView={isAdsResearchView}
              socialPlatform={socialPlatform}
              isMissionsView={isMissionsView}
              isDocsView={isDocsView}
              isReportingView={isReportingView}
              items={items}
              campaignName={campaignName}
              fieldsById={fieldsById}
              fieldsForUi={fieldsForUi}
              visibleFields={visibleFields}
              roster={roster}
              currentUserId={currentUserId}
              filteredRegularItems={filteredRegularItems}
              docItems={docItems}
              docsCloud={docsCloud}
              docsLoading={docsLoading}
              includeCampaignArtifacts={includeCampaignArtifacts}
              driveMappingsSyncing={driveMappingsSyncing}
              hasDriveDocs={hasDriveDocs}
              artifactPreviewSelection={artifactPreviewSelection}
              setArtifactPreviewSelection={setArtifactPreviewSelection}
              mediaPreviewAsset={mediaPreviewAsset}
              setMediaPreviewAsset={setMediaPreviewAsset}
              contactsSearch={contactsSearch}
              contactsScope={contactsScope}
              contactsStatusFilter={contactsStatusFilter}
              contactsSort={contactsSort}
              contactsLoading={contactsLoading}
              activeContactsSegmentId={activeContactsSegmentId}
              contactCommunicationTab={contactCommunicationTab}
              spaceToolbarSearch={spaceToolbarSearch}
              setSpaceToolbarSearch={setSpaceToolbarSearch}
              financeToolbarSearch={financeToolbarSearch}
              contactsViewRef={contactsViewRef}
              missionsViewRef={missionsViewRef}
              financeOverviewRef={financeOverviewRef}
              handleViewPatch={handleViewPatch}
              openCustomizeFromToolbar={openCustomizeFromToolbar}
              setContactsLoading={setContactsLoading}
              setContactDetailOpen={setContactDetailOpen}
              resetContactCommunicationTab={resetContactCommunicationTab}
              handleContactDetailLayout={handleContactDetailLayout}
              handleCommunicationLoaded={handleCommunicationLoaded}
              setArtifactDetailOpen={setArtifactDetailOpen}
              setArtifactDeepDetail={setArtifactDeepDetail}
              setMediaDeepDetail={setMediaDeepDetail}
              setReportingToolbarApi={setReportingToolbarApi}
              setSelectedItem={setSelectedItem}
              openSpaceItemModal={openSpaceItemModal}
              setDocEditorItem={setDocEditorItem}
              reloadCampaignDocs={reloadCampaignDocs}
              setCategoryEditorOpen={setCategoryEditorOpen}
              setStatusEditorOpen={setStatusEditorOpen}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onPushToAgent={pushToAgent}
              onCreateOption={handleCreateFieldOption}
              onUpdateOption={handleUpdateFieldOption}
              onDeleteOption={handleDeleteFieldOption}
              onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
              artifactDeepToolbarExtras={<SaveViewSlot ctx={toolbarCtx} />}
            />
          </div>
        </div>
        {isArtifactView && activeSpace.campaign_id && !usesPaidAdsInlineDetail(activeView) ? (
          <ArtifactPreviewPanelHost
            parentRef={spaceBelowViewTabsRef}
            campaignId={activeSpace.campaign_id}
            selection={artifactPreviewSelection}
            onClose={() => setArtifactPreviewSelection(null)}
            onOpenFullView={() => {
              if (artifactPreviewSelection) {
                setArtifactQuery(artifactPreviewSelection.id)
                setArtifactPreviewSelection(null)
              }
            }}
          />
        ) : null}
        {isMediaView ? (
          <MediaPreviewPanelHost
            parentRef={spaceBelowViewTabsRef}
            selection={mediaPreviewAsset}
            onClose={() => setMediaPreviewAsset(null)}
            onAssetUpdated={(asset) => setMediaPreviewAsset(asset)}
            onOpenFullView={() => {
              if (mediaPreviewAsset) {
                setMediaDetailQuery(mediaPreviewAsset.id)
                setMediaDeepDetail({ id: mediaPreviewAsset.id, title: mediaPreviewAsset.name })
                setMediaPreviewAsset(null)
              }
            }}
          />
        ) : null}
      </div>

      <SpaceModalsHost
        activeSpace={activeSpace}
        activeView={activeView}
        activeSchema={activeSchema}
        roster={roster}
        fieldsForUi={fieldsForUi}
        fieldsById={fieldsById}
        currentUserId={currentUserId}
        customizePanelTargetView={customizePanelTargetView}
        panelInitialView={panelInitialView}
        schemaEditorOpen={schemaEditorOpen}
        canCustomizeViews={canCustomizeViews}
        customizeDropdownAnchorRef={customizeDropdownAnchorRef}
        customizeStageBounds={customizeStageBounds}
        viewOverrides={viewOverrides}
        isTeamSpace={isTeamSpace}
        canSaveForEveryone={canSaveForEveryone}
        statusEditorOpen={statusEditorOpen}
        categoryEditorOpen={categoryEditorOpen}
        automationsOpen={automationsOpen}
        assigneeFilterOpen={assigneeFilterOpen}
        spaceShareOpen={spaceShareOpen}
        spaceShareDualNavigator={spaceShareDualNavigator}
        docEditorItem={docEditorItem}
        selectedItem={selectedItem}
        taskHistory={taskHistory}
        pushTaskAndOpen={pushTaskAndOpen}
        popTask={popTask}
        isContactsView={isContactsView}
        contactsSegmentPanelOpen={contactsSegmentPanelOpen}
        activeContactsSegmentId={activeContactsSegmentId}
        contactsManualOpen={contactsManualOpen}
        contactsCsvOpen={contactsCsvOpen}
        contactsGhlOpen={contactsGhlOpen}
        contactsAcOpen={contactsAcOpen}
        contactsViewRef={contactsViewRef}
        setAssigneeFilterOpen={setAssigneeFilterOpen}
        closeCustomizePanel={closeCustomizePanel}
        handleViewPatch={handleViewPatch}
        handleViewPinToStart={handleViewPinToStart}
        handleDeleteActiveView={handleDeleteActiveView}
        handleIgAddAccount={handleIgAddAccount}
        handleIgSyncAccount={handleIgSyncAccount}
        handleIgRemoveAccount={handleIgRemoveAccount}
        handleAllSocialAddAccount={handleAllSocialAddAccount}
        handleAllSocialSyncAccount={handleAllSocialSyncAccount}
        handleAllSocialRemoveAccount={handleAllSocialRemoveAccount}
        handleSaveForEveryone={handleSaveForEveryone}
        handleResetViewToDefault={handleResetViewToDefault}
        setSpaceShareDualNavigator={setSpaceShareDualNavigator}
        setSpaceShareOpen={setSpaceShareOpen}
        setStatusEditorOpen={setStatusEditorOpen}
        setCategoryEditorOpen={setCategoryEditorOpen}
        setAutomationsOpen={setAutomationsOpen}
        setDocEditorItem={setDocEditorItem}
        setSelectedItem={setSelectedItem}
        setContactsSegmentPanelOpen={setContactsSegmentPanelOpen}
        setActiveContactsSegmentId={setActiveContactsSegmentId}
        setActiveContactsSegmentName={setActiveContactsSegmentName}
        setContactsManualOpen={setContactsManualOpen}
        setContactsCsvOpen={setContactsCsvOpen}
        setContactsGhlOpen={setContactsGhlOpen}
        setContactsAcOpen={setContactsAcOpen}
        refresh={refresh}
        reloadCampaignDocs={reloadCampaignDocs}
        onDocEditorDismiss={() => setArtifactQuery(null)}
        toggleToolbarAssigneeParticipant={toggleToolbarAssigneeParticipant}
        toggleToolbarMissionAgent={toggleToolbarMissionAgent}
        handleCreateFieldOption={handleCreateFieldOption}
        handleUpdateFieldOption={handleUpdateFieldOption}
        handleDeleteFieldOption={handleDeleteFieldOption}
        handleTagCustomSwatchesChange={handleTagCustomSwatchesChange}
      />
    </div>
  )
}
