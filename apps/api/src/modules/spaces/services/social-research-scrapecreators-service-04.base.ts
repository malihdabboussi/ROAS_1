import { SocialResearchScrapeCreatorsServiceBase03 } from './social-research-scrapecreators-service-03.base'
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

export abstract class SocialResearchScrapeCreatorsServiceBase04 extends SocialResearchScrapeCreatorsServiceBase03 {

  protected async searchTtVideos(
    query: string,
    userId: string,
    orgId?: string | null,
    cursor?: string | null,
  ): Promise<TopicSearchPage> {
    const params: Record<string, string> = { query }
    if (cursor) params.cursor = cursor
    const body = await this.run(
      userId,
      'tiktok_search_keyword',
      '/v1/tiktok/search/keyword',
      params,
      orgId,
    )
    const payload = unwrapUpstreamPayload(body) as {
      search_item_list?: Array<{ aweme_info?: TtAweme }>
      cursor?: number | string
      has_more?: number | boolean
    }
    const items: TopicSearchResultItem[] = (payload?.search_item_list ?? [])
      .map((row) => row.aweme_info)
      .filter((a): a is TtAweme => Boolean(a?.aweme_id))
      .map((a) => {
        const base = this.ttContentItemFromAweme(a)
        const handle = a.author?.unique_id ?? ''
        return {
          ...base,
          post_url: `https://www.tiktok.com/@${handle}/video/${base.media_id}`,
          creator: { platform: 'tiktok' as const, handle, channel_id: null },
          creator_title: a.author?.nickname ?? handle ?? null,
          creator_thumbnail: this.ttPickFirstUrl(a.author?.avatar_thumb?.url_list),
          creator_follower_count: a.author?.follower_count ?? null,
          outlier_score: null,
          baseline_median: null,
        }
      })
    const hasMore = payload?.has_more === 1 || payload?.has_more === true
    const nextCursor = hasMore && payload?.cursor != null ? String(payload.cursor) : null
    return { items, next_cursor: nextCursor }
  }

  protected async fetchIgProfile(
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialProfileSummary> {
    const body = await this.run(
      userId,
      'instagram_profile',
      '/v1/instagram/profile',
      { handle },
      orgId,
    )
    const block = unwrapUpstreamPayload(body) as { user?: Record<string, unknown> } | undefined
    const user = block?.user
    return {
      profile_pic_url:
        (user?.profile_pic_url_hd as string) ?? (user?.profile_pic_url as string) ?? null,
      follower_count: (user?.edge_followed_by as { count?: number })?.count ?? 0,
      user_id: (user?.id as string) ?? null,
      full_name: (user?.full_name as string) ?? null,
    }
  }

  protected async fetchIgPosts(
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialContentItem[]> {
    const cutoff = Date.now() - REELS_WINDOW_DAYS * 86_400_000
    const rawItems: ScReelMedia[] = []
    let nextMaxId: string | undefined
    let pages = 0

    while (pages < MAX_PAGES) {
      const query: Record<string, string> = { handle }
      if (nextMaxId) query.next_max_id = nextMaxId
      if (pages > 0) await wait(PAGE_DELAY_MS)

      let body: unknown
      let lastErr: unknown
      for (let attempt = 0; attempt <= PAGE_RETRY_DELAYS.length; attempt++) {
        try {
          body = await this.run(userId, 'instagram_posts', '/v2/instagram/user/posts', query, orgId)
          lastErr = undefined
          break
        } catch (err) {
          lastErr = err
          if (attempt < PAGE_RETRY_DELAYS.length) await wait(PAGE_RETRY_DELAYS[attempt]!)
        }
      }
      if (lastErr) {
        if (pages === 0) throw lastErr
        break
      }

      let pageItems: ScReelMedia[] = []
      let moreAvailable = false
      let responseNextMaxId: string | undefined
      const res = body as Record<string, unknown>
      if (Array.isArray(res?.items)) {
        pageItems = res.items as ScReelMedia[]
        moreAvailable = Boolean(res.more_available)
        responseNextMaxId = res.next_max_id as string | undefined
      } else if (res?.data) {
        const d = res.data
        if (Array.isArray(d)) pageItems = d as ScReelMedia[]
        else if (d && typeof d === 'object') {
          const obj = d as Record<string, unknown>
          if (Array.isArray(obj.items)) pageItems = obj.items as ScReelMedia[]
          moreAvailable = Boolean(obj.more_available)
          responseNextMaxId = obj.next_max_id as string | undefined
        }
      }
      pages++
      for (const m of pageItems) rawItems.push(m)
      if (pageItems.length === 0 || !moreAvailable) break
      nextMaxId = responseNextMaxId ?? pageItems[pageItems.length - 1]?.pk
      if (!nextMaxId) break
    }

    const mapped = rawItems
      .filter((m) => (m.taken_at ?? 0) * 1000 >= cutoff)
      .map((m): Omit<SocialContentItem, 'outlier_score'> => {
        const thumb = m.display_uri ?? m.image_versions2?.candidates?.[0]?.url ?? null
        const mediaType: SocialMediaType =
          m.media_type === 2 ? 'reel' : m.media_type === 8 ? 'carousel' : 'image'
        return {
          platform: 'instagram',
          media_id: m.id || m.pk,
          shortcode: m.code,
          media_type: mediaType,
          play_count: m.play_count ?? m.ig_play_count ?? 0,
          like_count: m.like_count ?? null,
          comment_count: m.comment_count ?? null,
          thumbnail_url: thumb,
          video_url: m.video_versions?.[0]?.url ?? null,
          taken_at: new Date(m.taken_at * 1000).toISOString(),
          caption: m.caption?.text ?? null,
        }
      })
    const scored = computeOutlierScores(mapped.map((m) => ({ ...m, outlier_score: 0 })))
    scored.sort((a, b) => b.outlier_score - a.outlier_score)
    return scored
  }
}
