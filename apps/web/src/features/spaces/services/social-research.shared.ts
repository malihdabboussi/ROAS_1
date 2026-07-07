/**
 * Shared primitives for the social research client services — kept separate so
 * social-research.service.ts, topic-search.service.ts, and
 * post-enrichment.service.ts can all use them without import cycles.
 */
import type { SocialPlatform, SocialResearchViewType } from '../types/space-schema'

export type SocialMediaType =
  | 'reel'
  | 'image'
  | 'carousel'
  | 'post'
  | 'slideshow'
  | 'youtube_video'
  | 'youtube_short'
  | 'tweet'
  | 'tweet_video'

export interface SocialContentItem {
  platform: SocialPlatform
  media_id: string
  shortcode: string
  media_type: SocialMediaType
  play_count: number
  like_count: number | null
  comment_count: number | null
  thumbnail_url: string | null
  video_url: string | null
  taken_at: string
  outlier_score: number
  caption: string | null
}

export const SOCIAL_VIEW_TYPE_BY_PLATFORM: Record<SocialPlatform, SocialResearchViewType> = {
  instagram: 'instagram_research',
  tiktok: 'tiktok_research',
  youtube: 'youtube_research',
  twitter: 'twitter_research',
}

export const VIEW_TYPE_TO_SOCIAL_PLATFORM: Record<SocialResearchViewType, SocialPlatform> = {
  instagram_research: 'instagram',
  tiktok_research: 'tiktok',
  youtube_research: 'youtube',
  twitter_research: 'twitter',
}

export function socialApiPath(spaceId: string, platform: SocialPlatform, suffix: string): string {
  return `/api/spaces/${spaceId}/social-research/${platform}${suffix}`
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}
