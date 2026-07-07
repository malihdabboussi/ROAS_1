import { SocialResearchScrapeCreatorsServiceBase02 } from './social-research-scrapecreators-service-02.base'
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

export abstract class SocialResearchScrapeCreatorsServiceBase03 extends SocialResearchScrapeCreatorsServiceBase02 {

  /**
   * One page of a creator's recent posts — exactly one upstream call. Used for
   * outlier baselines, where the multi-page fetchers would cost up to 10 calls
   * per creator.
   */
  async fetchCreatorBaselinePage(
    creator: TopicSearchCreatorRef,
    userId: string,
    orgId?: string | null,
  ): Promise<Array<{ play_count: number }>> {
    if (creator.platform === 'youtube') {
      const { items } = await this.fetchYtVideosOnePage(
        creator.handle,
        userId,
        orgId,
        creator.channel_id ?? null,
      )
      return items
    }
    if (creator.platform === 'tiktok') {
      const body = await this.run(
        userId,
        'tiktok_profile_videos',
        '/v3/tiktok/profile/videos',
        { handle: creator.handle },
        orgId,
      )
      const payload = unwrapUpstreamPayload(body) as { aweme_list?: TtAweme[] }
      return (payload?.aweme_list ?? []).map((a) => ({
        play_count: a.statistics?.play_count ?? 0,
      }))
    }
    const body = await this.run(
      userId,
      'instagram_reels',
      '/v1/instagram/user/reels',
      { handle: creator.handle },
      orgId,
    )
    const payload = unwrapUpstreamPayload(body) as {
      items?: Array<{ media?: ScReelMedia }>
      reels?: Array<{ media?: ScReelMedia }>
    }
    const rows = payload?.items ?? payload?.reels ?? []
    return rows
      .map((row) => row.media)
      .filter((m): m is ScReelMedia => Boolean(m))
      .map((m) => ({ play_count: m.play_count ?? m.ig_play_count ?? 0 }))
  }

  protected async searchYtVideos(
    query: string,
    userId: string,
    orgId?: string | null,
    cursor?: string | null,
  ): Promise<TopicSearchPage> {
    const params: Record<string, string> = { query }
    if (cursor) params.continuationToken = cursor
    const body = await this.run(userId, 'youtube_search', '/v1/youtube/search', params, orgId)
    const payload = unwrapUpstreamPayload(body) as {
      videos?: YtSearchVideo[]
      continuationToken?: string
    }
    const items: TopicSearchResultItem[] = (payload?.videos ?? [])
      .filter((v) => v.id)
      .map((v) => {
        const handle = (v.channel?.handle ?? '').replace(/^@/, '').replace(/^channel\//, '')
        return {
          platform: 'youtube' as const,
          media_id: v.id!,
          shortcode: v.id!,
          media_type: 'youtube_video' as const,
          play_count: v.viewCountInt ?? 0,
          like_count: null,
          comment_count: null,
          thumbnail_url: v.thumbnail ?? null,
          video_url: null,
          taken_at: v.publishedTime ?? new Date().toISOString(),
          caption: v.title ?? null,
          post_url: v.url ?? `https://www.youtube.com/watch?v=${v.id}`,
          creator: {
            platform: 'youtube' as const,
            handle: handle || (v.channel?.id ?? ''),
            channel_id: v.channel?.id ?? null,
          },
          creator_title: v.channel?.title ?? null,
          creator_thumbnail: v.channel?.thumbnail ?? null,
          creator_follower_count: null,
          outlier_score: null,
          baseline_median: null,
        }
      })
    return { items, next_cursor: payload?.continuationToken ?? null }
  }

  protected async searchIgReels(
    query: string,
    userId: string,
    orgId?: string | null,
    cursor?: string | null,
  ): Promise<TopicSearchPage> {
    // The v2 endpoint paginates by page number (~10 reels per page); the
    // cursor carries the next page to fetch.
    const page = cursor && /^\d+$/.test(cursor) ? cursor : null
    const params: Record<string, string> = { query }
    if (page) params.page = page
    const body = await this.run(
      userId,
      'instagram_reels_search',
      '/v2/instagram/reels/search',
      params,
      orgId,
    )
    const payload = unwrapUpstreamPayload(body) as { reels?: IgSearchReel[] }
    const items: TopicSearchResultItem[] = (payload?.reels ?? [])
      .filter((r) => r.id || r.shortcode)
      .map((r) => {
        const handle = r.owner?.username ?? ''
        const shortcode = r.shortcode ?? r.id!
        return {
          platform: 'instagram' as const,
          media_id: r.id ?? shortcode,
          shortcode,
          media_type: 'reel' as const,
          play_count: r.video_play_count ?? r.video_view_count ?? 0,
          like_count: r.like_count ?? null,
          comment_count: r.comment_count ?? null,
          thumbnail_url: r.thumbnail_src ?? r.display_url ?? null,
          video_url: r.video_url ?? null,
          taken_at: r.taken_at ?? new Date().toISOString(),
          caption: r.caption ?? null,
          post_url: r.url ?? `https://www.instagram.com/reel/${shortcode}/`,
          creator: { platform: 'instagram' as const, handle, channel_id: null },
          creator_title: r.owner?.full_name ?? handle ?? null,
          creator_thumbnail: r.owner?.profile_pic_url ?? null,
          creator_follower_count: r.owner?.follower_count ?? null,
          outlier_score: null,
          baseline_median: null,
        }
      })
    // No cursor in the response — synthesize one from the page number.
    const currentPage = page ? Number(page) : 1
    return { items, next_cursor: items.length > 0 ? String(currentPage + 1) : null }
  }
}
