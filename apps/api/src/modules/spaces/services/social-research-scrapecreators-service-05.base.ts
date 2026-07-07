import { SocialResearchScrapeCreatorsServiceBase04 } from './social-research-scrapecreators-service-04.base'
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

export abstract class SocialResearchScrapeCreatorsServiceBase05 extends SocialResearchScrapeCreatorsServiceBase04 {

  protected async fetchIgPostInfo(
    postUrl: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialRichPostInfo> {
    const body = await this.run(
      userId,
      'instagram_post_info',
      '/v1/instagram/post',
      { url: postUrl },
      orgId,
    )
    const raw = body as Record<string, unknown>
    const unwrapped = unwrapUpstreamPayload(raw?.data ?? raw) as Record<string, unknown> | undefined
    const m = (unwrapped?.xdt_shortcode_media ?? raw?.xdt_shortcode_media) as
      | ScPostInfoMedia
      | undefined
    if (m) {
      const tagged = (m.edge_media_to_tagged_user?.edges ?? [])
        .map((e) => e.node?.user?.username)
        .filter(Boolean) as string[]
      return {
        caption: m.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
        like_count: m.edge_media_preview_like?.count ?? null,
        comment_count: m.edge_media_to_parent_comment?.count ?? null,
        play_count: m.video_play_count ?? null,
        video_duration: m.video_duration ?? null,
        owner_username: m.owner?.username ?? null,
        owner_full_name: m.owner?.full_name ?? null,
        owner_follower_count: m.owner?.edge_followed_by?.count ?? null,
        owner_is_verified: m.owner?.is_verified ?? false,
        owner_profile_pic: m.owner?.profile_pic_url ?? null,
        owner_post_count: m.owner?.edge_owner_to_timeline_media?.count ?? null,
        audio_name: m.clips_music_attribution_info?.song_name ?? null,
        audio_artist: m.clips_music_attribution_info?.artist_name ?? null,
        is_original_audio: m.clips_music_attribution_info?.uses_original_audio ?? false,
        is_paid_partnership: m.is_paid_partnership ?? false,
        tagged_users: tagged,
        has_audio: m.has_audio ?? false,
      }
    }
    return this.emptyRichPostInfo()
  }

  protected async fetchIgTranscript(
    postUrl: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const body = await this.run(
      userId,
      'instagram_media_transcript',
      '/v2/instagram/media/transcript',
      { url: postUrl },
      orgId,
    )
    return this.parseIgTranscript(body)
  }

  protected parseIgTranscript(res: unknown): string | null {
    const r = res as Record<string, unknown> | null | undefined
    const rawData = r?.data ?? r
    if (typeof rawData === 'string') {
      const s = rawData.trim()
      return s || null
    }
    const unwrapped = unwrapUpstreamPayload(rawData)
    if (typeof unwrapped === 'string') {
      const s = unwrapped.trim()
      return s || null
    }
    if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
      const o = unwrapped as Record<string, unknown>
      const direct = o.transcript ?? o.text
      if (typeof direct === 'string' && direct.trim()) return direct.trim()
      const transcripts = o.transcripts
      if (Array.isArray(transcripts)) {
        const parts: string[] = []
        for (const item of transcripts) {
          if (typeof item === 'string' && item.trim()) parts.push(item.trim())
          else if (item && typeof item === 'object') {
            const row = item as Record<string, unknown>
            const seg = row.text ?? row.transcript ?? row.content
            if (typeof seg === 'string' && seg.trim()) parts.push(seg.trim())
          }
        }
        if (parts.length > 0) return parts.join('\n\n')
      }
    }
    return null
  }

  protected ttPickFirstUrl(urls: string[] | undefined): string | null {
    return urls?.[0] ?? null
  }

  protected async fetchTtProfile(
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialProfileSummary> {
    const body = await this.run(userId, 'tiktok_profile', '/v1/tiktok/profile', { handle }, orgId)
    const data = unwrapUpstreamPayload(body)
    const user =
      (data as { user?: TtAuthor })?.user ??
      ((data as TtAuthor)?.unique_id ? (data as TtAuthor) : null)
    return {
      profile_pic_url:
        this.ttPickFirstUrl(user?.avatar_larger?.url_list) ??
        this.ttPickFirstUrl(user?.avatar_medium?.url_list) ??
        this.ttPickFirstUrl(user?.avatar_thumb?.url_list) ??
        null,
      follower_count: user?.follower_count ?? 0,
      user_id: user?.sec_uid ?? (user?.uid != null ? String(user.uid) : null),
      full_name: user?.nickname ?? null,
    }
  }

  protected ttIsSlideshow(aweme: TtAweme): boolean {
    return Boolean(aweme.image_post_info?.images && aweme.image_post_info.images.length > 0)
  }

  protected ttMediaTypeFor(aweme: TtAweme): SocialMediaType {
    if (this.ttIsSlideshow(aweme)) return 'slideshow'
    return 'reel'
  }

  protected ttThumbnailFor(aweme: TtAweme): string | null {
    if (this.ttIsSlideshow(aweme)) {
      const first = aweme.image_post_info?.images?.[0]
      return (
        this.ttPickFirstUrl(first?.thumbnail?.url_list) ??
        this.ttPickFirstUrl(first?.display_image?.url_list) ??
        this.ttPickFirstUrl(aweme.video?.cover?.url_list) ??
        null
      )
    }
    return (
      this.ttPickFirstUrl(aweme.video?.cover?.url_list) ??
      this.ttPickFirstUrl(aweme.video?.origin_cover?.url_list) ??
      this.ttPickFirstUrl(aweme.video?.dynamic_cover?.url_list) ??
      null
    )
  }

  protected ttContentItemFromAweme(aweme: TtAweme): Omit<SocialContentItem, 'outlier_score'> {
    const id = aweme.aweme_id ?? ''
    const stats = aweme.statistics ?? {}
    return {
      platform: 'tiktok',
      media_id: id,
      shortcode: id,
      media_type: this.ttMediaTypeFor(aweme),
      play_count: stats.play_count ?? 0,
      like_count: stats.digg_count ?? null,
      comment_count: stats.comment_count ?? null,
      thumbnail_url: this.ttThumbnailFor(aweme),
      video_url: this.ttIsSlideshow(aweme)
        ? null
        : (this.ttPickFirstUrl(aweme.video?.download_no_watermark_addr?.url_list) ??
          this.ttPickFirstUrl(aweme.video?.play_addr?.url_list) ??
          this.ttPickFirstUrl(aweme.video?.download_addr?.url_list) ??
          null),
      taken_at: aweme.create_time
        ? new Date(aweme.create_time * 1000).toISOString()
        : new Date().toISOString(),
      caption: aweme.desc ?? null,
    }
  }
}
