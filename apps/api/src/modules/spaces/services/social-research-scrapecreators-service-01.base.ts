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

export abstract class SocialResearchScrapeCreatorsServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  abstract fetchSocialComments(...args: any[]): any;
  protected abstract assertUpstreamCommentsOk(...args: any[]): any;
  abstract searchTopicPosts(...args: any[]): any;
  abstract fetchCreatorBaselinePage(...args: any[]): any;
  protected abstract searchYtVideos(...args: any[]): any;
  protected abstract searchIgReels(...args: any[]): any;
  protected abstract searchTtVideos(...args: any[]): any;
  protected abstract fetchIgProfile(...args: any[]): any;
  protected abstract fetchIgPosts(...args: any[]): any;
  protected abstract fetchIgPostInfo(...args: any[]): any;
  protected abstract fetchIgTranscript(...args: any[]): any;
  protected abstract parseIgTranscript(...args: any[]): any;
  protected abstract ttPickFirstUrl(...args: any[]): any;
  protected abstract fetchTtProfile(...args: any[]): any;
  protected abstract ttIsSlideshow(...args: any[]): any;
  protected abstract ttMediaTypeFor(...args: any[]): any;
  protected abstract ttThumbnailFor(...args: any[]): any;
  protected abstract ttContentItemFromAweme(...args: any[]): any;
  protected abstract fetchTtVideos(...args: any[]): any;
  protected abstract fetchTtPostInfo(...args: any[]): any;
  protected abstract ttPlainTextFromVtt(...args: any[]): any;
  protected abstract fetchTtTranscript(...args: any[]): any;
  protected abstract ytNormalizedHandle(...args: any[]): any;
  protected abstract ytChannelProfileQuery(...args: any[]): any;
  protected abstract ytShortsQuery(...args: any[]): any;
  protected abstract ytVideosQuery(...args: any[]): any;
  protected abstract ytBestAvatarUrl(...args: any[]): any;
  protected abstract fetchYtProfile(...args: any[]): any;
  protected abstract ytContentItemFromVideo(...args: any[]): any;
  protected abstract ytContentItemFromShort(...args: any[]): any;
  protected abstract fetchYtVideosOnePage(...args: any[]): any;
  protected abstract fetchYtShortsOnePage(...args: any[]): any;
  protected abstract fetchYtPagedContent(...args: any[]): any;
  protected abstract fetchYtVideos(...args: any[]): any;
  protected abstract fetchYtPostInfo(...args: any[]): any;
  protected abstract fetchYtTranscript(...args: any[]): any;
  protected abstract twitterNormalizedHandle(...args: any[]): any;
  protected abstract twitterProfileQuery(...args: any[]): any;
  protected abstract twitterTweetMedia(...args: any[]): any;
  protected abstract twitterTweetId(...args: any[]): any;
  protected abstract twitterTweetViewCount(...args: any[]): any;
  protected abstract twitterTweetAuthor(...args: any[]): any;
  protected abstract twitterTweetEntities(...args: any[]): any;
  protected abstract twitterPostSourceLabel(...args: any[]): any;
  protected abstract twitterDetectVideo(...args: any[]): any;
  protected abstract twitterContentItemFromTweet(...args: any[]): any;
  protected abstract fetchTwitterProfile(...args: any[]): any;
  protected abstract fetchTwitterUserTweets(...args: any[]): any;
  protected abstract fetchTwitterTweet(...args: any[]): any;
  protected abstract fetchTwitterTranscript(...args: any[]): any;
  protected abstract emptyRichPostInfo(...args: any[]): any;
  // End generated abstract declarations.




  constructor(
    protected readonly api: ScrapeCreatorsApiService,
    protected readonly credits: CreditsService,
    protected readonly errorReporter: ErrorReporter,
  ) {
  }

  protected async run(
    userId: string,
    actionSlug: string,
    upstreamPath: string,
    query: Record<string, string>,
    orgId?: string | null,
  ): Promise<unknown> {
    const { status, body } = await this.api.forwardGet(upstreamPath, query)
    if (status < 200 || status >= 300) {
      const msg =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message?: unknown }).message)
          : typeof body === 'string'
            ? body
            : `Social Analysis error (${status})`
      const httpError = new HttpException({ success: false, error: msg, status }, status)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'spaces/social_research',
          error_code: `scrapecreators_${actionSlug}_failed`,
          message: msg,
          user_id: userId,
          context: { actionSlug, upstreamPath, status, orgId: orgId ?? null },
        },
        httpError,
      )
      throw httpError
    }
    const creditUnits = scrapecreatorsCreditsForAction(actionSlug)
    await this.credits.processDirectTextUsage({
      userId,
      orgId: orgId ?? undefined,
      feature: 'scrapecreators',
      action: actionSlug,
      modelName: `scrapecreators/${actionSlug}`,
      usage: {
        input: creditUnits,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: creditUnits,
      },
      costSource: 'scrapecreators_flat',
    })
    return body
  }

  async fetchSocialProfile(
    platform: SocialResearchPlatform,
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialProfileSummary> {
    if (platform === 'twitter') return this.fetchTwitterProfile(handle, userId, orgId)
    if (platform === 'youtube') return this.fetchYtProfile(handle, userId, orgId)
    if (platform === 'tiktok') return this.fetchTtProfile(handle, userId, orgId)
    return this.fetchIgProfile(handle, userId, orgId)
  }

  async fetchSocialPosts(
    platform: SocialResearchPlatform,
    handle: string,
    userId: string,
    orgId?: string | null,
    channelId?: string | null,
  ): Promise<SocialContentItem[]> {
    if (platform === 'twitter') return this.fetchTwitterUserTweets(handle, userId, orgId)
    if (platform === 'youtube') return this.fetchYtVideos(handle, userId, orgId, channelId)
    if (platform === 'tiktok') return this.fetchTtVideos(handle, userId, orgId)
    return this.fetchIgPosts(handle, userId, orgId)
  }

  async fetchSocialPostInfo(
    platform: SocialResearchPlatform,
    postUrl: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialRichPostInfo> {
    if (platform === 'twitter') return this.fetchTwitterTweet(postUrl, userId, orgId)
    if (platform === 'youtube') return this.fetchYtPostInfo(postUrl, userId, orgId)
    if (platform === 'tiktok') return this.fetchTtPostInfo(postUrl, userId, orgId)
    return this.fetchIgPostInfo(postUrl, userId, orgId)
  }

  async fetchSocialTranscript(
    platform: SocialResearchPlatform,
    postUrl: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    if (platform === 'twitter') return this.fetchTwitterTranscript(postUrl, userId, orgId)
    if (platform === 'youtube') return this.fetchYtTranscript(postUrl, userId, orgId)
    if (platform === 'tiktok') return this.fetchTtTranscript(postUrl, userId, orgId)
    return this.fetchIgTranscript(postUrl, userId, orgId)
  }
}
