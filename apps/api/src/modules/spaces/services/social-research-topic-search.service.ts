import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MediaService } from '../../media/services/media.service'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { SocialResearchTopicSearchRepository } from '../repositories/social-research-topic-search.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import type {
  SavedTopicSearch,
  SavedTopicSearchFilters,
  SavedTopicSearchSummary,
  SocialContentItem,
  SocialResearchPlatform,
  TopicCreatorScore,
  TopicSearchCreatorRef,
  TopicSearchPage,
  TopicSearchResultItem,
} from '../types/social-research.types'
import { SocialResearchScrapeCreatorsService } from './social-research-scrapecreators.service'
import { SocialResearchTopicSearchSnapshotsService } from './social-research-topic-search-snapshots.service'
import {
  medianPlayCount,
  SOCIAL_VIEW_TYPE_BY_PLATFORM,
  socialContentCustomData,
  socialImageCacheKey,
} from './social-research-utils'
import { TtlCache } from './ttl-cache'

/** Creator medians barely move day to day — cache them to keep repeat searches cheap. */
const BASELINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
/** Hard cap per score request: each uncached creator costs one upstream call. */
const MAX_CREATORS_PER_SCORE_CALL = 12
const BASELINE_CONCURRENCY = 4
/** Fill the grid (6 per row x 4 rows) before the user needs Load more. */
const MIN_SEARCH_RESULTS = 24
/** Each extra page is one upstream call — cap the auto-accumulation. */
const MAX_SEARCH_PAGES = 3
/**
 * Idempotency window: a self-heal retry (or a manual re-run) of an identical
 * search within this window returns the cached page instead of re-fetching and
 * re-charging upstream. Short enough that an intentional re-run still feels fresh.
 */
const SEARCH_RESULT_CACHE_TTL_MS = 90 * 1000

export function topicCreatorKey(creator: TopicSearchCreatorRef): string {
  const ref = creator.channel_id || creator.handle
  return `${creator.platform}:${ref.toLowerCase()}`
}

@Injectable()
export class SocialResearchTopicSearchService {
  private readonly logger = new Logger(SocialResearchTopicSearchService.name)
  private readonly baselineCache = new Map<
    string,
    { median: number | null; sampleSize: number; fetchedAt: number }
  >()
  /** Per-user search-result cache for idempotent retries (SEARCH_RESULT_CACHE_TTL_MS). */
  private readonly searchCache = new TtlCache<TopicSearchPage>(SEARCH_RESULT_CACHE_TTL_MS)

  constructor(
    private readonly repo: SpacesRepository,
    private readonly scrapeCreators: SocialResearchScrapeCreatorsService,
    private readonly media: MediaService,
    private readonly snapshots: SocialResearchTopicSearchSnapshotsService,
    private readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
    @Optional()
    private readonly topicSearchRepo: SocialResearchTopicSearchRepository = new SocialResearchTopicSearchRepository(),
  ) {}

  async searchTopic(opts: {
    userId: string
    orgId: string | null
    platform: SocialResearchPlatform
    query: string
    cursor?: string | null
  }): Promise<TopicSearchPage> {
    const query = opts.query.trim()
    if (!query) throw new BadRequestException('Search query is required')

    // Idempotency: serve a recent identical search from cache so a self-heal
    // retry (or a manual "try again") after a dropped response returns the
    // already-fetched, already-charged page instead of calling upstream again.
    const cacheKey = `${opts.userId}:${opts.platform}:${query.toLowerCase()}:${opts.cursor ?? ''}`
    const cachedPage = this.searchCache.get(cacheKey)
    if (cachedPage) return cachedPage

    // Accumulate pages until the grid is filled (or the platform runs dry) so
    // small first pages (IG returns ~10) don't leave the view half-empty.
    const seen = new Set<string>()
    const collected: TopicSearchResultItem[] = []
    let cursor = opts.cursor ?? null
    let nextCursor: string | null = null
    for (let fetches = 0; fetches < MAX_SEARCH_PAGES; fetches++) {
      const page = await this.scrapeCreators.searchTopicPosts(
        opts.platform,
        query,
        opts.userId,
        opts.orgId,
        cursor,
      )
      if (page.items.length === 0) break

      for (const item of page.items) {
        if (!item.media_id || seen.has(item.media_id)) continue
        seen.add(item.media_id)
        collected.push(item)
      }

      if (!page.next_cursor) {
        nextCursor = null
        break
      }

      nextCursor = page.next_cursor
      if (collected.length >= MIN_SEARCH_RESULTS) break
      cursor = nextCursor
    }

    // Fill in scores for creators whose baseline is already cached — free wins.
    const items = collected.map((item) => {
      const cached = this.cachedBaseline(topicCreatorKey(item.creator))
      if (!cached || cached.median == null || cached.median === 0) return item
      return {
        ...item,
        baseline_median: cached.median,
        outlier_score: Math.round((item.play_count / cached.median) * 100) / 100,
      }
    })
    const page: TopicSearchPage = { items, next_cursor: nextCursor }
    this.searchCache.set(cacheKey, page)
    return page
  }

  async scoreCreators(opts: {
    userId: string
    orgId: string | null
    creators: TopicSearchCreatorRef[]
  }): Promise<TopicCreatorScore[]> {
    const unique = new Map<string, TopicSearchCreatorRef>()
    for (const creator of opts.creators) {
      if (!creator.handle && !creator.channel_id) continue
      const key = topicCreatorKey(creator)
      if (!unique.has(key)) unique.set(key, creator)
      if (unique.size >= MAX_CREATORS_PER_SCORE_CALL) break
    }

    const entries = [...unique.entries()]
    const results: TopicCreatorScore[] = []
    // Bounded concurrency: each uncached creator is one upstream call.
    for (let i = 0; i < entries.length; i += BASELINE_CONCURRENCY) {
      const batch = entries.slice(i, i + BASELINE_CONCURRENCY)
      const scored = await Promise.all(
        batch.map(async ([key, creator]) => {
          const cached = this.cachedBaseline(key)
          if (cached) {
            return { key, baseline_median: cached.median, sample_size: cached.sampleSize }
          }
          try {
            const posts = await this.scrapeCreators.fetchCreatorBaselinePage(
              creator,
              opts.userId,
              opts.orgId,
            )
            const withViews = posts.filter((p) => p.play_count > 0)
            const median = withViews.length > 0 ? medianPlayCount(withViews) : null
            this.baselineCache.set(key, {
              median,
              sampleSize: withViews.length,
              fetchedAt: Date.now(),
            })
            return { key, baseline_median: median, sample_size: withViews.length }
          } catch (err) {
            this.logger.warn(
              `Baseline fetch failed for ${key}: ${err instanceof Error ? err.message : String(err)}`,
            )
            return { key, baseline_median: null, sample_size: 0 }
          }
        }),
      )
      results.push(...scored)
    }
    return results
  }

  async saveTopicResults(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    query: string
    items: TopicSearchResultItem[]
  }): Promise<{ created_count: number; skipped_count: number; item_ids: string[] }> {
    if (opts.items.length === 0) throw new BadRequestException('No results to save')

    const viewType = SOCIAL_VIEW_TYPE_BY_PLATFORM[opts.platform]
    // Dedupe via an indexed-path SQL filter — loading every space item to check
    // a handful of media ids scales with space size, not save size.
    const candidateMediaIds = [...new Set(opts.items.map((i) => i.media_id).filter(Boolean))]
    const existingMediaIds = await this.topicSearchRepo.findExistingMediaIds(
      opts.supabase,
      opts.spaceId,
      viewType,
      candidateMediaIds,
    )

    const itemIds: string[] = []
    let created = 0
    let skipped = 0
    for (const result of opts.items) {
      if (!result.media_id || existingMediaIds.has(result.media_id)) {
        skipped++
        continue
      }
      const handle = result.creator.handle || result.creator.channel_id || 'unknown'
      const content: SocialContentItem = {
        platform: opts.platform,
        media_id: result.media_id,
        shortcode: result.shortcode,
        media_type: result.media_type,
        play_count: result.play_count,
        like_count: result.like_count,
        comment_count: result.comment_count,
        thumbnail_url: result.thumbnail_url,
        video_url: result.video_url,
        taken_at: result.taken_at,
        outlier_score: result.outlier_score ?? 0,
        caption: result.caption,
      }
      const cacheKey = socialImageCacheKey(opts.platform, handle, result.media_id, 'thumbnail')
      const cacheResult = result.thumbnail_url
        ? await this.media.cacheSocialImage(
            opts.platform,
            result.thumbnail_url,
            cacheKey,
            { id: opts.userId },
            opts.orgId ?? undefined,
          )
        : undefined
      const customData = {
        ...socialContentCustomData(opts.platform, handle, content, cacheResult),
        // Topic-search results keep the platform post URL from the search
        // response (more reliable than reconstructing from the shortcode).
        post_url: result.post_url,
        _source: 'topic_search',
        _search_query: opts.query,
        owner_username: handle,
        owner_full_name: result.creator_title,
        owner_follower_count: result.creator_follower_count,
        baseline_median: result.baseline_median,
        yt_channel_id: result.creator.channel_id ?? undefined,
      }
      const createdItem = await this.repo.createItem(
        opts.supabase,
        opts.userId,
        opts.spaceId,
        {
          title: result.caption?.slice(0, 120) || result.shortcode || result.media_id,
          custom_data: customData,
        },
        opts.orgId,
      )
      existingMediaIds.add(result.media_id)
      itemIds.push(String(createdItem.id))
      created++
      if (this.spaceRetrievalIndex) {
        await this.spaceRetrievalIndex.indexSource(opts.supabase, {
          sourceType: this.snapshots.researchSourceType(opts.platform),
          sourceId: String(createdItem.id),
          userId: opts.userId,
          orgId: opts.orgId,
          spaceId: opts.spaceId,
        })
      }
    }
    return { created_count: created, skipped_count: skipped, item_ids: itemIds }
  }

  async listSavedSearches(opts: {
    supabase: SupabaseClient
    spaceId: string
  }): Promise<SavedTopicSearchSummary[]> {
    return this.topicSearchRepo.listSavedSearches(opts.supabase, opts.spaceId)
  }

  async getSavedSearch(opts: {
    supabase: SupabaseClient
    spaceId: string
    searchId: string
  }): Promise<SavedTopicSearch> {
    return this.topicSearchRepo.getSavedSearch(opts.supabase, opts.spaceId, opts.searchId)
  }

  /**
   * Upserts by (space, platform, query) — searches auto-save on run, so
   * re-running "sales objections" refreshes the existing row instead of
   * spamming the sidebar with duplicates. A custom title set by the user is
   * preserved across re-runs.
   */
  async createSavedSearch(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    title: string
    query: string
    filters: SavedTopicSearchFilters
    items: TopicSearchResultItem[]
    nextCursor: string | null
  }): Promise<SavedTopicSearch> {
    const query = opts.query.trim()
    const title = opts.title.trim() || query
    if (!title) throw new BadRequestException('A title or query is required')

    const existing = await this.topicSearchRepo.findSavedSearchByQuery(
      opts.supabase,
      opts.spaceId,
      opts.platform,
      query,
    )

    const withPriorThumbs = existing
      ? this.snapshots.mergeCachedThumbnails(opts.items, existing.results)
      : opts.items
    const results = await this.snapshots.snapshotThumbnails(opts.platform, withPriorThumbs, {
      userId: opts.userId,
      orgId: opts.orgId,
    })

    const lastRunAt = new Date().toISOString()
    if (existing) {
      return this.topicSearchRepo.updateSavedSearchReturning(
        opts.supabase,
        existing.id,
        {
          results,
          result_count: results.length,
          next_cursor: opts.nextCursor,
          last_run_at: lastRunAt,
          updated_at: lastRunAt,
        },
        'Failed to save search',
      )
    }

    return this.topicSearchRepo.createSavedSearch(opts.supabase, {
      user_id: opts.userId,
      org_id: opts.orgId,
      space_id: opts.spaceId,
      platform: opts.platform,
      title,
      query,
      filters: opts.filters ?? {},
      results,
      result_count: results.length,
      next_cursor: opts.nextCursor,
    })
  }

  async updateSavedSearch(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    searchId: string
    title?: string
    filters?: SavedTopicSearchFilters
    /** Replaces the frozen snapshot — used by async outlier-score persistence. */
    results?: TopicSearchResultItem[]
    nextCursor?: string | null
  }): Promise<void> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (opts.title !== undefined) {
      const title = opts.title.trim()
      if (!title) throw new BadRequestException('Title cannot be empty')
      patch.title = title
    }
    if (opts.filters !== undefined) patch.filters = opts.filters
    if (opts.results !== undefined) {
      const saved = await this.getSavedSearch(opts)
      const merged = this.snapshots.mergeCachedThumbnails(opts.results, saved.results)
      const results = await this.snapshots.snapshotThumbnails(saved.platform, merged, {
        userId: opts.userId,
        orgId: opts.orgId,
      })
      patch.results = results
      patch.result_count = results.length
      patch.last_run_at = new Date().toISOString()
    }
    if (opts.nextCursor !== undefined) patch.next_cursor = opts.nextCursor
    await this.topicSearchRepo.updateSavedSearch(
      opts.supabase,
      opts.spaceId,
      opts.searchId,
      patch,
      'Failed to update saved search',
    )
  }

  async deleteSavedSearch(opts: {
    supabase: SupabaseClient
    spaceId: string
    searchId: string
  }): Promise<void> {
    await this.topicSearchRepo.deleteSavedSearch(opts.supabase, opts.spaceId, opts.searchId)
  }

  /**
   * Re-runs the saved query, scores creators server-side, and replaces the
   * snapshot. The baseline cache makes repeat refreshes in the same niche cheap.
   */
  async refreshSavedSearch(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    searchId: string
  }): Promise<SavedTopicSearch> {
    const saved = await this.getSavedSearch(opts)
    const page = await this.searchTopic({
      userId: opts.userId,
      orgId: opts.orgId,
      platform: saved.platform,
      query: saved.query,
    })

    const scores = await this.scoreCreators({
      userId: opts.userId,
      orgId: opts.orgId,
      creators: page.items.map((item) => item.creator),
    })
    const medianByKey = new Map(scores.map((s) => [s.key, s.baseline_median]))
    const previousCachedThumbs = new Map(
      saved.results
        .filter((r) => r.thumbnail_cached_url)
        .map((r) => [r.media_id, r.thumbnail_cached_url!]),
    )
    const scored = page.items.map((item) => {
      const median = medianByKey.get(topicCreatorKey(item.creator))
      const cachedThumb = previousCachedThumbs.get(item.media_id)
      const next = cachedThumb ? { ...item, thumbnail_cached_url: cachedThumb } : item
      if (median == null || median === 0) return next
      return {
        ...next,
        baseline_median: median,
        outlier_score: Math.round((item.play_count / median) * 100) / 100,
      }
    })
    const results = await this.snapshots.snapshotThumbnails(saved.platform, scored, {
      userId: opts.userId,
      orgId: opts.orgId,
    })

    const lastRunAt = new Date().toISOString()
    await this.topicSearchRepo.updateSavedSearch(
      opts.supabase,
      opts.spaceId,
      opts.searchId,
      {
        results,
        result_count: results.length,
        next_cursor: page.next_cursor,
        last_run_at: lastRunAt,
        updated_at: lastRunAt,
      },
      'Failed to refresh saved search',
    )
    return {
      ...saved,
      results,
      result_count: results.length,
      next_cursor: page.next_cursor,
      last_run_at: lastRunAt,
    }
  }

  /**
   * Fetches the next page for a saved snapshot and appends unique results.
   * Requires a persisted next_cursor from the prior run.
   */
  async loadMoreSavedSearch(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    searchId: string
  }): Promise<SavedTopicSearch> {
    const saved = await this.getSavedSearch({
      supabase: opts.supabase,
      spaceId: opts.spaceId,
      searchId: opts.searchId,
    })
    if (!saved.next_cursor) {
      throw new BadRequestException('No more results for this saved search')
    }

    const page = await this.searchTopic({
      userId: opts.userId,
      orgId: opts.orgId,
      platform: saved.platform,
      query: saved.query,
      cursor: saved.next_cursor,
    })

    const existingIds = new Set(saved.results.map((r) => r.media_id))
    const appended = page.items.filter((item) => item.media_id && !existingIds.has(item.media_id))

    const scores = await this.scoreCreators({
      userId: opts.userId,
      orgId: opts.orgId,
      creators: appended.map((item) => item.creator),
    })
    const medianByKey = new Map(scores.map((s) => [s.key, s.baseline_median]))
    const scoredAppended = appended.map((item) => {
      const median = medianByKey.get(topicCreatorKey(item.creator))
      if (median == null || median === 0) return item
      return {
        ...item,
        baseline_median: median,
        outlier_score: Math.round((item.play_count / median) * 100) / 100,
      }
    })

    const mergedRaw = [...saved.results, ...scoredAppended]
    const results = await this.snapshots.snapshotThumbnails(
      saved.platform,
      this.snapshots.mergeCachedThumbnails(mergedRaw, saved.results),
      { userId: opts.userId, orgId: opts.orgId },
    )

    const lastRunAt = new Date().toISOString()
    return this.topicSearchRepo.updateSavedSearchWithSpaceReturning(
      opts.supabase,
      opts.spaceId,
      opts.searchId,
      {
        results,
        result_count: results.length,
        next_cursor: page.next_cursor,
        last_run_at: lastRunAt,
        updated_at: lastRunAt,
      },
      'Failed to load more',
    )
  }

  private cachedBaseline(key: string): { median: number | null; sampleSize: number } | null {
    const hit = this.baselineCache.get(key)
    if (!hit) return null
    if (Date.now() - hit.fetchedAt > BASELINE_CACHE_TTL_MS) {
      this.baselineCache.delete(key)
      return null
    }
    return { median: hit.median, sampleSize: hit.sampleSize }
  }
}
