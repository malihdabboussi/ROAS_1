'use client'

import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getIconColor } from '@/components/ui/IconPicker'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
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
import { SpaceModalsHost } from '../components/modals'
import type { CampaignFinanceTabHandle } from '../components/reporting/FinanceOverviewView'
import { SpaceItemUpdateProvider } from '../components/SpaceStatusCascadeConfirmProvider'
import { ViewSwitcher } from '../components/ViewSwitcher'
import { useAllSocialResearchAccountActions } from '../hooks/use-all-social-research-account-actions'
import { useCustomizeViewActions } from '../hooks/use-customize-view-actions'
import { useSpaceActiveView } from '../hooks/use-space-active-view'
import { useSpaceArtifactActions } from '../hooks/use-space-artifact-actions'
import { useSpaceCampaignDocs } from '../hooks/use-space-campaign-docs'
import { useSpaceCampaignName } from '../hooks/use-space-campaign-name'
import { useSpaceCurrentUserToolbarMeta } from '../hooks/use-space-current-user-toolbar-meta'
import { useSpaceCustomizeStageBounds } from '../hooks/use-space-customize-stage-bounds'
import { useSpaceFieldOptionActions } from '../hooks/use-space-field-option-actions'
import {
  useSpaceItemNavigationEvents,
  useSpaceSelectedItemSync,
} from '../hooks/use-space-item-navigation-events'
import { useSpaceItemsRealtime } from '../hooks/use-space-items-realtime'
import {
  useSpaceFocusViewTypeEvent,
  useSpaceMissionsViewFocus,
} from '../hooks/use-space-missions-view-focus'
import { useSpaceOpenInlineArtifactEvent } from '../hooks/use-space-open-inline-artifact-event'
import {
  useSpaceMediaDeepDetailClear,
  useSpaceOpenMediaEvent,
  useSpacePendingMediaQueryApply,
} from '../hooks/use-space-open-media-event'
import { useSpaceSocialAccountActions } from '../hooks/use-space-social-account-actions'
import { useSpaceSwitcherState } from '../hooks/use-space-switcher-state'
import { useSpaceToolbarFilters } from '../hooks/use-space-toolbar-filters'
import { useSpaceToolbarState } from '../hooks/use-space-toolbar-state'
import { useSpaceUrlViewSync } from '../hooks/use-space-url-view-sync'
import { useSpaceUserState } from '../hooks/use-space-user-state'
import { useSpaceWorkTabSync } from '../hooks/use-space-work-tab-sync'
import { useUpdateItemWithSubtaskCompleteConfirm } from '../hooks/use-update-item-with-subtask-complete-confirm'
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
import { resolveTaskCapableViewId } from '../lib/resolve-task-capable-view'
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
const MediaImageWorkspacePanelHost = dynamic(
  () =>
    import('../views/media/MediaImageWorkspacePanelHost').then(
      (mod) => mod.MediaImageWorkspacePanelHost,
    ),
  { loading: PreviewHostLoading },
)

export function SpaceItemsContainer() {
  const items = useSpacesStore((s) => s.items)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const itemsLoadedForSpaceId = useSpacesStore((s) => s.itemsLoadedForSpaceId)
  const spaces = useSpacesStore((s) => s.spaces)
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const activeViewId = useSpacesStore((s) => s.activeViewId)
  const setActiveView = useSpacesStore((s) => s.setActiveView)
  const storeUpdateItem = useSpacesStore((s) => s.updateItem)

  const focusTaskCapableViewIfNeeded = useCallback(
    (spaceId: string) => {
      const space = useSpacesStore.getState().spaces.find((row) => row.id === spaceId)
      const nextViewId = resolveTaskCapableViewId(
        space?.schema?.views,
        useSpacesStore.getState().activeViewId,
      )
      if (nextViewId) setActiveView(nextViewId)
    },
    [setActiveView],
  )
  const updateItemsBatch = useSpacesStore((s) => s.updateItemsBatch)
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

  useSpaceUrlViewSync()

  const patchSchema = patchActiveSpaceSchema as (s: SpaceSchema | Partial<SpaceSchema>) => void

  const financeOverviewRef = useRef<CampaignFinanceTabHandle | null>(null)
  const contactsViewRef = useRef<ContactsViewHandle | null>(null)
  const spaceBelowViewTabsRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prevActiveViewIdForArtifactQsRef = useRef<string | null>(null)

  const [artifactDeepDetail, setArtifactDeepDetail] = useState<{
    id: string
    title: string
  } | null>(null)
  const [artifactPreviewSelection, setArtifactPreviewSelection] =
    useState<ArtifactPreviewSelection | null>(null)
  const [mediaDeepDetail, setMediaDeepDetail] = useState<{ id: string; title: string } | null>(null)
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

  useSpaceWorkTabSync({
    spaceId: activeSpaceId,
    docEditorItem,
    selectedItem,
  })

  const { urlSpaceItemDeepLinkRef } = useSpaceItemNavigationEvents({
    activeSpaceId,
    items,
    itemsLoadedForSpaceId,
    focusTaskCapableViewIfNeeded,
    openSpaceItemModal,
    setDocEditorItem,
    setSelectedItem,
  })

  useSpaceSelectedItemSync(items, selectedItem, setSelectedItem)

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

  useSpaceFocusViewTypeEvent(activeSpaceId, setActiveView)

  useSpaceOpenInlineArtifactEvent({
    activeSpaceId,
    items,
    urlSpaceItemDeepLinkRef,
    focusTaskCapableViewIfNeeded,
    openSpaceItemModal,
    setActiveSpace,
    setActiveView,
    setArtifactQuery,
    setArtifactPreviewSelection,
    setDocEditorItem,
    setSelectedItem,
    refresh,
  })

  const { pendingMediaOpenRef } = useSpaceOpenMediaEvent({
    activeSpaceId,
    setActiveSpace,
    setActiveView,
    setMediaDeepDetail,
    setMediaDetailQuery,
    refresh,
  })

  const { missionsViewRef } = useSpaceMissionsViewFocus({
    activeSpace,
    activeSchema,
    activeView,
    activeSpaceId,
    patchSchema,
    setActiveView,
  })

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

  const statusField = useMemo(
    () => fieldsForUi.find((field) => field.id === 'status'),
    [fieldsForUi],
  )
  const { updateItem, dialog: completeSubtasksDialog } = useUpdateItemWithSubtaskCompleteConfirm({
    updateItem: storeUpdateItem,
    updateItemsBatch,
    items,
    statusField,
    spaceId: activeSpaceId,
    itemsLoadedForSpaceId,
  })

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

  useSpacePendingMediaQueryApply(
    isMediaView,
    pendingMediaOpenRef,
    setMediaDeepDetail,
    setMediaDetailQuery,
  )

  useSpaceMediaDeepDetailClear(mediaDetailId, pendingMediaOpenRef, setMediaDeepDetail)

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
    // Keep ?media= when landing on Media (chat image → workspace), same as docs deep links.
    if (isDocsView || isMediaView) return
    if (!searchParams.get(ARTIFACT_QUERY_KEY) && !searchParams.get(MEDIA_QUERY_KEY)) return
    const p = new URLSearchParams(searchParams.toString())
    p.delete(ARTIFACT_QUERY_KEY)
    p.delete(MEDIA_QUERY_KEY)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [activeViewId, isDocsView, isMediaView, pathname, router, searchParams])

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
    <SpaceItemUpdateProvider value={updateItem}>
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
                taskModalOpen={Boolean(selectedItem)}
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
            <MediaImageWorkspacePanelHost
              parentRef={spaceBelowViewTabsRef}
              mediaId={mediaDetailId}
              spaceId={activeSpace.id}
              campaignId={activeSpace.campaign_id ?? null}
              onClose={() => {
                setMediaDetailQuery(null)
                setMediaDeepDetail(null)
              }}
              onMetaChange={setMediaDeepDetail}
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
        {completeSubtasksDialog}
      </div>
    </SpaceItemUpdateProvider>
  )
}
