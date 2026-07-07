import { SocialResearchScrapeCreatorsServiceBase01 } from './social-research-scrapecreators-service-01.base'
import { HttpException, Injectable } from '@nestjs/common'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { scrapecreatorsCreditsForAction } from '../../integrations/scrapecreators/scrapecreators.constants'
import { ScrapeCreatorsApiService } from '../../integrations/scrapecreators/services/scrapecreators-api.service'
import type {
  SocialContentItem,
  SocialMediaType,
  SocialProfileSummary,
  SocialResearchPlatform,
  SocialRichPostInfo,
  TopicSearchCreatorRef,
  TopicSearchPage,
  TopicSearchResultItem,
} from '../types/social-research.types'
import {
  computeOutlierScores,
  REELS_WINDOW_DAYS,
  unwrapUpstreamPayload,
} from './social-research-utils'

const MAX_PAGES = 10
const PAGE_DELAY_MS = 1500
const PAGE_RETRY_DELAYS = [2000, 3000]

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface ScReelMedia {
  taken_at: number
  pk: string
  id: string
  code: string
  media_type: number
  play_count?: number
  ig_play_count?: number
  like_count?: number
  comment_count?: number
  caption?: { text?: string } | null
  display_uri?: string
  video_versions?: Array<{ url: string }>
  image_versions2?: {
    candidates?: Array<{ url: string }>
    additional_candidates?: {
      first_frame?: { url?: string }
      igtv_first_frame?: { url?: string }
    }
  }
}

interface ScPostInfoMedia {
  shortcode?: string
  video_play_count?: number
  video_duration?: number
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> }
  edge_media_preview_like?: { count?: number }
  edge_media_to_parent_comment?: { count?: number }
  owner?: {
    username?: string
    full_name?: string
    is_verified?: boolean
    profile_pic_url?: string
    edge_followed_by?: { count?: number }
    edge_owner_to_timeline_media?: { count?: number }
  }
  clips_music_attribution_info?: {
    artist_name?: string
    song_name?: string
    uses_original_audio?: boolean
  }
  edge_media_to_tagged_user?: { edges?: Array<{ node?: { user?: { username?: string } } }> }
  is_paid_partnership?: boolean
  has_audio?: boolean
}

interface TtAuthor {
  unique_id?: string
  nickname?: string
  sec_uid?: string
  uid?: string | number
  follower_count?: number
  aweme_count?: number
  custom_verify?: string
  enterprise_verify_reason?: string
  verification_type?: number
  avatar_larger?: { url_list?: string[] }
  avatar_medium?: { url_list?: string[] }
  avatar_thumb?: { url_list?: string[] }
}

interface TtAweme {
  aweme_id?: string
  desc?: string
  create_time?: number
  author?: TtAuthor
  video?: {
    duration?: number
    play_addr?: { url_list?: string[] }
    download_addr?: { url_list?: string[] }
    download_no_watermark_addr?: { url_list?: string[] }
    cover?: { url_list?: string[] }
    origin_cover?: { url_list?: string[] }
    dynamic_cover?: { url_list?: string[] }
  }
  image_post_info?: {
    images?: Array<{ thumbnail?: { url_list?: string[] }; display_image?: { url_list?: string[] } }>
  }
  music?: { title?: string; author?: string; is_original?: boolean; is_original_sound?: boolean }
  added_sound_music_info?: {
    title?: string
    author?: string
    is_original?: boolean
    is_original_sound?: boolean
  }
  statistics?: { play_count?: number; digg_count?: number; comment_count?: number }
  text_extra?: Array<{ type?: number; custom_text?: string }>
  is_ads?: boolean
  branded_content_accounts?: unknown
}

/** Shape verified live against /v1/youtube/search on 2026-06-11. */
interface YtSearchVideo {
  type?: string
  id?: string
  url?: string
  title?: string
  thumbnail?: string
  channel?: {
    id?: string
    title?: string
    handle?: string
    thumbnail?: string
  }
  viewCountInt?: number
  publishedTime?: string
  lengthSeconds?: number
}

/** Shape verified live against /v2/instagram/reels/search on 2026-06-11. */
interface IgSearchReel {
  id?: string
  shortcode?: string
  caption?: string | null
  video_play_count?: number
  video_view_count?: number
  like_count?: number
  comment_count?: number
  thumbnail_src?: string
  display_url?: string
  video_url?: string
  url?: string
  taken_at?: string
  is_video?: boolean
  owner?: {
    username?: string
    full_name?: string
    follower_count?: number
    is_verified?: boolean
    profile_pic_url?: string
    post_count?: number
  }
}

/** Shape verified live against /v1/tiktok/video/comments on 2026-06-11. */
interface TtVideoCommentItem {
  cid?: string
  text?: string
  digg_count?: number
  reply_comment_total?: number
  create_time?: number
  user?: { nickname?: string; unique_id?: string }
}

/** Shape per the documented /v2/instagram/post/comments contract (2026-06-11). */
interface IgPostCommentItem {
  id?: string
  text?: string
  created_at?: string
  comment_like_count?: number
  user?: { username?: string; is_verified?: boolean }
}

/** Shape verified live against /v1/youtube/video/comments on 2026-06-11. */
interface YtCommentItem {
  id?: string
  content?: string
  publishedTime?: string
  replyLevel?: number
  author?: { name?: string; isCreator?: boolean; isVerified?: boolean }
  engagement?: { likes?: number; replies?: number }
}

interface YtAvatarSource {
  url?: string
  width?: number
  height?: number
}

interface YtChannelResponse {
  channelId?: string
  channel?: string
  name?: string
  avatar?: { image?: { sources?: YtAvatarSource[] } }
  subscriberCount?: number
  description?: string
}

interface YtVideoItem {
  type?: string
  id?: string
  url?: string
  title?: string
  description?: string
  thumbnail?: string
  viewCountInt?: number
  viewCountText?: string
  publishedTime?: string
  lengthSeconds?: number
  lengthText?: string
}

interface YtShortItem {
  type?: string
  id?: string
  url?: string
  title?: string
  description?: string
  thumbnail?: string
  viewCountInt?: number
  likeCountInt?: number
  commentCountInt?: number
  publishDate?: string
  durationMs?: number
  durationFormatted?: string
}

interface YtVideoDetails {
  id?: string
  videoId?: string
  title?: string
  description?: string | null
  thumbnail?: string
  viewCountInt?: number
  viewCountText?: string
  likeCount?: number
  likeCountInt?: number
  likeCountText?: string
  commentCount?: number
  commentCountInt?: number
  commentCountText?: string
  publishDate?: string
  publishDateText?: string
  lengthSeconds?: number
  lengthInSeconds?: number
  durationMs?: number
  durationFormatted?: string
  genre?: string
  keywords?: string[]
  type?: string
  channel?: {
    id?: string
    title?: string
    handle?: string
    url?: string
    thumbnail?: string
  }
}

interface YtTranscriptSegment {
  text?: string
  startMs?: number
  endMs?: number
  startTimeText?: string
}

interface YtTranscriptResponse {
  videoId?: string
  type?: string
  url?: string
  transcript?: YtTranscriptSegment[]
  transcript_only_text?: string
  language?: string
}

interface TwitterProfileResponse {
  id_str?: string
  screen_name?: string
  name?: string
  profile_image_url_https?: string
  followers_count?: number
  friends_count?: number
  statuses_count?: number
  description?: string
}

interface TwitterTweetItem {
  rest_id?: string
  id_str?: string
  full_text?: string
  text?: string
  created_at?: string
  favorite_count?: number
  retweet_count?: number
  reply_count?: number
  view_count?: number
  views?: { count?: string | number }
  source?: string
  user?: { screen_name?: string; name?: string }
  core?: {
    user_results?: {
      result?: {
        is_blue_verified?: boolean
        legacy?: {
          screen_name?: string
          name?: string
          followers_count?: number
          statuses_count?: number
          verified?: boolean
          profile_image_url_https?: string
        }
      }
    }
  }
  legacy?: {
    id_str?: string
    full_text?: string
    text?: string
    created_at?: string
    favorite_count?: number
    retweet_count?: number
    reply_count?: number
    quote_count?: number
    bookmark_count?: number
    lang?: string
    entities?: {
      hashtags?: Array<{ text?: string }>
      user_mentions?: Array<{ screen_name?: string }>
      urls?: Array<{ expanded_url?: string; display_url?: string }>
      media?: Array<{
        type?: 'photo' | 'video' | 'animated_gif'
        media_url_https?: string
      }>
    }
    extended_entities?: {
      media?: Array<{
        type?: 'photo' | 'video' | 'animated_gif'
        media_url_https?: string
      }>
    }
  }
  media?: Array<{
    type?: 'photo' | 'video' | 'animated_gif'
    media_url_https?: string
    video_info?: { variants?: Array<{ url?: string; content_type?: string; bitrate?: number }> }
  }>
}

interface TwitterTweetDetailsResponse extends TwitterTweetItem {}

interface TwitterTranscriptResponse {
  transcript?: string
  transcript_only_text?: string
}

export abstract class SocialResearchScrapeCreatorsServiceBase02 extends SocialResearchScrapeCreatorsServiceBase01 {

  /**
   * One page of top-level viewer comments — one upstream call per platform.
   * The cursor formats differ per platform (YT continuationToken, TT numeric
   * offset, IG opaque cursor) but flow through opaquely.
   */
  async fetchSocialComments(
    platform: SocialResearchPlatform,
    postUrl: string,
    userId: string,
    orgId?: string | null,
    cursor?: string | null,
  ): Promise<{
    comments: import('../types/social-research.types').SocialCommentItem[]
    next_cursor: string | null
  }> {
    if (platform === 'youtube') {
      const params: Record<string, string> = { url: postUrl }
      // Pagination param verified live 2026-06-11 (20 fresh comments, no overlap).
      if (cursor) params.continuationToken = cursor
      const body = await this.run(
        userId,
        'youtube_video_comments',
        '/v1/youtube/video/comments',
        params,
        orgId,
      )
      this.assertUpstreamCommentsOk(body)
      const payload = unwrapUpstreamPayload(body) as {
        comments?: YtCommentItem[]
        continuationToken?: string
      }
      const comments = (payload?.comments ?? [])
        .filter((c) => (c.replyLevel ?? 0) === 0 && (c.content ?? '').trim())
        .map((c) => ({
          id: c.id ?? '',
          text: (c.content ?? '').trim(),
          author_name: c.author?.name ?? null,
          author_is_creator: Boolean(c.author?.isCreator),
          like_count: c.engagement?.likes ?? null,
          reply_count: c.engagement?.replies ?? null,
          published_at: c.publishedTime ?? null,
        }))
      return {
        comments,
        next_cursor: comments.length > 0 ? (payload?.continuationToken ?? null) : null,
      }
    }
    if (platform === 'tiktok') {
      const params: Record<string, string> = { url: postUrl }
      if (cursor) params.cursor = cursor
      const body = await this.run(
        userId,
        'tiktok_comments',
        '/v1/tiktok/video/comments',
        params,
        orgId,
      )
      this.assertUpstreamCommentsOk(body)
      const payload = unwrapUpstreamPayload(body) as {
        comments?: TtVideoCommentItem[]
        cursor?: number
        has_more?: number
      }
      const comments = (payload?.comments ?? [])
        .filter((c) => (c.text ?? '').trim())
        .map((c) => ({
          id: c.cid ?? '',
          text: (c.text ?? '').trim(),
          author_name: c.user?.nickname ?? c.user?.unique_id ?? null,
          author_is_creator: false,
          like_count: c.digg_count ?? null,
          reply_count: c.reply_comment_total ?? null,
          published_at: c.create_time ? new Date(c.create_time * 1000).toISOString() : null,
        }))
      const hasMore = payload?.has_more === 1 && payload?.cursor != null
      return { comments, next_cursor: hasMore ? String(payload.cursor) : null }
    }
    if (platform === 'instagram') {
      const params: Record<string, string> = { url: postUrl }
      if (cursor) params.cursor = cursor
      const body = await this.run(
        userId,
        'instagram_comments',
        '/v2/instagram/post/comments',
        params,
        orgId,
      )
      this.assertUpstreamCommentsOk(body)
      const payload = unwrapUpstreamPayload(body) as {
        comments?: IgPostCommentItem[]
        cursor?: string
      }
      const comments = (payload?.comments ?? [])
        .filter((c) => (c.text ?? '').trim())
        .map((c) => ({
          id: c.id ?? '',
          text: (c.text ?? '').trim(),
          author_name: c.user?.username ?? null,
          author_is_creator: false,
          like_count: c.comment_like_count ?? null,
          reply_count: null,
          published_at: c.created_at ?? null,
        }))
      return {
        comments,
        next_cursor: comments.length > 0 ? (payload?.cursor ?? null) : null,
      }
    }
    throw new HttpException(
      { success: false, error: `Comments are not available for ${platform}` },
      400,
    )
  }

  /**
   * Some upstream failures arrive as HTTP 200 with success:false (e.g. IG
   * "Post not found") — surface them instead of mapping to an empty list.
   */
  protected assertUpstreamCommentsOk(body: unknown): void {
    const b = body as { success?: boolean; message?: string; error?: string } | null
    if (b && b.success === false) {
      throw new HttpException(
        { success: false, error: b.message || b.error || 'Comments are unavailable for this post' },
        422,
      )
    }
  }

  /** Keyword search across a platform — one upstream call per page, results unscored. */
  async searchTopicPosts(
    platform: SocialResearchPlatform,
    query: string,
    userId: string,
    orgId?: string | null,
    cursor?: string | null,
  ): Promise<TopicSearchPage> {
    if (platform === 'youtube') return this.searchYtVideos(query, userId, orgId, cursor)
    if (platform === 'tiktok') return this.searchTtVideos(query, userId, orgId, cursor)
    if (platform === 'instagram') return this.searchIgReels(query, userId, orgId, cursor)
    throw new HttpException(
      { success: false, error: `Topic search is not available for ${platform}` },
      400,
    )
  }
}
