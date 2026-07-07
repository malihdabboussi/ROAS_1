import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MediaService } from '../../media/services/media.service'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { SpacesRepository } from '../repositories/spaces.repository'
import type {
  CachedSocialImageResult,
  SocialContentItem,
  SocialProfileSummary,
  SocialResearchPlatform,
  SocialResearchTrackedAccount,
} from '../types/social-research.types'
import { SocialResearchScrapeCreatorsService } from './social-research-scrapecreators.service'
import {
  mediaIdFromCustomData,
  parseSocialHandle,
  profilePicCachePatch,
  SOCIAL_VIEW_TYPE_BY_PLATFORM,
  socialContentCustomData,
  socialImageCacheKey,
  socialPostUrlForContent,
  socialResearchSourceType,
  thumbnailCachePatch,
} from './social-research-utils'
import { TtlCache } from './ttl-cache'

const ACCOUNT_CACHE_TTL_MS = 60 * 1000

type SyncAccountResult = {
  created: number
  updated: number
  lastSyncedAt: string
  accountPatch?: Partial<SocialResearchTrackedAccount>
}

@Injectable()
export class SocialResearchAccountSyncService {
  private readonly addAccountCache = new TtlCache<{
    account: SocialResearchTrackedAccount
    item_count: number
  }>(ACCOUNT_CACHE_TTL_MS)
  private readonly syncAccountCache = new TtlCache<{
    item_count: number
    last_synced_at: string
    account_patch?: Partial<SocialResearchTrackedAccount>
  }>(ACCOUNT_CACHE_TTL_MS)

  constructor(
    private readonly repo: SpacesRepository,
    private readonly scrapeCreators: SocialResearchScrapeCreatorsService,
    private readonly media: MediaService,
    private readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
  ) {}

  async addTrackedAccount(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    handle: string
  }): Promise<{ account: SocialResearchTrackedAccount; item_count: number }> {
    const normalized = parseSocialHandle(opts.platform, opts.handle).toLowerCase()
    const cacheKey = `${opts.userId}:${opts.spaceId}:${opts.platform}:${normalized}`
    const cached = this.addAccountCache.get(cacheKey)
    if (cached) return cached
    const profile = await this.scrapeCreators.fetchSocialProfile(
      opts.platform,
      normalized,
      opts.userId,
      opts.orgId,
    )
    const posts = await this.scrapeCreators.fetchSocialPosts(
      opts.platform,
      normalized,
      opts.userId,
      opts.orgId,
      profile.user_id,
    )
    const seen = new Set<string>()
    const allContent: SocialContentItem[] = []
    for (const item of posts) {
      if (seen.has(item.media_id)) continue
      seen.add(item.media_id)
      allContent.push(item)
    }

    const imageCache = await this.cacheImagesForContent(
      opts.platform,
      normalized,
      profile,
      allContent,
      opts.userId,
      opts.orgId,
    )

    let created = 0
    for (const item of allContent) {
      const createdItem = await this.repo.createItem(
        opts.supabase,
        opts.userId,
        opts.spaceId,
        {
          title: item.shortcode || item.media_id,
          custom_data: socialContentCustomData(
            opts.platform,
            normalized,
            item,
            imageCache.get(
              socialImageCacheKey(opts.platform, normalized, item.media_id, 'thumbnail'),
            ),
          ),
        },
        opts.orgId,
      )
      await this.indexResearchItem(opts, String(createdItem.id), opts.platform)
      created++
    }

    const profileId = profile.user_id ?? normalized
    const account: SocialResearchTrackedAccount = {
      handle: normalized,
      user_id_ig: profile.user_id ?? undefined,
      follower_count: profile.follower_count,
      last_synced_at: new Date().toISOString(),
      ...profilePicCachePatch(
        profile.profile_pic_url,
        imageCache.get(socialImageCacheKey(opts.platform, normalized, profileId, 'profile')),
      ),
    }

    const result = { account, item_count: created }
    this.addAccountCache.set(cacheKey, result)
    return result
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
    const handle = parseSocialHandle(opts.platform, opts.handle).toLowerCase()
    const cacheKey = `${opts.userId}:${opts.spaceId}:${opts.platform}:${handle}`
    const cached = this.syncAccountCache.get(cacheKey)
    if (cached) return cached
    const result = await this.syncAccountForPlatform({ ...opts, handle })
    const out = {
      item_count: result.created,
      last_synced_at: result.lastSyncedAt,
      account_patch: result.accountPatch,
    }
    this.syncAccountCache.set(cacheKey, out)
    return out
  }

  async removeTrackedAccountItems(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    handle: string
  }): Promise<number> {
    const h = opts.handle.trim().toLowerCase()
    const target = SOCIAL_VIEW_TYPE_BY_PLATFORM[opts.platform]
    const allItems = await this.repo.findItemsBySpaceId(
      opts.supabase,
      opts.userId,
      opts.spaceId,
      opts.orgId,
    )
    const toDelete = allItems.filter((item) => {
      const cd = (item.custom_data ?? {}) as Record<string, unknown>
      return cd._view_type === target && String(cd._handle ?? '').toLowerCase() === h
    })
    for (const item of toDelete) {
      await this.deleteResearchItem(opts, String(item.id), opts.platform)
      await this.repo.deleteItem(opts.supabase, opts.userId, opts.spaceId, item.id, opts.orgId)
    }
    return toDelete.length
  }

  async syncAccountForPlatform(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    handle: string
    profileUserId?: string
  }): Promise<SyncAccountResult> {
    const { platform, handle, spaceId } = opts
    const target = SOCIAL_VIEW_TYPE_BY_PLATFORM[platform]
    const allItems = await this.repo.findItemsBySpaceIdForAccess(opts.supabase, spaceId)
    const existing = allItems.filter((item) => {
      const cd = (item.custom_data ?? {}) as Record<string, unknown>
      return cd._view_type === target && String(cd._handle ?? '').toLowerCase() === handle
    })
    const existingMediaIds = new Set(
      existing
        .map((item) => mediaIdFromCustomData((item.custom_data ?? {}) as Record<string, unknown>))
        .filter((id): id is string => Boolean(id)),
    )

    const posts = await this.scrapeCreators.fetchSocialPosts(
      platform,
      handle,
      opts.userId,
      opts.orgId,
    )
    let profile: SocialProfileSummary | null = null
    try {
      profile = await this.scrapeCreators.fetchSocialProfile(
        platform,
        handle,
        opts.userId,
        opts.orgId,
      )
    } catch {
      profile = null
    }

    const seen = new Set<string>()
    const allContent: SocialContentItem[] = []
    for (const item of posts) {
      if (seen.has(item.media_id)) continue
      seen.add(item.media_id)
      allContent.push(item)
    }

    const imageTargets = [
      ...(profile?.profile_pic_url
        ? [
            {
              sourceUrl: profile.profile_pic_url,
              cacheKey: socialImageCacheKey(platform, handle, profile.user_id ?? handle, 'profile'),
            },
          ]
        : []),
      ...allContent
        .filter((item) => item.thumbnail_url)
        .filter((item) => {
          if (!existingMediaIds.has(item.media_id)) return true
          const match = existing.find((ex) => {
            const cd = (ex.custom_data ?? {}) as Record<string, unknown>
            return mediaIdFromCustomData(cd) === item.media_id
          })
          return !(match?.custom_data as Record<string, unknown> | undefined)?.thumbnail_asset_id
        })
        .map((item) => ({
          sourceUrl: item.thumbnail_url!,
          cacheKey: socialImageCacheKey(platform, handle, item.media_id, 'thumbnail'),
        })),
    ]

    const imageCache = await this.cacheImageTargets(platform, imageTargets, opts.userId, opts.orgId)

    let created = 0
    let updated = 0
    for (const item of allContent) {
      if (existingMediaIds.has(item.media_id)) {
        const match = existing.find((ex) => {
          const cd = (ex.custom_data ?? {}) as Record<string, unknown>
          return mediaIdFromCustomData(cd) === item.media_id
        })
        if (match) {
          const cd = (match.custom_data ?? {}) as Record<string, unknown>
          const hasCachedThumbnail = Boolean(cd.thumbnail_asset_id)
          await this.repo.updateItem(
            opts.supabase,
            opts.userId,
            spaceId,
            match.id,
            {
              custom_data: {
                play_count: item.play_count,
                outlier_score: item.outlier_score,
                like_count: item.like_count,
                comment_count: item.comment_count,
                post_url: socialPostUrlForContent(
                  platform,
                  handle,
                  item.shortcode,
                  item.media_type,
                ),
                ...(!hasCachedThumbnail
                  ? thumbnailCachePatch(
                      item.thumbnail_url,
                      imageCache.get(
                        socialImageCacheKey(platform, handle, item.media_id, 'thumbnail'),
                      ),
                    )
                  : {}),
              },
            },
            opts.orgId,
          )
          await this.indexResearchItem(opts, String(match.id), platform)
          updated++
        }
        continue
      }
      const createdItem = await this.repo.createItem(
        opts.supabase,
        opts.userId,
        spaceId,
        {
          title: item.shortcode || item.media_id,
          custom_data: socialContentCustomData(
            platform,
            handle,
            item,
            imageCache.get(socialImageCacheKey(platform, handle, item.media_id, 'thumbnail')),
          ),
        },
        opts.orgId,
      )
      await this.indexResearchItem(opts, String(createdItem.id), platform)
      created++
    }

    const lastSyncedAt = new Date().toISOString()
    const accountPatch: Partial<SocialResearchTrackedAccount> | undefined = profile
      ? {
          user_id_ig: profile.user_id ?? undefined,
          follower_count: profile.follower_count,
          ...profilePicCachePatch(
            profile.profile_pic_url,
            imageCache.get(
              socialImageCacheKey(platform, handle, profile.user_id ?? handle, 'profile'),
            ),
          ),
        }
      : undefined

    return { created, updated, lastSyncedAt, accountPatch }
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

  private async deleteResearchItem(
    opts: { supabase: SupabaseClient },
    itemId: string,
    platform: SocialResearchPlatform,
  ): Promise<void> {
    if (!this.spaceRetrievalIndex) return
    await this.spaceRetrievalIndex.deleteSource(
      opts.supabase,
      socialResearchSourceType(platform),
      itemId,
    )
  }

  private async cacheImagesForContent(
    platform: SocialResearchPlatform,
    handle: string,
    profile: { profile_pic_url: string | null; user_id: string | null },
    content: SocialContentItem[],
    userId: string,
    orgId: string | null,
  ): Promise<Map<string, CachedSocialImageResult>> {
    const profileId = profile.user_id ?? handle
    const targets = [
      ...(profile.profile_pic_url
        ? [
            {
              sourceUrl: profile.profile_pic_url,
              cacheKey: socialImageCacheKey(platform, handle, profileId, 'profile'),
            },
          ]
        : []),
      ...content
        .filter((item) => item.thumbnail_url)
        .map((item) => ({
          sourceUrl: item.thumbnail_url!,
          cacheKey: socialImageCacheKey(platform, handle, item.media_id, 'thumbnail'),
        })),
    ]
    return this.cacheImageTargets(platform, targets, userId, orgId)
  }

  private async cacheImageTargets(
    platform: SocialResearchPlatform,
    targets: Array<{ sourceUrl: string; cacheKey: string }>,
    userId: string,
    orgId: string | null,
  ): Promise<Map<string, CachedSocialImageResult>> {
    const unique = new Map<string, { sourceUrl: string; cacheKey: string }>()
    for (const t of targets) {
      if (!t.sourceUrl || unique.has(t.cacheKey)) continue
      unique.set(t.cacheKey, t)
    }
    const map = new Map<string, CachedSocialImageResult>()
    const user = { id: userId }
    for (const target of unique.values()) {
      const result = await this.media.cacheSocialImage(
        platform,
        target.sourceUrl,
        target.cacheKey,
        user,
        orgId ?? undefined,
      )
      map.set(target.cacheKey, result)
    }
    return map
  }
}
