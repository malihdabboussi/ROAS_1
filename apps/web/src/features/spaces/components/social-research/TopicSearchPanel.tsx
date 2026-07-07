'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Loader2, Search, Star } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cn } from '@/lib/utils/cn'
import { resolveIgListEffectiveColumns } from '../../lib/ig-research-list-columns'
import { getIgMediaToggles } from '../../lib/ig-research-media-toggles'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../../lib/report-social-research-error'
import { takenAtInResolvedRange, takenAtIsoDay } from '../../lib/social-research-date-filter'
import { favoriteFolderIdsOf, type FavoriteFolder } from '../../services/favorite-folders.service'
import { formatViewCount, runInlineIgResearchAnalyze } from '../../services/social-research.service'
import {
  getSavedTopicSearch,
  loadMoreSavedTopicSearch,
  mergeTopicListItemWithSavedResearch,
  refreshSavedTopicSearch,
  saveTopicResults,
  topicCreatorKey,
  topicResultToPreviewItem,
  type SavedTopicSearch,
  type SavedTopicSearchSummary,
  type TopicSearchResultItem,
} from '../../services/topic-search.service'
import { useResearchTopicToolbarBridgeStore } from '../../store/use-research-topic-toolbar-bridge'
import {
  emptyTopicSearchSession,
  useTopicSearchSessionStore,
  type TopicSortMode,
} from '../../store/use-topic-search-session-store'
import type { SpaceItem } from '../../types'
import type {
  SocialPlatform,
  SocialResearchConfig,
  SocialResearchListColumnId,
} from '../../types/space-schema'
import { IgResearchBulkActionBar } from '../instagram-research/IgResearchBulkActionBar'
import { IgResearchEmptyMockup } from '../instagram-research/IgResearchEmptyMockup'
import {
  InstagramResearchListBody,
  resolveResearchPostUrl,
  type IgResearchListRowActionsProps,
} from '../instagram-research/InstagramResearchList'
import { OutlierChip } from '../instagram-research/OutlierChip'
import { resolveSocialResearchMediaFrame } from '../instagram-research/social-research-media-frame'
import { resolveReportingDates } from '../reporting/shared/resolve-reporting-dates'
import { FavoriteFolderDropdown } from './FavoriteFolderDropdown'
import { researchDragLabel, researchMediaRefId, setResearchDragData } from './research-drag'
import { BULK_ANALYZE_CONCURRENCY, runWithConcurrency } from './run-with-concurrency'
import { resolveSocialThumbnailUrl } from './social-image-proxy'

const TOPIC_PLATFORMS: Array<{ id: SocialPlatform; label: string }> = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
]

type SortMode = TopicSortMode

function topicSortModeToField(mode: SortMode): NonNullable<SocialResearchConfig['sort_by']> {
  if (mode === 'play_count') return 'play_count'
  if (mode === 'outlier_score') return 'outlier_score'
  return 'outlier_score'
}

function filterTopicResultsByMediaType(
  items: TopicSearchResultItem[],
  platform: SocialPlatform,
  config: SocialResearchConfig,
): TopicSearchResultItem[] {
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
    if (showYoutubeVideos && showYoutubeShorts) return items
    return items.filter((item) => {
      if (item.media_type === 'youtube_video') return showYoutubeVideos
      if (item.media_type === 'youtube_short') return showYoutubeShorts
      return true
    })
  }

  if (platform === 'twitter') {
    if (showXTweets && showXVideos) return items
    return items.filter((item) => {
      if (item.media_type === 'tweet') return showXTweets
      if (item.media_type === 'tweet_video') return showXVideos
      return true
    })
  }

  if (showReels && showImages && (platform !== 'tiktok' || showSlideshows)) return items
  return items.filter((item) => {
    if (item.media_type === 'reel') return showReels
    if (item.media_type === 'slideshow') return showSlideshows
    if (
      item.media_type === 'image' ||
      item.media_type === 'carousel' ||
      item.media_type === 'post'
    ) {
      return showImages
    }
    return true
  })
}

interface TopicSearchPanelProps {
  platform: SocialPlatform
  spaceId: string
  /** All-platforms research views let the user pick which platform to search. */
  allowPlatformSwitch?: boolean
  /** Called after results are saved so the research feed refreshes. */
  onSaved?: () => void
  /** Opens the content analysis side panel (same as tracked-account cards). */
  onItemClick?: (result: TopicSearchResultItem, context: { query: string }) => void
  /** Parent-owned saved search list (research sidebar). */
  savedSearches: SavedTopicSearchSummary[]
  onSavedSearchesChange: (searches: SavedTopicSearchSummary[]) => void
  /** When set, panel loads this frozen snapshot. */
  activeSavedSearchId: string | null
  /** True when sidebar "New search" is active (fresh draft, no snapshot). */
  isNewSearchDraft: boolean
  /** Bumps when the user explicitly starts a blank new search (not when resuming a draft). */
  draftSessionKey: number
  viewId: string
  researchConfig: SocialResearchConfig
  onResearchConfigPatch?: (patch: Partial<SocialResearchConfig>) => void
  onLiveDraftChange?: (hasLiveDraft: boolean) => void
  /** Searches auto-save on run — fired so the sidebar list reloads. */
  onSavedSearchCreated?: () => void
  favoriteFolders: FavoriteFolder[]
  onCreateFavoriteFolder: (name: string) => Promise<FavoriteFolder | null>
  /** Persists the result if needed, toggles folder membership, returns next ids. */
  onToggleFavorite: (
    result: TopicSearchResultItem,
    query: string,
    folder: FavoriteFolder,
    currentIds: string[],
  ) => Promise<string[] | null>
  onActiveSavedSearchIdChange: (id: string | null) => void
  onLoadingSavedIdChange?: (id: string | null) => void
  /** Persisted research feed items — used to show transcript/hook in topic list rows. */
  researchItems?: SpaceItem[]
  isListMode?: boolean
  listVisibleColumns?: SocialResearchListColumnId[]
  listColumnWidths?: Record<string, number>
  onListColumnResize?: (fieldId: string, width: number) => void
  onListColumnReorder?: (dataColumnIds: SocialResearchListColumnId[]) => Promise<void>
  onListColumnWidthsPersist?: () => void
}

function mediaTypeBadge(mediaType: string, platform: SocialPlatform): string | null {
  if (mediaType === 'youtube_video') return 'VIDEO'
  if (mediaType === 'youtube_short') return 'SHORT'
  if (mediaType === 'slideshow') return 'SLIDES'
  if (mediaType === 'reel') return platform === 'tiktok' ? 'VIDEO' : 'REEL'
  return null
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

function TopicResultCard({
  result,
  platform,
  spaceId,
  scoring,
  favoriteFolders,
  favoriteIds,
  onToggleFavoriteFolder,
  onCreateFavoriteFolder,
  onClick,
  onDragPersist,
}: {
  result: TopicSearchResultItem
  platform: SocialPlatform
  spaceId: string
  scoring: boolean
  favoriteFolders: FavoriteFolder[]
  favoriteIds: string[]
  onToggleFavoriteFolder: (folder: FavoriteFolder) => void | Promise<void>
  onCreateFavoriteFolder: (name: string) => Promise<FavoriteFolder | null>
  onClick: () => void
  /** Fired on drag start so unsaved results persist in the background. */
  onDragPersist: () => void
}) {
  const mediaFrame = resolveSocialResearchMediaFrame(result.media_type, platform, 'topic')
  // Frozen snapshots carry a durable cached copy; live results proxy the CDN URL.
  const thumbnailUrl = resolveSocialThumbnailUrl(platform, {
    thumbnail_url: result.thumbnail_url,
    thumbnail_cached_url: result.thumbnail_cached_url,
  })
  const badge = mediaTypeBadge(result.media_type, platform)
  const dateLabel = result.taken_at
    ? new Date(result.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const handle = result.creator.handle

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        setResearchDragData(e, {
          id: researchMediaRefId(spaceId, result.media_id),
          platform,
          label: researchDragLabel(platform, result.creator.handle, result.play_count),
        })
        onDragPersist()
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="hover:border-[var(--color-muted-foreground)]/30 group flex cursor-grab flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--color-secondary)] transition-all hover:shadow-lg active:cursor-grabbing"
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden bg-black/20',
          mediaFrame.aspectClass,
        )}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={result.caption ?? result.shortcode}
            className={cn(
              'h-full w-full transition-transform group-hover:scale-105',
              mediaFrame.imageObjectClass,
            )}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
            <Eye className="h-8 w-8 opacity-30" />
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {badge}
          </span>
        )}
        {dateLabel && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            {dateLabel}
          </span>
        )}
        <div className="absolute bottom-2 right-2">
          <FavoriteFolderDropdown
            folders={favoriteFolders}
            selectedIds={favoriteIds}
            onToggleFolder={onToggleFavoriteFolder}
            onCreateFolder={onCreateFavoriteFolder}
            trigger={({ open, toggle, favorited, triggerRef }) => (
              <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle()
                }}
                title={favorited ? 'In favorites' : 'Add to favorites'}
                className={cn(
                  'flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white transition-opacity',
                  favorited || open
                    ? 'opacity-100'
                    : 'opacity-0 hover:bg-black/80 group-hover:opacity-100',
                )}
              >
                <Star className={cn('h-3.5 w-3.5', favorited && 'fill-amber-400 text-amber-400')} />
              </button>
            )}
          />
        </div>
      </div>

      {platform === 'youtube' ? (
        <p className="body-3 line-clamp-2 min-h-[2lh] px-3 pt-2 font-medium text-[var(--foreground)]">
          {result.caption ?? ''}
        </p>
      ) : null}
      {handle && (
        <p
          className={cn(
            'body-3 truncate px-3 text-[var(--color-muted-foreground)]',
            platform === 'youtube' && result.caption ? 'pb-0 pt-1' : 'pt-2',
          )}
        >
          @{handle}
        </p>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 py-2.5">
        <span className="badge-glass badge-glass-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
          <Eye className="h-3 w-3" />
          {formatViewCount(result.play_count)}
        </span>
        {result.outlier_score != null ? (
          <OutlierChip score={result.outlier_score} />
        ) : scoring ? (
          <span className="badge-glass badge-glass-muted flex items-center rounded-full px-2 py-0.5">
            <Loader2 className="h-3 w-3 animate-spin text-[var(--color-muted-foreground)]" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function TopicSearchPanel({
  platform: initialPlatform,
  spaceId,
  allowPlatformSwitch = false,
  onSaved,
  onItemClick,
  savedSearches,
  onSavedSearchesChange,
  activeSavedSearchId,
  isNewSearchDraft,
  draftSessionKey,
  viewId,
  researchConfig,
  onResearchConfigPatch,
  onLiveDraftChange,
  onSavedSearchCreated,
  favoriteFolders,
  onCreateFavoriteFolder,
  onToggleFavorite,
  onActiveSavedSearchIdChange,
  onLoadingSavedIdChange,
  researchItems = [],
  isListMode = false,
  listVisibleColumns = [],
  listColumnWidths = {},
  onListColumnResize,
  onListColumnReorder,
  onListColumnWidthsPersist,
}: TopicSearchPanelProps) {
  const fallbackListColumnResize = useCallback((_fieldId: string, _width: number) => undefined, [])
  const fallbackListColumnReorder = useCallback(
    async (_dataColumnIds: SocialResearchListColumnId[]) => undefined,
    [],
  )
  const listColumnResize = onListColumnResize ?? fallbackListColumnResize
  const listColumnReorder = onListColumnReorder ?? fallbackListColumnReorder

  // The live search session lives in a module-level store keyed by view, so a
  // search (and its progressive scoring) keeps running while the user works in
  // other tabs and is still there when they come back.
  const sessionKey = `${spaceId}:${viewId}`
  const fallbackPlatform = initialPlatform === 'twitter' ? 'youtube' : initialPlatform
  const storedSession = useTopicSearchSessionStore((s) => s.sessions[sessionKey])
  const patchSession = useTopicSearchSessionStore((s) => s.patchSession)
  const clearSession = useTopicSearchSessionStore((s) => s.clearSession)
  const storeRunSearch = useTopicSearchSessionStore((s) => s.runSearch)
  const storeLoadMore = useTopicSearchSessionStore((s) => s.loadMore)
  const hydrateFromSavedSearch = useTopicSearchSessionStore((s) => s.hydrateFromSavedSearch)
  const session = useMemo(
    () => storedSession ?? emptyTopicSearchSession(fallbackPlatform),
    [storedSession, fallbackPlatform],
  )
  const {
    platform,
    query,
    activeQuery,
    results,
    nextCursor,
    searching,
    loadingMore,
    sortMode,
    minOutlier,
  } = session
  const scoringKeys = useMemo(() => new Set(session.scoringKeys), [session.scoringKeys])
  const draftSavedIds = useMemo(() => new Set(session.savedIds), [session.savedIds])

  // Saved-snapshot viewing state is per-mount UI state, not part of the live session.
  const [localError, setLocalError] = useState<string | null>(null)
  const [savedModeSavedIds, setSavedModeSavedIds] = useState<Set<string>>(new Set())
  const [savedSortMode, setSavedSortMode] = useState<SortMode>('outlier_score')
  const [savedSortBy, setSavedSortBy] =
    useState<NonNullable<SocialResearchConfig['sort_by']>>('outlier_score')
  const [savedSortDir, setSavedSortDir] = useState<'asc' | 'desc'>('desc')
  const [savedMinOutlier, setSavedMinOutlier] = useState<number>(1)
  const registerTopicToolbarBridge = useResearchTopicToolbarBridgeStore((s) => s.register)
  const clearTopicToolbarBridge = useResearchTopicToolbarBridgeStore((s) => s.clear)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [analyzingMediaIds, setAnalyzingMediaIds] = useState<Set<string>>(() => new Set())
  const [listItemPatches, setListItemPatches] = useState<Map<string, SpaceItem>>(() => new Map())
  const [topicListSelectedIds, setTopicListSelectedIds] = useState<Set<string>>(() => new Set())
  const [topicListBulkBusy, setTopicListBulkBusy] = useState(false)
  const [loadingMoreSaved, setLoadingMoreSaved] = useState(false)
  const [activeSaved, setActiveSaved] = useState<SavedTopicSearch | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const prevDraftSessionKey = useRef(draftSessionKey)
  const prevActiveSavedSearchIdRef = useRef<string | null | undefined>(undefined)
  const handledAutoSavedAt = useRef<number | null>(null)

  const error = localError ?? session.error
  const [searchFocused, setSearchFocused] = useState(false)

  // Auto-save on run — reload sidebar and open the saved snapshot in the panel.
  useEffect(() => {
    if (session.autoSavedAt == null || !session.savedSearchId) return
    if (handledAutoSavedAt.current === session.autoSavedAt) return
    handledAutoSavedAt.current = session.autoSavedAt

    const searchId = session.savedSearchId
    const alreadyListed = savedSearches.some((s) => s.id === searchId)
    if (!alreadyListed) {
      const now = new Date().toISOString()
      onSavedSearchesChange([
        {
          id: searchId,
          platform: session.platform,
          title: session.activeQuery,
          query: session.activeQuery,
          filters: { sort_mode: session.sortMode },
          result_count: session.results.length,
          created_at: now,
          last_run_at: now,
        },
        ...savedSearches,
      ])
    }

    onSavedSearchCreated?.()

    if (!activeSaved && activeSavedSearchId == null) {
      onActiveSavedSearchIdChange(searchId)
    }
  }, [
    activeSaved,
    activeSavedSearchId,
    onActiveSavedSearchIdChange,
    onSavedSearchCreated,
    onSavedSearchesChange,
    savedSearches,
    session.activeQuery,
    session.autoSavedAt,
    session.platform,
    session.results.length,
    session.savedSearchId,
    session.sortMode,
  ])

  // Past searches matching what the user is typing — pick one to reopen it.
  const searchSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return savedSearches
      .filter((s) => s.platform === platform)
      .filter((s) => s.query.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
      .slice(0, 6)
  }, [platform, query, savedSearches])

  // patchSession on a not-yet-created session must not default the platform —
  // always carry the currently displayed one.
  const patchDraft = useCallback(
    (patch: Partial<typeof session>) => patchSession(sessionKey, { platform, ...patch }),
    [patchSession, platform, sessionKey],
  )

  const loadSavedSearchById = useCallback(
    async (searchId: string) => {
      onLoadingSavedIdChange?.(searchId)
      setLoadingMoreSaved(false)
      patchSession(sessionKey, { loadingMore: false })
      setLocalError(null)
      try {
        const full = await getSavedTopicSearch(spaceId, searchId)
        setActiveSaved(full)
        hydrateFromSavedSearch(sessionKey, spaceId, full)
        setSavedModeSavedIds(new Set())
        const loadedSortMode = full.filters.sort_mode ?? 'outlier_score'
        setSavedSortMode(loadedSortMode)
        setSavedSortBy(topicSortModeToField(loadedSortMode))
        setSavedSortDir('desc')
        setSavedMinOutlier(Math.min(100, Math.max(1, full.filters.min_outlier_score ?? 1)))
      } catch (err) {
        reportSocialResearchError(
          'topic_search_open_saved_failed',
          err,
          socialResearchContext(spaceId, platform, { search_id: searchId }),
        )
        setLocalError("Couldn't open that saved search.")
        onActiveSavedSearchIdChange(null)
      } finally {
        onLoadingSavedIdChange?.(null)
      }
    },
    [
      hydrateFromSavedSearch,
      onActiveSavedSearchIdChange,
      onLoadingSavedIdChange,
      patchSession,
      sessionKey,
      spaceId,
    ],
  )

  useEffect(() => {
    const prev = prevActiveSavedSearchIdRef.current
    prevActiveSavedSearchIdRef.current = activeSavedSearchId
    if (prev === undefined) return
    if (prev === activeSavedSearchId) return
    setLoadingMoreSaved(false)
    patchSession(sessionKey, { loadingMore: false })
  }, [activeSavedSearchId, patchSession, sessionKey])

  useEffect(() => {
    if (draftSessionKey === prevDraftSessionKey.current) return
    prevDraftSessionKey.current = draftSessionKey
    handledAutoSavedAt.current = null
    clearSession(sessionKey, fallbackPlatform)
    setActiveSaved(null)
    setLocalError(null)
    setSavedModeSavedIds(new Set())
    setLoadingMoreSaved(false)
  }, [clearSession, draftSessionKey, fallbackPlatform, sessionKey])

  useEffect(() => {
    if (!activeSavedSearchId) return
    if (activeSaved?.id === activeSavedSearchId) return
    // The live session IS this saved search (it just auto-saved). Keep showing
    // the live results so outlier scores keep patching into the cards in place
    // — the frozen snapshot would predate the late-arriving scores.
    if (
      session.savedSearchId === activeSavedSearchId &&
      (session.results.length > 0 || session.searching)
    ) {
      if (activeSaved) setActiveSaved(null)
      return
    }
    void loadSavedSearchById(activeSavedSearchId)
  }, [
    activeSaved,
    activeSavedSearchId,
    loadSavedSearchById,
    session.results.length,
    session.savedSearchId,
    session.searching,
  ])

  useEffect(() => {
    if (isNewSearchDraft && !activeSavedSearchId && activeSaved) {
      setActiveSaved(null)
    }
  }, [activeSaved, activeSavedSearchId, isNewSearchDraft])

  useEffect(() => {
    onLiveDraftChange?.(
      !activeSaved &&
        (searching || activeQuery.length > 0 || results.length > 0 || query.trim().length > 0),
    )
  }, [activeQuery, activeSaved, onLiveDraftChange, query, results.length, searching])

  const runSearch = useCallback(() => {
    if (!query.trim() || searching) return
    setActiveSaved(null)
    setLoadingMoreSaved(false)
    onActiveSavedSearchIdChange(null)
    setLocalError(null)
    // Runs in the session store — survives unmount, results land even if the
    // user is on another tab when the search finishes.
    storeRunSearch(sessionKey, spaceId, platform, query)
  }, [onActiveSavedSearchIdChange, platform, query, searching, sessionKey, spaceId, storeRunSearch])

  const loadMore = useCallback(() => {
    if (activeSaved) {
      if (!activeSaved.next_cursor || loadingMoreSaved) return
      setLoadingMoreSaved(true)
      setLocalError(null)
      void loadMoreSavedTopicSearch(spaceId, activeSaved.id)
        .then((updated) => {
          setActiveSaved(updated)
          hydrateFromSavedSearch(sessionKey, spaceId, updated)
          onSavedSearchesChange(
            savedSearches.map((s) =>
              s.id === updated.id
                ? { ...s, result_count: updated.result_count, last_run_at: updated.last_run_at }
                : s,
            ),
          )
        })
        .catch((err) => {
          reportSocialResearchError(
            'topic_search_saved_load_more_failed',
            err,
            socialResearchContext(spaceId, platform, { search_id: activeSaved.id }),
          )
          setLocalError("Couldn't load more results — try again.")
        })
        .finally(() => {
          setLoadingMoreSaved(false)
        })
      return
    }
    storeLoadMore(sessionKey, spaceId)
  }, [
    activeSaved,
    hydrateFromSavedSearch,
    loadingMoreSaved,
    onSavedSearchesChange,
    savedSearches,
    sessionKey,
    spaceId,
    storeLoadMore,
  ])

  const paginationCursor = useMemo(() => {
    if (activeSaved) {
      if (activeSaved.next_cursor) return activeSaved.next_cursor
      if (session.savedSearchId === activeSaved.id && session.nextCursor) return session.nextCursor
      return null
    }
    return nextCursor
  }, [activeSaved, session.nextCursor, session.savedSearchId, nextCursor])

  const loadingMoreEffective = loadingMore || loadingMoreSaved
  const showLoadMore = Boolean(paginationCursor)

  const activeSavedSummary = useMemo(
    () => (activeSaved ? (savedSearches.find((s) => s.id === activeSaved.id) ?? null) : null),
    [activeSaved, savedSearches],
  )

  const displayPlatform = activeSaved?.platform ?? platform
  const displayQuery = activeSaved?.query ?? activeQuery

  // Optimistic folder membership per media_id; base truth comes from the
  // persisted research items (results themselves carry no membership).
  const [favoriteOverrides, setFavoriteOverrides] = useState<Map<string, string[]>>(() => new Map())
  const favoriteIdsByMediaId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const it of researchItems) {
      const cdd = (it.custom_data ?? {}) as Record<string, unknown>
      const mid = cdd.media_id
      if (typeof mid === 'string') map.set(mid, favoriteFolderIdsOf(cdd))
    }
    return map
  }, [researchItems])
  const favoriteIdsFor = useCallback(
    (mediaId: string): string[] =>
      favoriteOverrides.get(mediaId) ?? favoriteIdsByMediaId.get(mediaId) ?? [],
    [favoriteIdsByMediaId, favoriteOverrides],
  )
  const toggleFavoriteForResult = useCallback(
    async (item: TopicSearchResultItem, folder: FavoriteFolder) => {
      const next = await onToggleFavorite(item, displayQuery, folder, favoriteIdsFor(item.media_id))
      if (next) setFavoriteOverrides((prev) => new Map(prev).set(item.media_id, next))
    },
    [displayQuery, favoriteIdsFor, onToggleFavorite],
  )
  const displayResults = activeSaved?.results ?? results
  const displaySavedTitle = activeSavedSummary?.title ?? activeSaved?.title ?? ''
  const displaySavedResultCount = activeSavedSummary?.result_count ?? activeSaved?.result_count ?? 0
  const displaySavedLastRunAt = activeSavedSummary?.last_run_at ?? activeSaved?.last_run_at ?? ''
  const effectiveMinOutlier = activeSaved
    ? savedMinOutlier
    : Math.min(100, Math.max(1, researchConfig.min_outlier_score ?? minOutlier ?? 1))
  const effectiveSortBy = activeSaved ? savedSortBy : (researchConfig.sort_by ?? 'outlier_score')
  const effectiveSortDir = activeSaved ? savedSortDir : (researchConfig.sort_dir ?? 'desc')
  const topicSortApplied = activeSaved != null || sortMode !== 'relevance'
  const displaySavedIds = activeSaved ? savedModeSavedIds : draftSavedIds

  const saveResult = useCallback(
    async (item: TopicSearchResultItem) => {
      setSavingIds((prev) => new Set(prev).add(item.media_id))
      try {
        await saveTopicResults(displayPlatform, spaceId, displayQuery, [item])
        if (activeSaved) {
          setSavedModeSavedIds((prev) => new Set(prev).add(item.media_id))
        } else {
          const current = useTopicSearchSessionStore.getState().sessions[sessionKey]
          patchDraft({
            savedIds: [...new Set([...(current?.savedIds ?? []), item.media_id])],
          })
        }
        onSaved?.()
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev)
          next.delete(item.media_id)
          return next
        })
      }
    },
    [activeSaved, displayPlatform, displayQuery, onSaved, patchDraft, sessionKey, spaceId],
  )

  const refreshActiveSaved = useCallback(async () => {
    if (!activeSaved || refreshing) return
    setRefreshing(true)
    setLocalError(null)
    try {
      const updated = await refreshSavedTopicSearch(spaceId, activeSaved.id)
      setActiveSaved(updated)
      onSavedSearchesChange(
        savedSearches.map((s) =>
          s.id === updated.id
            ? { ...s, result_count: updated.result_count, last_run_at: updated.last_run_at }
            : s,
        ),
      )
    } catch (err) {
      reportSocialResearchError(
        'topic_search_refresh_failed',
        err,
        socialResearchContext(spaceId, platform, { search_id: activeSaved.id }),
      )
      setLocalError("Refresh didn't go through — try again.")
    } finally {
      setRefreshing(false)
    }
  }, [activeSaved, onSavedSearchesChange, refreshing, savedSearches, spaceId])

  const filteredSortedResults = useMemo(() => {
    let list = displayResults
    list = filterTopicResultsByMediaType(list, displayPlatform, researchConfig)

    const { startDate, endDate } = resolveReportingDates({
      time_range: researchConfig.time_range ?? '90d',
      custom_start: researchConfig.custom_start,
      custom_end: researchConfig.custom_end,
    })
    list = list.filter((item) =>
      takenAtInResolvedRange(takenAtIsoDay(item.taken_at), startDate, endDate),
    )

    if (effectiveMinOutlier > 1) {
      list = list.filter((i) => (i.outlier_score ?? 0) >= effectiveMinOutlier)
    }

    if (!activeSaved && sortMode === 'relevance') return list
    if (activeSaved && savedSortMode === 'relevance') return list

    return [...list].sort((a, b) => {
      let aNum = 0
      let bNum = 0
      if (effectiveSortBy === 'outlier_score') {
        aNum = a.outlier_score ?? -1
        bNum = b.outlier_score ?? -1
      } else if (effectiveSortBy === 'play_count') {
        aNum = a.play_count
        bNum = b.play_count
      } else {
        aNum = a.taken_at ? new Date(a.taken_at).getTime() : 0
        bNum = b.taken_at ? new Date(b.taken_at).getTime() : 0
      }
      return effectiveSortDir === 'desc' ? bNum - aNum : aNum - bNum
    })
  }, [
    activeSaved,
    displayPlatform,
    displayResults,
    effectiveMinOutlier,
    effectiveSortBy,
    effectiveSortDir,
    researchConfig,
    savedSortMode,
    sortMode,
  ])

  useEffect(() => {
    const viewKey = sessionKey
    const hasResults = displayResults.length > 0
    registerTopicToolbarBridge({
      viewKey,
      sortBy: effectiveSortBy,
      sortDir: effectiveSortDir,
      sortApplied: topicSortApplied,
      minOutlier: effectiveMinOutlier,
      hasResults,
      isSavedSnapshot: Boolean(activeSaved),
      canRefreshSaved: Boolean(activeSaved),
      refreshingSaved: refreshing,
      setSortBy: (sortBy) => {
        if (activeSaved) {
          setSavedSortBy(sortBy)
          setSavedSortMode(sortBy === 'play_count' ? 'play_count' : 'outlier_score')
          return
        }
        patchDraft({
          sortMode: sortBy === 'play_count' ? 'play_count' : 'outlier_score',
        })
        onResearchConfigPatch?.({ sort_by: sortBy })
      },
      setSortDir: (sortDir) => {
        if (activeSaved) {
          setSavedSortDir(sortDir)
          return
        }
        onResearchConfigPatch?.({ sort_dir: sortDir })
      },
      setMinOutlier: (value) => {
        if (activeSaved) {
          setSavedMinOutlier(value)
          return
        }
        patchDraft({ minOutlier: value })
        onResearchConfigPatch?.({ min_outlier_score: value })
      },
      refreshSavedSearch: () => {
        void refreshActiveSaved()
      },
    })
    return () => clearTopicToolbarBridge(viewKey)
  }, [
    activeSaved,
    clearTopicToolbarBridge,
    displayResults.length,
    refreshActiveSaved,
    refreshing,
    effectiveMinOutlier,
    effectiveSortBy,
    effectiveSortDir,
    topicSortApplied,
    onResearchConfigPatch,
    patchDraft,
    registerTopicToolbarBridge,
    sessionKey,
  ])

  const topicListItems = useMemo(() => {
    const savedByMediaId = new Map<string, SpaceItem>()
    for (const item of researchItems) {
      const mediaId = (item.custom_data as Record<string, unknown>)?.media_id
      if (typeof mediaId === 'string' && mediaId.trim()) {
        savedByMediaId.set(mediaId, item)
      }
    }
    return filteredSortedResults.map((result) => {
      const preview = topicResultToPreviewItem(result, spaceId)
      const saved = savedByMediaId.get(result.media_id)
      let item = saved ? mergeTopicListItemWithSavedResearch(preview, saved) : preview
      const patch = listItemPatches.get(result.media_id)
      if (patch) item = patch
      return item
    })
  }, [filteredSortedResults, listItemPatches, researchItems, spaceId])

  const topicResultByMediaId = useMemo(() => {
    const map = new Map<string, TopicSearchResultItem>()
    for (const result of filteredSortedResults) {
      map.set(result.media_id, result)
    }
    return map
  }, [filteredSortedResults])

  const topicListToggleSelect = useCallback((id: string) => {
    setTopicListSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const topicListBulkSelect = useCallback((itemIds: string[], select: boolean) => {
    setTopicListSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of itemIds) {
        if (select) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const topicListClearSelection = useCallback(() => {
    setTopicListSelectedIds(new Set())
  }, [])

  useEffect(() => {
    if (!isListMode) topicListClearSelection()
  }, [isListMode, topicListClearSelection])

  useEffect(() => {
    topicListClearSelection()
  }, [displayQuery, displayPlatform, activeSaved?.id, topicListClearSelection])

  const analyzeTopicResult = useCallback(
    async (result: TopicSearchResultItem, rowItem: SpaceItem, itemPlatform: SocialPlatform) => {
      const mediaId = result.media_id
      if (analyzingMediaIds.has(mediaId)) return

      setAnalyzingMediaIds((prev) => new Set(prev).add(mediaId))
      try {
        const cd = (rowItem.custom_data ?? {}) as Record<string, unknown>
        const patched = await runInlineIgResearchAnalyze({
          platform: itemPlatform,
          spaceId,
          item: rowItem,
          shortcode: result.shortcode,
          handle: String(cd._handle ?? result.creator?.handle ?? ''),
          isSlideshow: cd.media_type === 'slideshow' || result.media_type === 'slideshow',
          resolvePersistedItemId: async () => {
            const saved = await saveTopicResults(itemPlatform, spaceId, displayQuery, [result])
            if (saved.itemIds.length > 0) return saved.itemIds[0] ?? null
            const existing = researchItems.find(
              (i) => (i.custom_data as Record<string, unknown>)?.media_id === result.media_id,
            )
            return existing ? String(existing.id) : null
          },
        })
        setListItemPatches((prev) => new Map(prev).set(mediaId, patched))
      } finally {
        setAnalyzingMediaIds((prev) => {
          const next = new Set(prev)
          next.delete(mediaId)
          return next
        })
      }
    },
    [analyzingMediaIds, displayQuery, researchItems, spaceId],
  )

  const resolveTopicListRowActions = useCallback(
    (item: SpaceItem, itemPlatform: SocialPlatform): IgResearchListRowActionsProps | null => {
      const mediaId = String((item.custom_data as Record<string, unknown>)?.media_id ?? '')
      const result = topicResultByMediaId.get(mediaId)
      if (!result) return null
      const saved = displaySavedIds.has(mediaId)
      const saving = savingIds.has(mediaId)
      const analyzing = analyzingMediaIds.has(mediaId)
      const analyzed = Boolean((item.custom_data as Record<string, unknown>)?.analyzed_at)
      return {
        postUrl: resolveResearchPostUrl(item, itemPlatform),
        saved,
        saving,
        analyzing,
        analyzed,
        onSave: () => void saveResult(result),
        onAnalyze: () => void analyzeTopicResult(result, item, itemPlatform),
      }
    },
    [
      analyzeTopicResult,
      analyzingMediaIds,
      displaySavedIds,
      saveResult,
      savingIds,
      topicResultByMediaId,
    ],
  )

  const topicBulkSaveableCount = useMemo(() => {
    let count = 0
    for (const item of topicListItems) {
      if (!topicListSelectedIds.has(item.id)) continue
      const mediaId = String((item.custom_data as Record<string, unknown>)?.media_id ?? '')
      if (mediaId && !displaySavedIds.has(mediaId)) count++
    }
    return count
  }, [displaySavedIds, topicListItems, topicListSelectedIds])

  const bulkAnalyzeTopicSelection = useCallback(async () => {
    if (topicListBulkBusy) return
    const selected = topicListItems.filter((item) => topicListSelectedIds.has(item.id))
    if (selected.length === 0) return

    setTopicListBulkBusy(true)
    try {
      // Bounded pool — each analyze is a multi-second upstream call.
      const analyzable = selected.flatMap((item) => {
        const mediaId = String((item.custom_data as Record<string, unknown>)?.media_id ?? '')
        const result = topicResultByMediaId.get(mediaId)
        return result ? [{ item, result }] : []
      })
      await runWithConcurrency(analyzable, BULK_ANALYZE_CONCURRENCY, ({ item, result }) =>
        analyzeTopicResult(result, item, displayPlatform),
      )
    } finally {
      setTopicListBulkBusy(false)
      topicListClearSelection()
    }
  }, [
    analyzeTopicResult,
    displayPlatform,
    topicListBulkBusy,
    topicListClearSelection,
    topicListItems,
    topicListSelectedIds,
    topicResultByMediaId,
  ])

  const bulkSaveTopicSelection = useCallback(async () => {
    if (topicListBulkBusy) return
    const resultsToSave: TopicSearchResultItem[] = []
    for (const item of topicListItems) {
      if (!topicListSelectedIds.has(item.id)) continue
      const mediaId = String((item.custom_data as Record<string, unknown>)?.media_id ?? '')
      if (!mediaId || displaySavedIds.has(mediaId)) continue
      const result = topicResultByMediaId.get(mediaId)
      if (result) resultsToSave.push(result)
    }
    if (resultsToSave.length === 0) return

    setTopicListBulkBusy(true)
    const savingMediaIds = resultsToSave.map((r) => r.media_id)
    setSavingIds((prev) => new Set([...prev, ...savingMediaIds]))
    try {
      await saveTopicResults(displayPlatform, spaceId, displayQuery, resultsToSave)
      if (activeSaved) {
        setSavedModeSavedIds((prev) => new Set([...prev, ...savingMediaIds]))
      } else {
        const current = useTopicSearchSessionStore.getState().sessions[sessionKey]
        patchDraft({
          savedIds: [...new Set([...(current?.savedIds ?? []), ...savingMediaIds])],
        })
      }
      onSaved?.()
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        for (const id of savingMediaIds) next.delete(id)
        return next
      })
      setTopicListBulkBusy(false)
      topicListClearSelection()
    }
  }, [
    activeSaved,
    displayPlatform,
    displayQuery,
    displaySavedIds,
    onSaved,
    patchDraft,
    sessionKey,
    spaceId,
    topicListBulkBusy,
    topicListClearSelection,
    topicListItems,
    topicListSelectedIds,
    topicResultByMediaId,
  ])

  const handleTopicListRowClick = useCallback(
    (item: SpaceItem) => {
      const mediaId = String((item.custom_data as Record<string, unknown>)?.media_id ?? '')
      const result = topicResultByMediaId.get(mediaId)
      if (result) onItemClick?.(result, { query: displayQuery })
    },
    [displayQuery, onItemClick, topicResultByMediaId],
  )

  const topicListMode = isListMode || (researchConfig.display_mode ?? 'grid') === 'list'

  const canRenderTopicList = topicListMode

  const effectiveListColumns = useMemo(() => {
    if (listVisibleColumns.length > 0) return listVisibleColumns
    return resolveIgListEffectiveColumns(researchConfig)
  }, [listVisibleColumns, researchConfig.list_visible_columns])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {activeSaved ? (
        <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="gap-spacing-2 flex min-w-0 flex-wrap items-center">
            <span className="body-3 text-foreground font-medium">{displaySavedTitle}</span>
            <span className="body-4 text-muted-foreground">&ldquo;{displayQuery}&rdquo;</span>
          </div>
          <span className="body-4 text-muted-foreground shrink-0">
            {displaySavedResultCount} results · Updated {lastRunLabel(displaySavedLastRunAt)}
          </span>
        </div>
      ) : (
        <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex shrink-0 flex-col items-center">
          {allowPlatformSwitch && (
            <div className="flex items-center justify-center gap-1">
              {TOPIC_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => patchDraft({ platform: p.id })}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    platform === p.id
                      ? 'badge-glass text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="relative w-full max-w-md">
            <div className="border-border bg-secondary gap-spacing-2 py-spacing-1 pl-spacing-3 pr-spacing-1 h-spacing-9 focus-within:border-[var(--color-muted-foreground)]/40 flex w-full items-center rounded-full border transition-colors">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => patchDraft({ query: e.target.value })}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch()
                  if (e.key === 'Escape') setSearchFocused(false)
                }}
                placeholder="Search a topic"
                className="body-3 text-foreground h-full min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-[var(--color-muted-foreground)]"
              />
              <button
                type="button"
                onClick={() => runSearch()}
                disabled={searching || !query.trim()}
                className="button-glass-primary body-3 gap-spacing-1 h-spacing-7 px-spacing-4 inline-flex shrink-0 items-center justify-center rounded-full font-medium disabled:opacity-50"
              >
                {searching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Search
              </button>
            </div>
            {searchFocused && searchSuggestions.length > 0 && (
              <div className="border-border absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-[var(--color-background)] shadow-xl">
                <p className="body-4 text-muted-foreground border-b border-[var(--border)] px-3 py-1.5 uppercase tracking-wider">
                  Past searches
                </p>
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    // onMouseDown fires before the input's blur closes the list.
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setSearchFocused(false)
                      onActiveSavedSearchIdChange(suggestion.id)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                    <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                      {suggestion.title}
                    </span>
                    <span className="body-4 text-muted-foreground shrink-0">
                      {suggestion.result_count} results · {lastRunLabel(suggestion.last_run_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="body-3 shrink-0 px-4 pt-3 text-[var(--color-destructive)]">{error}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {searching ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <VibeyLoadingOrb
              text={`Searching ${TOPIC_PLATFORMS.find((p) => p.id === platform)?.label ?? platform}...`}
              state="processing"
              size="lg"
            />
          </div>
        ) : displayResults.length === 0 ? (
          <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-4 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <IgResearchEmptyMockup />
            <div className="space-y-spacing-1">
              <p className="title-h6 text-foreground">Find what&apos;s already working</p>
              <p className="body-3 text-muted-foreground max-w-sm">
                Search a topic for top videos with outlier scores. Save the search or bookmark
                winners to your feed.
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'min-h-0 flex-1',
              canRenderTopicList
                ? 'flex min-w-0 flex-col overflow-hidden px-4 py-4'
                : 'overflow-y-auto p-4',
            )}
            onMouseUp={canRenderTopicList ? onListColumnWidthsPersist : undefined}
          >
            {canRenderTopicList ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <InstagramResearchListBody
                    listSection="ungrouped"
                    items={topicListItems}
                    platform={displayPlatform}
                    visibleColumnIds={effectiveListColumns}
                    columnWidths={listColumnWidths}
                    onColumnResize={listColumnResize}
                    onColumnReorder={listColumnReorder}
                    onRowClick={handleTopicListRowClick}
                    selectedIds={topicListSelectedIds}
                    onToggleSelect={topicListToggleSelect}
                    onBulkSelectInScope={topicListBulkSelect}
                    resolveRowActions={(item, itemPlatform) =>
                      resolveTopicListRowActions(item, itemPlatform)
                    }
                  />
                </div>
                {showLoadMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => loadMore()}
                      disabled={loadingMoreEffective}
                      className="button-compact button-glass-primary flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {loadingMoreEffective && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Load more
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredSortedResults.map((item) => (
                    <TopicResultCard
                      key={item.media_id}
                      result={item}
                      platform={displayPlatform}
                      spaceId={spaceId}
                      onDragPersist={() => {
                        if (!displaySavedIds.has(item.media_id)) void saveResult(item)
                      }}
                      scoring={!activeSaved && scoringKeys.has(topicCreatorKey(item.creator))}
                      favoriteFolders={favoriteFolders}
                      favoriteIds={favoriteIdsFor(item.media_id)}
                      onToggleFavoriteFolder={(folder) =>
                        void toggleFavoriteForResult(item, folder)
                      }
                      onCreateFavoriteFolder={onCreateFavoriteFolder}
                      onClick={() => onItemClick?.(item, { query: displayQuery })}
                    />
                  ))}
                </div>
                {showLoadMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => loadMore()}
                      disabled={loadingMoreEffective}
                      className="button-compact button-glass-primary flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {loadingMoreEffective && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <IgResearchBulkActionBar
        selectedCount={topicListSelectedIds.size}
        busy={topicListBulkBusy || analyzingMediaIds.size > 0}
        onClearSelection={topicListClearSelection}
        onAnalyzePosts={() => void bulkAnalyzeTopicSelection()}
        onSaveToResearch={() => void bulkSaveTopicSelection()}
        saveableCount={topicBulkSaveableCount}
      />
    </div>
  )
}
