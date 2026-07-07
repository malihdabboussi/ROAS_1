import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { SpacesRepository } from '../repositories/spaces.repository'
import type {
  SocialCommentItem,
  SocialResearchAutomationItem,
  SocialResearchEnrichment,
  SocialResearchPlatform,
  SocialResearchPlatformSelector,
  SocialResearchSyncMode,
  SocialResearchTrackedAccount,
  SocialResearchViewType,
  SocialRichPostInfo,
} from '../types/social-research.types'
import { SocialResearchScrapeCreatorsService } from './social-research-scrapecreators.service'
import { SocialResearchTranscriptFallbackService } from './social-research-transcript-fallback.service'
import { SocialResearchAccountSyncService } from './social-research-account-sync.service'
import {
  buildPostInfoCustomDataPatch,
  extractHook,
  formatSocialResearchDigest,
  mapRowToAutomationItem,
  mediaIdFromCustomData,
  parseSocialHandle,
  platformsForSelector,
  SOCIAL_VIEW_TYPE_BY_PLATFORM,
  socialPostUrlForContent,
  socialResearchConfigKeyForPlatform,
  socialResearchSourceType,
  socialResearchViewsFromSchema,
  VIEW_TYPE_TO_SOCIAL_PLATFORM,
} from './social-research-utils'
import type { SocialResearchSpaceViewRow } from './social-research-utils'
import { TtlCache } from './ttl-cache'

/**
 * Idempotency window for credit-charging mutations (account add/sync, analyze).
 * A self-heal retry of a call whose response was dropped returns the cached
 * result instead of re-running the side effects and re-charging upstream.
 */
const MUTATION_CACHE_TTL_MS = 60 * 1000

@Injectable()
export class SocialResearchOrchestrationService {
  private readonly analyzeCache = new TtlCache<{
    postInfo: SocialRichPostInfo
    transcript: string | null
    hook: string | null
  }>(MUTATION_CACHE_TTL_MS)

  constructor(
    private readonly repo: SpacesRepository,
    private readonly scrapeCreators: SocialResearchScrapeCreatorsService,
    private readonly transcriptFallback: SocialResearchTranscriptFallbackService,
    private readonly accountSync: SocialResearchAccountSyncService,
    private readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
  ) {}

  async syncSocialResearch(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platformSelector: SocialResearchPlatformSelector
    mode: SocialResearchSyncMode
  }): Promise<{
    synced_count: number
    existing_item_count?: number
    created_count: number
    updated_count: number
    platforms: string[]
    handles: string[]
  }> {
    const space = await this.repo.findSpaceByIdForAccess(opts.supabase, opts.spaceId)
    if (!space) throw new BadRequestException('Space not found')

    const platforms = platformsForSelector(opts.platformSelector)
    const views = socialResearchViewsFromSchema(space.schema, platforms)
    if (views.length === 0) {
      throw new BadRequestException('No social research views found')
    }
    const handles: string[] = []
    let syncedCount = 0
    let createdCount = 0
    let updatedCount = 0

    if (opts.mode === 'use_existing') {
      const items = await this.repo.findItemsBySpaceIdForAccess(opts.supabase, opts.spaceId)
      const viewTypes = new Set(platforms.map((p) => SOCIAL_VIEW_TYPE_BY_PLATFORM[p]))
      let existingItemCount = 0
      for (const row of items) {
        const cd = (row.custom_data ?? {}) as Record<string, unknown>
        if (!viewTypes.has(cd._view_type as SocialResearchViewType)) continue
        existingItemCount++
      }
      for (const view of views) {
        const platform = view.platform
        const configKey = socialResearchConfigKeyForPlatform(platform)
        const accounts =
          (view.view[configKey] as { tracked_accounts?: SocialResearchTrackedAccount[] })
            ?.tracked_accounts ?? []
        for (const acct of accounts) {
          if (acct.handle) handles.push(acct.handle.toLowerCase())
        }
      }
      syncedCount = new Set(handles).size
      return {
        synced_count: syncedCount,
        existing_item_count: existingItemCount,
        created_count: 0,
        updated_count: 0,
        platforms,
        handles: [...new Set(handles)],
      }
    }

    for (const { view, platform } of views) {
      const configKey = socialResearchConfigKeyForPlatform(platform)
      const config: { tracked_accounts: SocialResearchTrackedAccount[] } = {
        tracked_accounts:
          (view[configKey] as { tracked_accounts?: SocialResearchTrackedAccount[] } | undefined)
            ?.tracked_accounts ?? [],
      }
      const accounts = config.tracked_accounts ?? []
      let schemaDirty = false

      for (const account of accounts) {
        const handle = parseSocialHandle(platform, account.handle).toLowerCase()
        if (!handle) continue
        handles.push(handle)
        const result = await this.accountSync.syncAccountForPlatform({
          supabase: opts.supabase,
          userId: opts.userId,
          orgId: opts.orgId,
          spaceId: opts.spaceId,
          platform,
          handle,
          profileUserId: account.user_id_ig ?? undefined,
        })
        syncedCount++
        createdCount += result.created
        updatedCount += result.updated
        account.last_synced_at = result.lastSyncedAt
        if (result.accountPatch) Object.assign(account, result.accountPatch)
        schemaDirty = true
      }

      if (schemaDirty) {
        await this.persistViewConfig(opts, view, platform, config)
      }
    }

    return {
      synced_count: syncedCount,
      created_count: createdCount,
      updated_count: updatedCount,
      platforms,
      handles: [...new Set(handles)],
    }
  }

  async selectSocialOutliers(opts: {
    supabase: SupabaseClient
    spaceId: string
    platformSelector: SocialResearchPlatformSelector
    minScore: number
    limit: number
    sinceDays: number
  }): Promise<{
    outlier_count: number
    selected_item_ids: string[]
    outliers: SocialResearchAutomationItem[]
    digest: string
  }> {
    const platforms = platformsForSelector(opts.platformSelector)
    const viewTypes = new Set(platforms.map((p) => SOCIAL_VIEW_TYPE_BY_PLATFORM[p]))
    const cutoff = Date.now() - opts.sinceDays * 86_400_000
    const items = await this.repo.findItemsBySpaceIdForAccess(opts.supabase, opts.spaceId)

    const candidates: SocialResearchAutomationItem[] = []
    for (const row of items) {
      const mapped = mapRowToAutomationItem(
        row as { id: string; custom_data?: Record<string, unknown> },
      )
      if (!mapped || !viewTypes.has(mapped.view_type)) continue
      if (mapped.outlier_score < opts.minScore) continue
      const takenMs = mapped.taken_at ? new Date(mapped.taken_at).getTime() : NaN
      if (!Number.isFinite(takenMs) || takenMs < cutoff) continue
      candidates.push(mapped)
    }

    candidates.sort((a, b) => {
      if (b.outlier_score !== a.outlier_score) return b.outlier_score - a.outlier_score
      return b.play_count - a.play_count
    })
    const limit = Math.min(Math.max(opts.limit, 1), 50)
    const outliers = candidates.slice(0, limit)
    const digest = formatSocialResearchDigest(outliers)

    return {
      outlier_count: outliers.length,
      selected_item_ids: outliers.map((o) => o.item_id),
      outliers,
      digest,
    }
  }

  async enrichSocialResearchItems(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    itemIds: string[]
    enrichments: SocialResearchEnrichment[]
  }): Promise<{
    enriched_count: number
    enriched_item_ids: string[]
    outliers: SocialResearchAutomationItem[]
    digest: string
  }> {
    if (opts.itemIds.length === 0)
      throw new BadRequestException('No social research items to enrich')
    const wantsCaption = opts.enrichments.includes('caption')
    const wantsTranscript = opts.enrichments.includes('transcript')
    const wantsHook = opts.enrichments.includes('hook')
    const enrichedIds: string[] = []

    for (const itemId of opts.itemIds) {
      const row = await this.repo.findItemById(opts.supabase, opts.spaceId, itemId)
      if (!row) throw new BadRequestException(`Item not found: ${itemId}`)
      const cd = (row.custom_data ?? {}) as Record<string, unknown>
      const viewType = cd._view_type as string | undefined
      if (
        viewType !== 'instagram_research' &&
        viewType !== 'tiktok_research' &&
        viewType !== 'youtube_research' &&
        viewType !== 'twitter_research'
      ) {
        throw new BadRequestException(`Item ${itemId} is not a social research item`)
      }
      const rawPlatform = cd._platform
      const platform =
        rawPlatform === 'instagram' ||
        rawPlatform === 'tiktok' ||
        rawPlatform === 'youtube' ||
        rawPlatform === 'twitter'
          ? rawPlatform
          : VIEW_TYPE_TO_SOCIAL_PLATFORM[viewType as keyof typeof VIEW_TYPE_TO_SOCIAL_PLATFORM]
      const handle = String(cd._handle ?? '')
      const shortcode = String(cd.shortcode ?? mediaIdFromCustomData(cd) ?? '')
      if (!shortcode) throw new BadRequestException(`Item ${itemId} is missing social media id`)
      const url = socialPostUrlForContent(
        platform,
        handle,
        shortcode,
        String(cd.media_type ?? 'reel'),
      )

      const patch: Record<string, unknown> = {}
      if (typeof cd.post_url !== 'string' || !cd.post_url.trim()) {
        patch.post_url = url
      }
      const existingCaption =
        typeof cd.caption === 'string' && cd.caption.trim().length > 0 ? cd.caption.trim() : null
      let caption = existingCaption
      if (wantsCaption) {
        const info = await this.scrapeCreators.fetchSocialPostInfo(
          platform,
          url,
          opts.userId,
          opts.orgId,
        )
        Object.assign(patch, buildPostInfoCustomDataPatch(info, url))
        caption =
          typeof patch.caption === 'string' && patch.caption.trim() ? patch.caption : caption
      }

      let transcript =
        typeof cd.transcript === 'string' && cd.transcript.trim() ? cd.transcript.trim() : null
      if ((wantsTranscript || wantsHook) && !transcript) {
        transcript = await this.fetchTranscriptWithFallback(platform, url, opts.userId, opts.orgId)
        if (transcript) patch.transcript = transcript
      }
      let hook = typeof cd.hook === 'string' && cd.hook.trim() ? cd.hook.trim() : null
      if (wantsHook && transcript) {
        hook = extractHook(transcript)
        if (hook !== cd.hook) patch.hook = hook
      }
      if (Object.keys(patch).length > 0) {
        await this.repo.updateItem(
          opts.supabase,
          opts.userId,
          opts.spaceId,
          itemId,
          { custom_data: patch },
          opts.orgId,
        )
        await this.indexResearchItem(opts, itemId, platform)
      }
      const hasRequestedData =
        (!wantsCaption || Boolean(caption)) &&
        (!wantsTranscript || Boolean(transcript)) &&
        (!wantsHook || Boolean(hook))
      if (hasRequestedData) enrichedIds.push(itemId)
    }

    const outliers: SocialResearchAutomationItem[] = []
    for (const itemId of enrichedIds) {
      const row = await this.repo.findItemById(opts.supabase, opts.spaceId, itemId)
      if (!row) continue
      const mapped = mapRowToAutomationItem(
        row as { id: string; custom_data?: Record<string, unknown> },
      )
      if (mapped) outliers.push(mapped)
    }

    return {
      enriched_count: enrichedIds.length,
      enriched_item_ids: enrichedIds,
      outliers,
      digest: formatSocialResearchDigest(outliers),
    }
  }

  async addTrackedAccount(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    handle: string
  }): Promise<{ account: SocialResearchTrackedAccount; item_count: number }> {
    return this.accountSync.addTrackedAccount(opts)
  }

  async syncTrackedAccount(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    handle: string
  }): Promise<{
    item_count: number
    last_synced_at: string
    account_patch?: Partial<SocialResearchTrackedAccount>
  }> {
    return this.accountSync.syncTrackedAccount(opts)
  }

  async removeTrackedAccountItems(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    handle: string
  }): Promise<number> {
    return this.accountSync.removeTrackedAccountItems(opts)
  }

  async analyzeSocialPost(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    itemId: string
    shortcodeOrId: string
    handle?: string
    isSlideshow?: boolean
  }): Promise<{ postInfo: SocialRichPostInfo; transcript: string | null; hook: string | null }> {
    const cacheKey = `${opts.userId}:${opts.spaceId}:${opts.itemId}`
    const cachedAnalysis = this.analyzeCache.get(cacheKey)
    if (cachedAnalysis) return cachedAnalysis
    const row = await this.repo.findItemById(opts.supabase, opts.spaceId, opts.itemId)
    const cd = ((row as { custom_data?: Record<string, unknown> | null } | null)?.custom_data ??
      {}) as Record<string, unknown>
    const handle = String(opts.handle ?? cd._handle ?? '')
    const mediaType = String(cd.media_type ?? (opts.isSlideshow ? 'youtube_short' : 'reel'))
    const storedPostUrl =
      typeof cd.post_url === 'string' && cd.post_url.trim() ? cd.post_url.trim() : null
    const url =
      storedPostUrl ?? socialPostUrlForContent(opts.platform, handle, opts.shortcodeOrId, mediaType)
    const postInfo = await this.scrapeCreators.fetchSocialPostInfo(
      opts.platform,
      url,
      opts.userId,
      opts.orgId,
    )
    const shouldFetchTranscript = opts.platform !== 'twitter' || Boolean(postInfo.has_audio)
    let transcript: string | null = null
    if (shouldFetchTranscript) {
      try {
        transcript = await this.fetchTranscriptWithFallback(
          opts.platform,
          url,
          opts.userId,
          opts.orgId,
        )
      } catch {
        transcript = null
      }
    }
    const patch = buildPostInfoCustomDataPatch(postInfo, url)
    if (transcript) patch.transcript = transcript
    const hook = transcript ? extractHook(transcript) : null
    if (hook) patch.hook = hook
    await this.repo.updateItem(
      opts.supabase,
      opts.userId,
      opts.spaceId,
      opts.itemId,
      { custom_data: patch },
      opts.orgId,
    )
    await this.indexResearchItem(opts, opts.itemId, opts.platform)
    const result = { postInfo, transcript, hook }
    this.analyzeCache.set(cacheKey, result)
    return result
  }

  private async indexResearchItem(
    opts: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
      spaceId: string
    },
    itemId: string,
    platform: SocialResearchPlatform,
  ): Promise<void> {
    if (!this.spaceRetrievalIndex) return
    await this.spaceRetrievalIndex.indexSource(opts.supabase, {
      sourceType: socialResearchSourceType(platform),
      sourceId: itemId,
      userId: opts.userId,
      orgId: opts.orgId,
      spaceId: opts.spaceId,
    })
  }

  /**
   * Fetches a page of top-level comments and persists them frozen onto the
   * item. A cursor appends the next page to what's already stored; without
   * one, stored comments are returned free unless force.
   */
  async loadItemComments(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    itemId: string
    force?: boolean
    cursor?: string | null
  }): Promise<{ comments: SocialCommentItem[]; next_cursor: string | null }> {
    const row = await this.repo.findItemById(opts.supabase, opts.spaceId, opts.itemId)
    if (!row) throw new BadRequestException('Item not found')
    const cd = ((row as { custom_data?: Record<string, unknown> | null }).custom_data ??
      {}) as Record<string, unknown>
    const cached = Array.isArray(cd.comments) ? (cd.comments as SocialCommentItem[]) : []
    const cachedCursor =
      typeof cd.comments_next_cursor === 'string' ? cd.comments_next_cursor : null
    if (cached.length > 0 && !opts.force && !opts.cursor) {
      return { comments: cached, next_cursor: cachedCursor }
    }

    const handle = String(cd._handle ?? cd.owner_username ?? '')
    const mediaType = String(cd.media_type ?? 'reel')
    const shortcode = String(cd.shortcode ?? mediaIdFromCustomData(cd) ?? '')
    const postUrl =
      typeof cd.post_url === 'string' && cd.post_url.trim()
        ? cd.post_url.trim()
        : socialPostUrlForContent(opts.platform, handle, shortcode, mediaType)

    const page = await this.scrapeCreators.fetchSocialComments(
      opts.platform,
      postUrl,
      opts.userId,
      opts.orgId,
      opts.cursor ?? null,
    )
    // Cursor = append to the stored set; fresh/force = replace it.
    const base = opts.cursor ? cached : []
    const seen = new Set(base.map((c) => c.id))
    const comments = [...base, ...page.comments.filter((c) => c.id && !seen.has(c.id))]
    await this.repo.updateItem(
      opts.supabase,
      opts.userId,
      opts.spaceId,
      opts.itemId,
      {
        custom_data: {
          comments,
          comments_next_cursor: page.next_cursor,
          comments_fetched_at: new Date().toISOString(),
        },
      },
      opts.orgId,
    )
    await this.indexResearchItem(opts, opts.itemId, opts.platform)
    return { comments, next_cursor: page.next_cursor }
  }

  /** Public: the video-breakdown service reuses the same transcript chain. */
  async fetchTranscriptWithFallback(
    platform: SocialResearchPlatform,
    url: string,
    userId: string,
    orgId: string | null,
  ): Promise<string | null> {
    try {
      const transcript = await this.scrapeCreators.fetchSocialTranscript(
        platform,
        url,
        userId,
        orgId,
      )
      if (transcript?.trim()) return transcript.trim()
    } catch (err) {
      if (platform !== 'instagram') throw err
    }

    if (platform !== 'instagram') return null

    const fallback = await this.transcriptFallback.fetchTranscriptViaAgent({
      userId,
      orgId,
      platform,
      url,
    })
    return fallback?.trim() || null
  }

  private async persistViewConfig(
    opts: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
      spaceId: string
    },
    view: SocialResearchSpaceViewRow,
    platform: SocialResearchPlatform,
    config: { tracked_accounts: SocialResearchTrackedAccount[] },
  ): Promise<void> {
    const space = await this.repo.findSpaceById(
      opts.supabase,
      opts.userId,
      opts.spaceId,
      opts.orgId,
    )
    if (!space) return
    const schema = (space.schema ?? {}) as { views?: SocialResearchSpaceViewRow[] }
    const configKey = socialResearchConfigKeyForPlatform(platform)
    const nextViews = (schema.views ?? []).map((v) => {
      if (v.id !== view.id) return v
      return { ...v, [configKey]: config }
    })
    await this.repo.updateSpace(
      opts.supabase,
      opts.userId,
      opts.spaceId,
      { schema: { ...schema, views: nextViews } },
      opts.orgId,
    )
  }

}
