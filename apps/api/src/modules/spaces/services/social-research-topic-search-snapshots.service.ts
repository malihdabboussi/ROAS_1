import { Injectable } from '@nestjs/common'
import { MediaService } from '../../media/services/media.service'
import type { SocialResearchPlatform, TopicSearchResultItem } from '../types/social-research.types'
import { socialImageCacheKey } from './social-research-utils'

@Injectable()
export class SocialResearchTopicSearchSnapshotsService {
  constructor(private readonly media: MediaService) {}

  mergeCachedThumbnails(
    items: TopicSearchResultItem[],
    prior: TopicSearchResultItem[],
  ): TopicSearchResultItem[] {
    const cachedByMediaId = new Map(
      (prior ?? [])
        .filter((r) => r.thumbnail_cached_url)
        .map((r) => [r.media_id, r.thumbnail_cached_url!]),
    )
    return items.map((item) => {
      if (item.thumbnail_cached_url) return item
      const cached = cachedByMediaId.get(item.media_id)
      return cached ? { ...item, thumbnail_cached_url: cached } : item
    })
  }

  async snapshotThumbnails(
    platform: SocialResearchPlatform,
    items: TopicSearchResultItem[],
    user: { userId: string; orgId: string | null },
  ): Promise<TopicSearchResultItem[]> {
    if (platform === 'youtube') return items
    const out: TopicSearchResultItem[] = []
    for (const item of items) {
      if (item.thumbnail_cached_url || !item.thumbnail_url) {
        out.push(item)
        continue
      }
      const handle = item.creator.handle || 'unknown'
      const cacheKey = socialImageCacheKey(platform, handle, item.media_id, 'thumbnail')
      try {
        const cached = await this.media.cacheSocialImage(
          platform,
          item.thumbnail_url,
          cacheKey,
          { id: user.userId },
          user.orgId ?? undefined,
        )
        out.push(cached.ok && cached.url ? { ...item, thumbnail_cached_url: cached.url } : item)
      } catch {
        out.push(item)
      }
    }
    return out
  }

  researchSourceType(
    platform: SocialResearchPlatform,
  ):
    | 'instagram_research_item'
    | 'tiktok_research_item'
    | 'youtube_research_item'
    | 'twitter_research_item' {
    if (platform === 'tiktok') return 'tiktok_research_item'
    if (platform === 'youtube') return 'youtube_research_item'
    if (platform === 'twitter') return 'twitter_research_item'
    return 'instagram_research_item'
  }
}
