import { SocialResearchScrapeCreatorsServiceBase05 } from './social-research-scrapecreators-service-05.base'
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

export abstract class SocialResearchScrapeCreatorsServiceBase06 extends SocialResearchScrapeCreatorsServiceBase05 {

  protected async fetchTtVideos(
    handle: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialContentItem[]> {
    const cutoff = Date.now() - REELS_WINDOW_DAYS * 86_400_000
    const rawItems: TtAweme[] = []
    let cursor: string | undefined
    let pages = 0

    while (pages < MAX_PAGES) {
      const query: Record<string, string> = { handle }
      if (cursor) query.max_cursor = cursor
      if (pages > 0) await wait(PAGE_DELAY_MS)

      let body: unknown
      let lastErr: unknown
      for (let attempt = 0; attempt <= PAGE_RETRY_DELAYS.length; attempt++) {
        try {
          body = await this.run(
            userId,
            'tiktok_profile_videos',
            '/v3/tiktok/profile/videos',
            query,
            orgId,
          )
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

      const payload = unwrapUpstreamPayload(body) as {
        aweme_list?: TtAweme[]
        has_more?: number | boolean
        max_cursor?: number
      }
      const list = payload?.aweme_list ?? []
      pages++
      let stoppedByDate = false
      for (const aweme of list) {
        if (aweme.create_time && aweme.create_time * 1000 < cutoff) {
          stoppedByDate = true
          break
        }
        rawItems.push(aweme)
      }
      const hasMore = payload?.has_more === 1 || payload?.has_more === true
      if (!hasMore || stoppedByDate || list.length === 0) break
      if (payload?.max_cursor != null) cursor = String(payload.max_cursor)
      else break
    }

    const mapped = rawItems.map((aweme) => this.ttContentItemFromAweme(aweme))
    const scored = computeOutlierScores(mapped.map((m) => ({ ...m, outlier_score: 0 })))
    scored.sort((a, b) => b.outlier_score - a.outlier_score)
    return scored
  }

  protected async fetchTtPostInfo(
    postUrl: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SocialRichPostInfo> {
    const body = await this.run(
      userId,
      'tiktok_video_info',
      '/v2/tiktok/video',
      { url: postUrl },
      orgId,
    )
    const payload = unwrapUpstreamPayload(body) as { aweme_detail?: TtAweme }
    const aweme = payload?.aweme_detail
    if (!aweme) return this.emptyRichPostInfo()
    const author = aweme.author ?? {}
    const music = aweme.music ?? aweme.added_sound_music_info ?? {}
    const tagged = (aweme.text_extra ?? [])
      .filter((e) => (e.type ?? 0) === 0 && e.custom_text)
      .map((e) => (e.custom_text ?? '').replace(/^@/, ''))
      .filter(Boolean)
    return {
      caption: aweme.desc ?? null,
      like_count: aweme.statistics?.digg_count ?? null,
      comment_count: aweme.statistics?.comment_count ?? null,
      play_count: aweme.statistics?.play_count ?? null,
      video_duration:
        aweme.video?.duration != null ? Math.round(aweme.video.duration / 1000) : null,
      owner_username: author.unique_id ?? null,
      owner_full_name: author.nickname ?? null,
      owner_follower_count: author.follower_count ?? null,
      owner_is_verified: Boolean(
        author.custom_verify || author.enterprise_verify_reason || author.verification_type,
      ),
      owner_profile_pic:
        this.ttPickFirstUrl(author.avatar_larger?.url_list) ??
        this.ttPickFirstUrl(author.avatar_medium?.url_list) ??
        null,
      owner_post_count: author.aweme_count ?? null,
      audio_name: music.title ?? null,
      audio_artist: music.author ?? null,
      is_original_audio: Boolean(music.is_original || music.is_original_sound),
      is_paid_partnership: Boolean(aweme.branded_content_accounts ?? aweme.is_ads),
      tagged_users: tagged,
      has_audio: Boolean(music.title || music.author),
    }
  }

  protected ttPlainTextFromVtt(vtt: string): string {
    if (!vtt) return ''
    const lines = vtt.split(/\r?\n/)
    const out: string[] = []
    let buffer: string[] = []
    const flush = () => {
      if (buffer.length === 0) return
      const block = buffer.join(' ').trim()
      if (block) out.push(block)
      buffer = []
    }
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) {
        flush()
        continue
      }
      if (/^WEBVTT/i.test(line)) continue
      if (/-->/.test(line)) continue
      if (/^\d+$/.test(line)) continue
      buffer.push(line.replace(/<[^>]+>/g, '').trim())
    }
    flush()
    return out.join('\n\n').trim()
  }

  protected async fetchTtTranscript(
    postUrl: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const body = await this.run(
      userId,
      'tiktok_video_transcript',
      '/v1/tiktok/video/transcript',
      { url: postUrl },
      orgId,
    )
    const data = (body as Record<string, unknown>)?.data ?? body
    if (typeof data === 'string') {
      const text = this.ttPlainTextFromVtt(data)
      return text || null
    }
    const unwrapped = unwrapUpstreamPayload(data)
    if (typeof unwrapped === 'string') {
      const text = this.ttPlainTextFromVtt(unwrapped)
      return text || null
    }
    if (unwrapped && typeof unwrapped === 'object') {
      const obj = unwrapped as Record<string, unknown>
      const candidate =
        (typeof obj.transcript === 'string' && obj.transcript) ||
        (typeof obj.text === 'string' && obj.text) ||
        (typeof obj.vtt === 'string' && obj.vtt) ||
        null
      if (candidate) {
        const text = this.ttPlainTextFromVtt(candidate)
        return text || null
      }
    }
    return null
  }
}
