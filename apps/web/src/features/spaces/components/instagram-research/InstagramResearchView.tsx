'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  countAllSocialResearchAccounts,
  filterAllSocialResearchItems,
  flattenAllSocialResearchAccounts,
  getAllSocialResearchConfig,
  isAllSocialResearchView,
  platformForSocialResearchItem,
  resolveAllSocialResearchAccounts,
} from '../../lib/all-social-research'
import { groupIgItems } from '../../lib/ig-research-group-by'
import {
  buildIgListFieldDefs,
  resolveIgListEffectiveColumns,
} from '../../lib/ig-research-list-columns'
import { getIgMediaToggles } from '../../lib/ig-research-media-toggles'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../../lib/report-social-research-error'
import { spaceGroupBadgeChipProps } from '../../lib/space-group-badge-glass'
import {
  createFavoriteFolder,
  deleteFavoriteFolder,
  favoriteFolderIdsOf,
  listFavoriteFolders,
  renameFavoriteFolder,
  type FavoriteFolder,
} from '../../services/favorite-folders.service'
import {
  deleteSavedTopicSearch,
  getConnectedSocialHandle,
  isTopicPreviewItemId,
  listSavedTopicSearches,
  parseSocialHandle,
  runInlineIgResearchAnalyze,
  saveTopicResults,
  SOCIAL_VIEW_TYPE_BY_PLATFORM,
  topicPreviewMediaId,
  topicResultToPreviewItem,
  updateSavedTopicSearch,
  type SavedTopicSearchSummary,
  type TopicSearchResultItem,
} from '../../services/social-research.service'
import { updateSpaceItem } from '../../services/spaces.service'
import { researchViewKey, useResearchNavStore } from '../../store/use-research-nav-store'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import {
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  socialResearchConfigKeyForPlatform,
  type SocialPlatform,
  type SocialResearchConfig,
  type SocialResearchListColumnId,
  type SpaceSchema,
  type ViewDef,
} from '../../types/space-schema'
import { AssigneeGroupHeaderTitle } from '../AssigneeGroupHeaderTitle'
import { getDefaultWidth } from '../DraggableColumnHeaders'
import { resolveReportingDates } from '../reporting/shared/resolve-reporting-dates'
import {
  accountNavKey,
  parseAccountNavKey,
  RESEARCH_SIDEBAR_WIDTH_PX,
} from '../social-research/research-sidebar.utils'
import { ResearchSidebar } from '../social-research/ResearchSidebar'
import {
  BULK_ANALYZE_CONCURRENCY,
  runWithConcurrency,
} from '../social-research/run-with-concurrency'
import { cachedSocialProfileImageUrl } from '../social-research/social-image-proxy'
import { TopicSearchPanel } from '../social-research/TopicSearchPanel'
import { ContentAnalysisModal } from './ContentAnalysisModal'
import { ContentCard } from './ContentCard'
import { IgResearchBulkActionBar } from './IgResearchBulkActionBar'
import { IgResearchEmptyMockup } from './IgResearchEmptyMockup'
import {
  InstagramResearchListBody,
  resolveResearchPostUrl,
  type IgResearchListRowActionsProps,
} from './InstagramResearchList'
import { SocialPlatformGroupHeader } from './SocialPlatformGroupHeader'

interface InstagramResearchViewProps {
  view: ViewDef
  items: SpaceItem[]
  spaceId: string
  schema: SpaceSchema
  onViewPatch: (patch: Partial<ViewDef>) => void
  /** Opens customize panel on People sub-view (sidebar “New account”). */
  onOpenPeopleCustomize?: () => void
  /** Defaults to 'instagram' so existing call sites keep working without churn. */
  platform?: SocialPlatform
}

type ResearchNav =
  | { section: 'people'; accountKey: string | null; isNew: boolean }
  | { section: 'topic'; searchId: string | null; isNew: boolean }
  | { section: 'favorites'; folderId: string | null; isNew: boolean }

function resolveItemPlatform(
  item: SpaceItem,
  fallback: SocialPlatform,
  isAllPlatforms: boolean,
): SocialPlatform {
  if (!isAllPlatforms) return fallback
  return platformForSocialResearchItem(item.custom_data as Record<string, unknown>) ?? fallback
}

function igItemTakenAtDay(item: SpaceItem): string | null {
  const raw = (item.custom_data as Record<string, unknown>)?.taken_at
  if (raw == null) return null
  if (typeof raw === 'string') {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0] ?? null
  }
  return null
}

function igTakenAtInResolvedRange(
  takenDay: string | null,
  start: string | undefined,
  end: string | undefined,
): boolean {
  if (!start && !end) return true
  if (!takenDay) return true
  const today = new Date().toISOString().split('T')[0]!
  const effectiveEnd = end ?? (start ? today : undefined)
  if (start && takenDay < start) return false
  if (effectiveEnd && takenDay > effectiveEnd) return false
  return true
}

function lastRunLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function InstagramResearchView({
  view,
  items,
  spaceId,
  schema,
  onViewPatch,
  onOpenPeopleCustomize,
  platform = 'instagram',
}: InstagramResearchViewProps) {
  const refresh = useSpacesStore((s) => s.refresh)
  const isAllPlatforms = isAllSocialResearchView(view)
  // Topic search covers YouTube/Instagram/TikTok — X has no keyword search upstream.
  const topicSearchAvailable = isAllPlatforms || platform !== 'twitter'
  const [nav, setNav] = useState<ResearchNav>({
    section: 'people',
    accountKey: null,
    isNew: true,
  })
  const [topicDraftSessionKey, setTopicDraftSessionKey] = useState(0)
  const topicLiveDraftRef = useRef(false)
  const previewSourceRef = useRef<{ result: TopicSearchResultItem; query: string } | null>(null)
  const [savedTopicSearches, setSavedTopicSearches] = useState<SavedTopicSearchSummary[]>([])
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolder[]>([])
  const [topicLoadingId, setTopicLoadingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<SpaceItem | null>(null)
  const [openVideoExpandedForSlide, setOpenVideoExpandedForSlide] = useState(false)
  const [igListSelectedIds, setIgListSelectedIds] = useState<Set<string>>(new Set())
  const [igListItemPatches, setIgListItemPatches] = useState<Map<string, SpaceItem>>(
    () => new Map(),
  )
  const [analyzingIgItemIds, setAnalyzingIgItemIds] = useState<Set<string>>(() => new Set())
  const [igListBulkBusy, setIgListBulkBusy] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [connectedHandle, setConnectedHandle] = useState<string | null>(null)
  const [connectedHandlesByPlatform, setConnectedHandlesByPlatform] = useState<
    Partial<Record<SocialPlatform, string | null>>
  >({})
  const configKey = isAllPlatforms
    ? 'all_social_research_config'
    : socialResearchConfigKeyForPlatform(platform)
  const viewType = SOCIAL_VIEW_TYPE_BY_PLATFORM[platform]

  const savedTopicSearchesFetchKey = `${spaceId}:${topicSearchAvailable}:${isAllPlatforms}:${platform}`

  const reloadSavedTopicSearches = useCallback(() => {
    if (!topicSearchAvailable) return
    void listSavedTopicSearches(spaceId)
      .then((searches) => {
        // Each platform view shows only its own searches so research stays
        // organized per platform; the all-platforms view shows everything.
        setSavedTopicSearches(
          isAllPlatforms ? searches : searches.filter((s) => s.platform === platform),
        )
      })
      .catch(() => undefined)
  }, [spaceId, topicSearchAvailable, isAllPlatforms, platform])

  useEffect(() => {
    reloadSavedTopicSearches()
  }, [reloadSavedTopicSearches, savedTopicSearchesFetchKey])

  useEffect(() => {
    if (isAllPlatforms) {
      let cancelled = false
      void Promise.all(
        (['instagram', 'tiktok', 'youtube', 'twitter'] as SocialPlatform[]).map(async (p) => {
          const h = await getConnectedSocialHandle(p)
          return [p, h] as const
        }),
      ).then((entries) => {
        if (cancelled) return
        setConnectedHandlesByPlatform(Object.fromEntries(entries))
      })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    void getConnectedSocialHandle(platform).then((h) => {
      if (!cancelled) setConnectedHandle(h)
    })
    return () => {
      cancelled = true
    }
  }, [platform, isAllPlatforms])

  useEffect(() => {
    if (!selectedItem) return
    const previewMediaId = topicPreviewMediaId(selectedItem.id)
    const fresh =
      items.find((i) => i.id === selectedItem.id) ??
      (previewMediaId
        ? items.find((i) => (i.custom_data as Record<string, unknown>)?.media_id === previewMediaId)
        : undefined)
    if (fresh) {
      setSelectedItem(fresh)
      return
    }
    if (isTopicPreviewItemId(selectedItem.id)) return
    if (items.length > 0) {
      setSelectedItem(null)
    }
  }, [items, selectedItem?.id])

  const config: SocialResearchConfig = isAllPlatforms
    ? getAllSocialResearchConfig(view)
    : {
        ...DEFAULT_SOCIAL_RESEARCH_CONFIG,
        ...view[configKey],
      }

  const setResearchSection = useResearchNavStore((s) => s.setSection)
  const researchNavSyncKey = `${spaceId}:${view.id}:${nav.section}`
  useEffect(() => {
    setResearchSection(researchViewKey(spaceId, view.id), nav.section)
  }, [researchNavSyncKey, setResearchSection])

  const mergedAccountsByPlatform = useMemo(() => {
    if (!isAllPlatforms) return null
    return resolveAllSocialResearchAccounts(schema, view)
  }, [isAllPlatforms, schema, view])

  const igItems = useMemo(() => {
    if (isAllPlatforms) {
      const allConfig = getAllSocialResearchConfig(view)
      const { startDate: rangeStart, endDate: rangeEnd } = resolveReportingDates({
        time_range: allConfig.time_range,
        custom_start: allConfig.custom_start,
        custom_end: allConfig.custom_end,
      })
      return filterAllSocialResearchItems(items, allConfig, {
        rangeStart,
        rangeEnd,
        connectedHandles: connectedHandlesByPlatform,
      })
    }

    let filtered = items.filter(
      (item) => (item.custom_data as Record<string, unknown>)?._view_type === viewType,
    )

    const {
      reels: showReels,
      images: showImages,
      slideshows: showSlideshows,
      youtubeVideos: showYoutubeVideos,
      youtubeShorts: showYoutubeShorts,
      xTweets: showXTweets,
      xVideos: showXVideos,
    } = getIgMediaToggles(config, platform)
    if (platform === 'youtube') {
      if (!showYoutubeVideos || !showYoutubeShorts) {
        filtered = filtered.filter((item) => {
          const mt = (item.custom_data as Record<string, unknown>)?.media_type
          if (mt === 'youtube_video') return showYoutubeVideos
          if (mt === 'youtube_short') return showYoutubeShorts
          return true
        })
      }
    } else if (platform === 'twitter') {
      if (!showXTweets || !showXVideos) {
        filtered = filtered.filter((item) => {
          const mt = (item.custom_data as Record<string, unknown>)?.media_type
          if (mt === 'tweet') return showXTweets
          if (mt === 'tweet_video') return showXVideos
          return true
        })
      }
    } else if (!showReels || !showImages || (platform === 'tiktok' && !showSlideshows)) {
      filtered = filtered.filter((item) => {
        const mt = (item.custom_data as Record<string, unknown>)?.media_type
        if (mt === 'reel') return showReels
        if (mt === 'slideshow') return showSlideshows
        if (mt === 'image' || mt === 'carousel' || mt === 'post') return showImages
        return true
      })
    }

    if (config.show_connected_ig_in_grid === false && connectedHandle) {
      const h = parseSocialHandle(platform, connectedHandle).toLowerCase()
      filtered = filtered.filter(
        (item) =>
          String((item.custom_data as Record<string, unknown>)?._handle ?? '').toLowerCase() !== h,
      )
    }

    const peopleHidden = config.people_hidden_handles
    if (peopleHidden?.length) {
      const hiddenSet = new Set(peopleHidden.map((x) => x.toLowerCase()))
      filtered = filtered.filter((item) => {
        const h = String((item.custom_data as Record<string, unknown>)?._handle ?? '').toLowerCase()
        return !hiddenSet.has(h)
      })
    }

    if (config.min_outlier_score && config.min_outlier_score > 0) {
      filtered = filtered.filter(
        (item) =>
          ((item.custom_data as Record<string, unknown>)?.outlier_score as number) >=
          config.min_outlier_score!,
      )
    }

    const { startDate: rangeStart, endDate: rangeEnd } = resolveReportingDates({
      time_range: config.time_range,
      custom_start: config.custom_start,
      custom_end: config.custom_end,
    })
    filtered = filtered.filter((item) =>
      igTakenAtInResolvedRange(igItemTakenAtDay(item), rangeStart, rangeEnd),
    )

    const sortField = config.sort_by ?? 'outlier_score'
    const sortDir = config.sort_dir ?? 'desc'
    filtered.sort((a, b) => {
      const aVal = (a.custom_data as Record<string, unknown>)?.[sortField]
      const bVal = (b.custom_data as Record<string, unknown>)?.[sortField]
      const aNum =
        typeof aVal === 'number' ? aVal : typeof aVal === 'string' ? new Date(aVal).getTime() : 0
      const bNum =
        typeof bVal === 'number' ? bVal : typeof bVal === 'string' ? new Date(bVal).getTime() : 0
      return sortDir === 'desc' ? bNum - aNum : aNum - bNum
    })

    return filtered
  }, [
    items,
    config,
    connectedHandle,
    connectedHandlesByPlatform,
    viewType,
    platform,
    isAllPlatforms,
    view,
  ])

  const accountGroupAvatarByKey = useMemo(() => {
    const m = new Map<string, string>()
    if (isAllPlatforms && mergedAccountsByPlatform) {
      for (const [platformKey, accounts] of Object.entries(mergedAccountsByPlatform)) {
        const p = platformKey as SocialPlatform
        for (const a of accounts ?? []) {
          const avatarUrl = cachedSocialProfileImageUrl(p, a)
          if (avatarUrl) m.set(a.handle.toLowerCase(), avatarUrl)
        }
      }
      return m
    }
    for (const a of config.tracked_accounts) {
      const avatarUrl = cachedSocialProfileImageUrl(platform, a)
      if (avatarUrl) m.set(a.handle.toLowerCase(), avatarUrl)
    }
    return m
  }, [config.tracked_accounts, mergedAccountsByPlatform, platform, isAllPlatforms])

  const trackedAccountCount = isAllPlatforms
    ? countAllSocialResearchAccounts(mergedAccountsByPlatform ?? {})
    : config.tracked_accounts.length

  const sidebarPeopleAccounts = useMemo(() => {
    if (isAllPlatforms && mergedAccountsByPlatform) {
      return flattenAllSocialResearchAccounts(mergedAccountsByPlatform).map(
        ({ platform: p, account }) => ({
          platform: p,
          account,
          accountKey: accountNavKey(p, account.handle),
        }),
      )
    }
    return config.tracked_accounts.map((account) => ({
      platform,
      account,
      accountKey: accountNavKey(platform, account.handle),
    }))
  }, [config.tracked_accounts, isAllPlatforms, mergedAccountsByPlatform, platform])

  const displayedIgItems = useMemo(() => {
    if (nav.section !== 'people' || nav.isNew) return []
    if (!nav.accountKey) return igItems.map((item) => igListItemPatches.get(item.id) ?? item)
    const { platform: accountPlatform, handle } = parseAccountNavKey(nav.accountKey)
    const handleLower = handle.toLowerCase()
    return igItems
      .filter((item) => {
        const itemHandle = String(
          (item.custom_data as Record<string, unknown>)?._handle ?? '',
        ).toLowerCase()
        if (itemHandle !== handleLower) return false
        if (isAllPlatforms) {
          return (
            platformForSocialResearchItem(item.custom_data as Record<string, unknown>) ===
            accountPlatform
          )
        }
        return true
      })
      .map((item) => igListItemPatches.get(item.id) ?? item)
  }, [igItems, igListItemPatches, isAllPlatforms, nav])

  const displayedGroups = useMemo(() => {
    if (!config.group_by) return null
    return groupIgItems(
      displayedIgItems as Array<{ custom_data: Record<string, unknown> }>,
      config.group_by,
      config.group_sort,
    )
  }, [displayedIgItems, config.group_by, config.group_sort])

  const renameSavedSearch = useCallback(
    async (summary: SavedTopicSearchSummary, title: string) => {
      setSavedTopicSearches((prev) => prev.map((s) => (s.id === summary.id ? { ...s, title } : s)))
      try {
        await updateSavedTopicSearch(spaceId, summary.id, { title })
      } catch (err) {
        reportSocialResearchError(
          'topic_search_rename_failed',
          err,
          socialResearchContext(spaceId, summary.platform, { search_id: summary.id }),
        )
      }
    },
    [spaceId],
  )

  const removeSavedSearch = useCallback(
    async (summary: SavedTopicSearchSummary) => {
      setSavedTopicSearches((prev) => prev.filter((s) => s.id !== summary.id))
      if (nav.section === 'topic' && nav.searchId === summary.id) {
        setNav({ section: 'topic', searchId: null, isNew: true })
      }
      try {
        await deleteSavedTopicSearch(spaceId, summary.id)
      } catch (err) {
        reportSocialResearchError(
          'topic_search_delete_failed',
          err,
          socialResearchContext(spaceId, summary.platform, { search_id: summary.id }),
        )
      }
    },
    [nav, spaceId],
  )

  const resolveListItemPlatform = useCallback(
    (item: SpaceItem) => resolveItemPlatform(item, platform, isAllPlatforms),
    [platform, isAllPlatforms],
  )

  const listVisibleColumns = useMemo(
    () => resolveIgListEffectiveColumns(config),
    [config.list_visible_columns],
  )

  const igListFieldDefs = useMemo(
    () => buildIgListFieldDefs(listVisibleColumns),
    [listVisibleColumns],
  )

  const savedIgListWidthsKey = JSON.stringify(config.list_column_widths ?? {})

  const [igListColumnWidths, setIgListColumnWidths] = useState<Record<string, number>>({})

  useEffect(() => {
    const m: Record<string, number> = {}
    for (const f of igListFieldDefs) {
      m[f.id] = config.list_column_widths?.[f.id] ?? getDefaultWidth(f.id)
    }
    setIgListColumnWidths(m)
  }, [igListFieldDefs, savedIgListWidthsKey])

  const handleIgListColumnResize = useCallback((fieldId: string, width: number) => {
    setIgListColumnWidths((prev) => ({ ...prev, [fieldId]: width }))
  }, [])

  const persistIgListColumnWidths = useCallback(() => {
    onViewPatch({
      [configKey]: {
        ...config,
        list_column_widths: { ...igListColumnWidths },
      },
    })
  }, [config, configKey, igListColumnWidths, onViewPatch])

  const handleIgListColumnReorder = useCallback(
    async (dataColumnIds: SocialResearchListColumnId[]) => {
      onViewPatch({
        [configKey]: { ...config, list_visible_columns: dataColumnIds },
      })
    },
    [config, configKey, onViewPatch],
  )

  const isListMode = (config.display_mode ?? 'grid') === 'list'

  useEffect(() => {
    if (!isListMode) setIgListSelectedIds(new Set())
  }, [isListMode])

  const navAccountKey = nav.section === 'people' ? nav.accountKey : null
  useEffect(() => {
    setIgListSelectedIds(new Set())
  }, [nav.section, navAccountKey])

  const igListClearSelection = useCallback(() => {
    setIgListSelectedIds(new Set())
  }, [])

  const igListToggleSelect = useCallback((id: string) => {
    setIgListSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const igListBulkSelectInScope = useCallback((itemIds: string[], select: boolean) => {
    setIgListSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of itemIds) {
        if (select) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const openContentAnalysis = useCallback(
    (item: SpaceItem, opts?: { openVideoExpanded?: boolean; itemPlatform?: SocialPlatform }) => {
      setOpenVideoExpandedForSlide(Boolean(opts?.openVideoExpanded))
      setSelectedItem(item)
    },
    [],
  )

  const analyzeIgListItem = useCallback(
    async (item: SpaceItem, itemPlatform: SocialPlatform) => {
      if (analyzingIgItemIds.has(item.id)) return

      setAnalyzingIgItemIds((prev) => new Set(prev).add(item.id))
      try {
        const cd = (item.custom_data ?? {}) as Record<string, unknown>
        const shortcode = String(cd.shortcode ?? '')
        const patched = await runInlineIgResearchAnalyze({
          platform: itemPlatform,
          spaceId,
          item,
          shortcode,
          handle: String(cd._handle ?? ''),
          isSlideshow: cd.media_type === 'slideshow',
        })
        setIgListItemPatches((prev) => new Map(prev).set(item.id, patched))
      } finally {
        setAnalyzingIgItemIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }
    },
    [analyzingIgItemIds, spaceId],
  )

  const resolveIgListRowActions = useCallback(
    (item: SpaceItem, itemPlatform: SocialPlatform): IgResearchListRowActionsProps => {
      const cd = (item.custom_data ?? {}) as Record<string, unknown>
      return {
        postUrl: resolveResearchPostUrl(item, itemPlatform),
        analyzing: analyzingIgItemIds.has(item.id),
        analyzed: Boolean(cd.analyzed_at),
        onAnalyze: () => void analyzeIgListItem(item, itemPlatform),
      }
    },
    [analyzeIgListItem, analyzingIgItemIds],
  )

  const allPeopleListItems = useMemo(() => {
    if (displayedGroups) {
      return displayedGroups.flatMap((group) => group.items as unknown as SpaceItem[])
    }
    return displayedIgItems
  }, [displayedGroups, displayedIgItems])

  const bulkAnalyzeIgListSelection = useCallback(async () => {
    if (igListBulkBusy) return
    const selected = allPeopleListItems.filter((item) => igListSelectedIds.has(item.id))
    if (selected.length === 0) return

    setIgListBulkBusy(true)
    try {
      // Each analyze is a multi-second upstream call — run a bounded pool
      // instead of one-at-a-time; per-row spinners report individual progress.
      await runWithConcurrency(selected, BULK_ANALYZE_CONCURRENCY, (item) =>
        analyzeIgListItem(item, resolveListItemPlatform(item)),
      )
    } finally {
      setIgListBulkBusy(false)
      igListClearSelection()
    }
  }, [
    allPeopleListItems,
    analyzeIgListItem,
    igListBulkBusy,
    igListClearSelection,
    igListSelectedIds,
    resolveListItemPlatform,
  ])

  useEffect(() => {
    let cancelled = false
    void listFavoriteFolders(spaceId)
      .then((folders) => {
        if (!cancelled) setFavoriteFolders(folders)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [spaceId])

  const favoriteFolderEntries = useMemo(
    () =>
      favoriteFolders.map((folder) => ({
        folder,
        count: items.filter((i) =>
          favoriteFolderIdsOf(i.custom_data as Record<string, unknown>).includes(folder.id),
        ).length,
      })),
    [favoriteFolders, items],
  )

  const favoriteGridItems = useMemo(() => {
    if (nav.section !== 'favorites' || !nav.folderId) return []
    const folderId = nav.folderId
    return items.filter((i) =>
      favoriteFolderIdsOf(i.custom_data as Record<string, unknown>).includes(folderId),
    )
  }, [items, nav])

  const handleCreateFavoriteFolder = useCallback(
    async (name: string): Promise<FavoriteFolder | null> => {
      try {
        const folder = await createFavoriteFolder(spaceId, name)
        setFavoriteFolders((prev) => [...prev, folder])
        return folder
      } catch (err) {
        reportSocialResearchError(
          'favorite_folder_create_failed',
          err,
          socialResearchContext(spaceId, platform),
        )
        return null
      }
    },
    [spaceId],
  )

  const handleRenameFavoriteFolder = useCallback(
    async (folder: FavoriteFolder, name: string) => {
      try {
        await renameFavoriteFolder(spaceId, folder.id, name)
        setFavoriteFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name } : f)))
      } catch (err) {
        reportSocialResearchError(
          'favorite_folder_rename_failed',
          err,
          socialResearchContext(spaceId, platform, { folder_id: folder.id }),
        )
      }
    },
    [spaceId],
  )

  const handleDeleteFavoriteFolder = useCallback(
    async (folder: FavoriteFolder) => {
      try {
        await deleteFavoriteFolder(spaceId, folder.id)
        setFavoriteFolders((prev) => prev.filter((f) => f.id !== folder.id))
        setNav((prev) =>
          prev.section === 'favorites' && prev.folderId === folder.id
            ? { section: 'people', accountKey: null, isNew: true }
            : prev,
        )
      } catch (err) {
        reportSocialResearchError(
          'favorite_folder_delete_failed',
          err,
          socialResearchContext(spaceId, platform, { folder_id: folder.id }),
        )
      }
    },
    [spaceId],
  )

  const toggleItemFavoriteFolder = useCallback(
    async (item: SpaceItem, folder: FavoriteFolder) => {
      const current = favoriteFolderIdsOf(item.custom_data as Record<string, unknown>)
      const next = current.includes(folder.id)
        ? current.filter((id) => id !== folder.id)
        : [...current, folder.id]
      try {
        await updateSpaceItem(spaceId, item.id, {
          custom_data: { favorite_folder_ids: next },
        })
        void refresh()
      } catch (err) {
        reportSocialResearchError(
          'favorite_item_toggle_failed',
          err,
          socialResearchContext(spaceId, platform, { item_id: item.id }),
        )
      }
    },
    [refresh, spaceId],
  )

  // Topic results may not be persisted yet — save first, then tag the folder.
  const favoriteTopicResult = useCallback(
    async (
      result: TopicSearchResultItem,
      query: string,
      folder: FavoriteFolder,
      currentIds: string[],
    ): Promise<string[] | null> => {
      try {
        let itemId: string | null = null
        const existing = items.find(
          (i) => (i.custom_data as Record<string, unknown>)?.media_id === result.media_id,
        )
        if (existing) {
          itemId = String(existing.id)
        } else {
          const saved = await saveTopicResults(result.platform, spaceId, query, [result])
          itemId = saved.itemIds[0] ?? null
        }
        if (!itemId) return null
        const next = currentIds.includes(folder.id)
          ? currentIds.filter((id) => id !== folder.id)
          : [...currentIds, folder.id]
        await updateSpaceItem(spaceId, itemId, {
          custom_data: { favorite_folder_ids: next },
        })
        void refresh()
        return next
      } catch (err) {
        reportSocialResearchError(
          'topic_result_favorite_failed',
          err,
          socialResearchContext(spaceId, result.platform, {
            media_id: result.media_id,
            query,
          }),
        )
        return null
      }
    },
    [items, refresh, spaceId],
  )

  const openTopicPreview = useCallback(
    (result: TopicSearchResultItem, context?: { query: string }) => {
      const saved = items.find(
        (i) => (i.custom_data as Record<string, unknown>)?.media_id === result.media_id,
      )
      setOpenVideoExpandedForSlide(false)
      previewSourceRef.current = { result, query: context?.query ?? '' }
      setSelectedItem(saved ?? topicResultToPreviewItem(result, spaceId))
    },
    [items, spaceId],
  )

  // Analysis persists enrichment onto the item, so previews must become real
  // research items first. Returns the persisted item id, or null on failure.
  const persistTopicPreview = useCallback(async (): Promise<string | null> => {
    const source = previewSourceRef.current
    if (!source) return null
    const { result, query } = source
    const saved = await saveTopicResults(result.platform, spaceId, query, [result])
    if (saved.itemIds.length > 0) {
      void refresh()
      return saved.itemIds[0] ?? null
    }
    // Skipped means it already exists in the space — find it by media id.
    const existing = items.find(
      (i) => (i.custom_data as Record<string, unknown>)?.media_id === result.media_id,
    )
    return existing ? String(existing.id) : null
  }, [items, refresh, spaceId])

  const renderGrid = (subset: SpaceItem[]) => (
    <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {subset.map((item) => {
        const itemPlatform = resolveItemPlatform(item, platform, isAllPlatforms)
        return (
          <ContentCard
            key={item.id}
            item={item}
            platform={itemPlatform}
            favoriteFolders={favoriteFolders}
            onToggleFavoriteFolder={toggleItemFavoriteFolder}
            onCreateFavoriteFolder={handleCreateFavoriteFolder}
            onClick={(i) => openContentAnalysis(i, { itemPlatform })}
          />
        )
      })}
    </div>
  )

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const renderPeopleEmpty = () => (
    <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-4 flex flex-1 flex-col items-center justify-center text-center">
      <IgResearchEmptyMockup />
      <div className="space-y-spacing-1">
        <p className="title-h6 text-foreground">
          {trackedAccountCount === 0
            ? 'No tracked accounts yet'
            : nav.isNew
              ? 'Select an account'
              : 'No content found'}
        </p>
        <p className="body-3 text-muted-foreground max-w-xs">
          {trackedAccountCount === 0
            ? isAllPlatforms
              ? 'Add IG, TikTok, YouTube, or X accounts — content syncs here.'
              : platform === 'twitter'
                ? 'Add X handles — tweets and videos sync here.'
                : platform === 'youtube'
                  ? 'Add YouTube channels — videos and Shorts sync here.'
                  : platform === 'tiktok'
                    ? 'Add TikTok handles — videos sync here.'
                    : 'Add Instagram handles — reels and posts sync here.'
            : nav.isNew
              ? 'Choose a tracked account from the sidebar, or click People to see everything.'
            : 'Widen the date range, loosen filters, or sync accounts.'}
        </p>
      </div>
    </div>
  )

  const renderTopicOverview = () => (
    <div className="p-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
      {savedTopicSearches.length === 0 ? (
        <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-4 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <IgResearchEmptyMockup />
          <div className="space-y-spacing-1">
            <p className="title-h6 text-foreground">No topic searches yet</p>
            <p className="body-3 text-muted-foreground max-w-sm">
              Start a topic search and saved runs will collect here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-spacing-3 md:grid-cols-2 xl:grid-cols-3">
          {savedTopicSearches.map((search) => (
            <button
              key={search.id}
              type="button"
              onClick={() => setNav({ section: 'topic', searchId: search.id, isNew: false })}
              className="surface-card border-border rounded-spacing-3 p-spacing-4 hover:bg-hover-subtle flex min-h-0 flex-col items-start gap-spacing-2 border text-left transition-colors"
            >
              <div className="gap-spacing-2 flex w-full min-w-0 items-center">
                <Search className="icon-sm text-muted-foreground shrink-0" />
                <span className="body-2 text-foreground min-w-0 flex-1 truncate font-semibold">
                  {search.title}
                </span>
              </div>
              <p className="body-3 text-muted-foreground line-clamp-2">&ldquo;{search.query}&rdquo;</p>
              <div className="body-4 text-muted-foreground mt-auto flex w-full items-center justify-between gap-spacing-2">
                <span>{search.result_count} results</span>
                <span>{search.last_run_at ? lastRunLabel(search.last_run_at) : 'not run yet'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div
      className="gap-spacing-2 pl-spacing-3 flex flex-1 overflow-hidden"
      onMouseUp={isListMode ? persistIgListColumnWidths : undefined}
    >
      <div
        className="pb-spacing-3 relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
        style={{ width: `${RESEARCH_SIDEBAR_WIDTH_PX}px` }}
      >
        <div className="card-glass flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0">
          <ResearchSidebar
            favoriteFolders={favoriteFolderEntries}
            favoritesActiveFolderId={nav.section === 'favorites' ? nav.folderId : null}
            onSelectFavoriteFolder={(folderId) =>
              setNav({ section: 'favorites', folderId, isNew: false })
            }
            onCreateFavoriteFolder={handleCreateFavoriteFolder}
            onRenameFavoriteFolder={(folder, name) => void handleRenameFavoriteFolder(folder, name)}
            onDeleteFavoriteFolder={(folder) => void handleDeleteFavoriteFolder(folder)}
            peopleAccounts={sidebarPeopleAccounts}
            peopleActiveKey={nav.section === 'people' && !nav.isNew ? nav.accountKey : null}
            peopleNewActive={nav.section === 'people' && nav.isNew}
            topicSearchAvailable={topicSearchAvailable}
            savedSearches={savedTopicSearches}
            topicActiveId={nav.section === 'topic' && !nav.isNew ? nav.searchId : null}
            topicNewActive={nav.section === 'topic' && nav.isNew}
            topicLoadingId={topicLoadingId}
            peopleAllActive={nav.section === 'people' && !nav.isNew && !nav.accountKey}
            topicAllActive={nav.section === 'topic' && !nav.isNew && !nav.searchId}
            onSelectAllPeople={() =>
              setNav({ section: 'people', accountKey: null, isNew: false })
            }
            onSelectAllTopics={() =>
              setNav({ section: 'topic', searchId: null, isNew: false })
            }
            onNewAccount={() => {
              setNav({ section: 'people', accountKey: null, isNew: true })
              onOpenPeopleCustomize?.()
            }}
            onSelectAccount={(accountKey) =>
              setNav({ section: 'people', accountKey, isNew: false })
            }
            onNewSearch={() => {
              const resumeLiveDraft = nav.section !== 'topic' && topicLiveDraftRef.current
              if (!resumeLiveDraft) {
                setTopicDraftSessionKey((key) => key + 1)
              }
              setNav({ section: 'topic', searchId: null, isNew: true })
            }}
            onSelectSearch={(search) =>
              setNav({ section: 'topic', searchId: search.id, isNew: false })
            }
            onRenameSearch={(s, title) => void renameSavedSearch(s, title)}
            onDeleteSearch={(s) => void removeSavedSearch(s)}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {topicSearchAvailable ? (
          <div
            className={cn(
              'flex h-full min-h-0 flex-1 flex-col',
              nav.section !== 'topic' && 'hidden',
            )}
          >
            {nav.section === 'topic' && !nav.isNew && !nav.searchId ? (
              renderTopicOverview()
            ) : (
              <TopicSearchPanel
                platform={isAllPlatforms ? 'youtube' : platform}
                spaceId={spaceId}
                viewId={view.id}
                researchConfig={config}
                onResearchConfigPatch={(patch) =>
                  onViewPatch({ [configKey]: { ...config, ...patch } })
                }
                allowPlatformSwitch={isAllPlatforms}
                onSaved={refresh}
                onItemClick={openTopicPreview}
                savedSearches={savedTopicSearches}
                onSavedSearchesChange={setSavedTopicSearches}
                activeSavedSearchId={nav.section === 'topic' && !nav.isNew ? nav.searchId : null}
                isNewSearchDraft={nav.section === 'topic' && nav.isNew}
                draftSessionKey={topicDraftSessionKey}
                onLiveDraftChange={(hasLiveDraft) => {
                  topicLiveDraftRef.current = hasLiveDraft
                }}
                onSavedSearchCreated={reloadSavedTopicSearches}
                favoriteFolders={favoriteFolders}
                onCreateFavoriteFolder={handleCreateFavoriteFolder}
                onToggleFavorite={favoriteTopicResult}
                onActiveSavedSearchIdChange={(id) => {
                  if (id === null) {
                    setNav((prev) =>
                      prev.section === 'topic'
                        ? { section: 'topic', searchId: null, isNew: false }
                        : prev,
                    )
                    return
                  }
                  setNav({ section: 'topic', searchId: id, isNew: false })
                }}
                onLoadingSavedIdChange={setTopicLoadingId}
                researchItems={items}
                isListMode={isListMode}
                listVisibleColumns={listVisibleColumns}
                listColumnWidths={igListColumnWidths}
                onListColumnResize={handleIgListColumnResize}
                onListColumnReorder={handleIgListColumnReorder}
                onListColumnWidthsPersist={persistIgListColumnWidths}
              />
            )}
          </div>
        ) : null}
        {nav.section === 'favorites' ? (
          favoriteGridItems.length === 0 ? (
            <div className="gap-spacing-3 flex flex-1 flex-col items-center justify-center text-center">
              <Star className="h-8 w-8 text-[var(--color-muted-foreground)] opacity-40" />
              <div className="space-y-spacing-1">
                <p className="title-h6 text-foreground">Nothing here yet</p>
                <p className="body-3 text-muted-foreground max-w-xs">
                  Star posts anywhere in research and add them to this folder.
                </p>
              </div>
            </div>
          ) : (
            <div className="pr-spacing-3 pb-spacing-3 flex-1 overflow-y-auto">
              {renderGrid(favoriteGridItems)}
            </div>
          )
        ) : nav.section === 'topic' && topicSearchAvailable ? null : nav.section !== 'people' ||
          nav.isNew ? (
          renderPeopleEmpty()
        ) : displayedIgItems.length === 0 ? (
          renderPeopleEmpty()
        ) : displayedGroups ? (
          <div className="gap-spacing-10 flex flex-1 flex-col overflow-y-auto">
            {displayedGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key)
              const groupChip = group.color ? spaceGroupBadgeChipProps(group.color) : null
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="group/header flex w-full min-w-0 cursor-pointer appearance-none items-center gap-2 border-0 bg-transparent px-4 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    <span className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)]">
                      <ChevronRight
                        className={`h-3 w-3 transition-transform duration-150 ${!isCollapsed ? 'rotate-90' : ''}`}
                      />
                    </span>
                    {config.group_by === 'platform' ? (
                      <SocialPlatformGroupHeader
                        platform={group.key as SocialPlatform}
                        label={group.label}
                      />
                    ) : config.group_by === 'account' ? (
                      <AssigneeGroupHeaderTitle
                        label={group.label}
                        avatarUrl={accountGroupAvatarByKey.get(group.key.toLowerCase()) ?? null}
                        isUnassigned={false}
                      />
                    ) : (
                      <span
                        className={cn(
                          'rounded-spacing-2 inline-flex shrink-0 items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider',
                          groupChip
                            ? groupChip.chipClassName
                            : 'badge-glass text-[var(--foreground)]',
                        )}
                        style={groupChip?.style}
                      >
                        {group.label}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                      {group.items.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className={isListMode ? 'min-w-0 px-4 pb-4 pt-0' : 'p-4 pt-0'}>
                      {isListMode ? (
                        <InstagramResearchListBody
                          listSection="grouped"
                          items={group.items as unknown as SpaceItem[]}
                          platform={platform}
                          resolveItemPlatform={isAllPlatforms ? resolveListItemPlatform : undefined}
                          visibleColumnIds={listVisibleColumns}
                          columnWidths={igListColumnWidths}
                          onColumnResize={handleIgListColumnResize}
                          onColumnReorder={handleIgListColumnReorder}
                          onRowClick={openContentAnalysis}
                          selectedIds={igListSelectedIds}
                          onToggleSelect={igListToggleSelect}
                          onBulkSelectInScope={igListBulkSelectInScope}
                          resolveRowActions={(item, itemPlatform) =>
                            resolveIgListRowActions(item, itemPlatform)
                          }
                        />
                      ) : (
                        renderGrid(group.items as unknown as SpaceItem[])
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`flex-1 overflow-y-auto ${isListMode ? 'min-w-0 p-4' : 'p-4'}`}>
            {isListMode ? (
              <InstagramResearchListBody
                listSection="ungrouped"
                items={displayedIgItems}
                platform={platform}
                resolveItemPlatform={isAllPlatforms ? resolveListItemPlatform : undefined}
                visibleColumnIds={listVisibleColumns}
                columnWidths={igListColumnWidths}
                onColumnResize={handleIgListColumnResize}
                onColumnReorder={handleIgListColumnReorder}
                onRowClick={openContentAnalysis}
                selectedIds={igListSelectedIds}
                onToggleSelect={igListToggleSelect}
                onBulkSelectInScope={igListBulkSelectInScope}
                resolveRowActions={(item, itemPlatform) =>
                  resolveIgListRowActions(item, itemPlatform)
                }
              />
            ) : (
              renderGrid(displayedIgItems)
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <ContentAnalysisModal
          key={`${selectedItem.id}:${String((selectedItem.custom_data as Record<string, unknown> | undefined)?.analyzed_at ?? '')}`}
          item={selectedItem}
          onPersistPreview={persistTopicPreview}
          platform={resolveItemPlatform(selectedItem, platform, isAllPlatforms)}
          spaceId={spaceId}
          initialVideoExpanded={openVideoExpandedForSlide}
          onClose={() => {
            setSelectedItem(null)
            setOpenVideoExpandedForSlide(false)
          }}
          onUpdated={refresh}
        />
      )}

      {isListMode && nav.section === 'people' && !nav.isNew && nav.accountKey ? (
        <IgResearchBulkActionBar
          selectedCount={igListSelectedIds.size}
          busy={igListBulkBusy || analyzingIgItemIds.size > 0}
          onClearSelection={igListClearSelection}
          onAnalyzePosts={() => void bulkAnalyzeIgListSelection()}
        />
      ) : null}
    </div>
  )
}
