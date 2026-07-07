import { SocialResearchScrapeCreatorsServiceBase08 } from './social-research-scrapecreators-service-08.base'
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

export abstract class SocialResearchScrapeCreatorsServiceBase09 extends SocialResearchScrapeCreatorsServiceBase08 {

  protected twitterTweetViewCount(t: TwitterTweetItem): number {
    const views = t.views?.count
    if (views != null) {
      const n = typeof views === 'string' ? parseInt(views, 10) : views
      if (Number.isFinite(n)) return n
    }
    return t.view_count ?? 0
  }

  protected twitterTweetAuthor(t: TwitterTweetItem): {
    screen_name: string | null
    name: string | null
    followers_count: number | null
    is_verified: boolean
    profile_pic: string | null
    statuses_count: number | null
  } {
    const user = t.core?.user_results?.result
    const legacy = user?.legacy
    return {
      screen_name: legacy?.screen_name ?? t.user?.screen_name ?? null,
      name: legacy?.name ?? t.user?.name ?? null,
      followers_count: legacy?.followers_count ?? null,
      is_verified: Boolean(user?.is_blue_verified ?? legacy?.verified),
      profile_pic: legacy?.profile_image_url_https ?? null,
      statuses_count: legacy?.statuses_count ?? null,
    }
  }

  protected twitterTweetEntities(t: TwitterTweetItem): {
    hashtags: string[]
    mentions: string[]
    urls: string[]
  } {
    const entities = t.legacy?.entities
    const hashtags = (entities?.hashtags ?? [])
      .map((h) => h.text?.trim())
      .filter((x): x is string => Boolean(x))
    const mentions = (entities?.user_mentions ?? [])
      .map((m) => m.screen_name?.trim())
      .filter((x): x is string => Boolean(x))
    const urls = (entities?.urls ?? [])
      .map((u) => u.expanded_url ?? u.display_url ?? '')
      .map((x) => x.trim())
      .filter(Boolean)
    return { hashtags, mentions, urls }
  }

  protected twitterPostSourceLabel(source?: string): string | null {
    if (!source?.trim()) return null
    const match = source.match(/>([^<]+)</)
    return (match?.[1] ?? source).trim() || null
  }

  protected twitterDetectVideo(t: TwitterTweetItem): boolean {
    return this.twitterTweetMedia(t).some((m) => m.type === 'video' || m.type === 'animated_gif')
  }

  protected twitterContentItemFromTweet(
    t: TwitterTweetItem,
    _fallbackHandle: string,
  ): Omit<SocialContentItem, 'outlier_score'> {
    const id = this.twitterTweetId(t)
    const hasVideo = this.twitterDetectVideo(t)
    const firstMedia = this.twitterTweetMedia(t)[0]
    const thumbnail = firstMedia?.media_url_https ?? null
    const createdAt = t.legacy?.created_at ?? t.created_at ?? new Date().toISOString()
    return {
      platform: 'twitter',
      media_id: id,
      shortcode: id,
      media_type: hasVideo ? 'tweet_video' : 'tweet',
      play_count: this.twitterTweetViewCount(t),
      like_count: t.legacy?.favorite_count ?? t.favorite_count ?? null,
      comment_count: t.legacy?.reply_count ?? t.reply_count ?? null,
      thumbnail_url: thumbnail,
      video_url: null,
      taken_at: createdAt,
      caption: t.legacy?.full_text ?? t.full_text ?? t.legacy?.text ?? t.text ?? null,
    }
  }

  protected async fetchTwitterProfile(
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialProfileSummary> {
    const body = await this.run(
      userId,
      'twitter_profile',
      '/v1/twitter/profile',
      this.twitterProfileQuery(handle),
      orgId,
    )
    const payload = unwrapUpstreamPayload(body) as TwitterProfileResponse
    return {
      profile_pic_url: payload?.profile_image_url_https ?? null,
      follower_count: payload?.followers_count ?? 0,
      user_id: payload?.id_str ?? null,
      full_name: payload?.name ?? null,
    }
  }

  protected async fetchTwitterUserTweets(
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialContentItem[]> {
    const body = await this.run(
      userId,
      'twitter_user_tweets',
      '/v1/twitter/user-tweets',
      this.twitterProfileQuery(handle),
      orgId,
    )
    const payload = unwrapUpstreamPayload(body) as {
      tweets?: TwitterTweetItem[]
      data?: TwitterTweetItem[]
    }
    const tweets = payload?.tweets ?? payload?.data ?? []
    // X user-tweets returns ~100 popular tweets (not chronological); skip REELS_WINDOW_DAYS cutoff.
    const items = tweets.map((t) => this.twitterContentItemFromTweet(t as TwitterTweetItem, handle))
    const scored = computeOutlierScores(items)
    scored.sort((a, b) => b.outlier_score - a.outlier_score)
    return scored
  }
}
