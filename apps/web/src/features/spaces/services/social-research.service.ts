/**
 * Social research: thin API client for tracked accounts (add/sync/remove),
 * post analysis, and account search. Topic search lives in
 * topic-search.service.ts; breakdown/comments in post-enrichment.service.ts;
 * shared primitives in social-research.shared.ts — all re-exported below so
 * existing imports keep working.
 */
import {
  backendDelete,
  backendGet,
  backendPost,
  type BackendFetchOptions,
} from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { SpaceItem } from '../types'
import { type SocialPlatform, type SocialTrackedAccount } from '../types/space-schema'
import { SOCIAL_VIEW_TYPE_BY_PLATFORM, socialApiPath } from './social-research.shared'
import { isTopicPreviewItemId } from './topic-search.service'

export * from './social-research.shared'
export * from './topic-search.service'
export * from './post-enrichment.service'

export interface SocialRichPostInfo {
  caption: string | null
  like_count: number | null
  comment_count: number | null
  play_count: number | null
  video_duration: number | null
  owner_username: string | null
  owner_full_name: string | null
  owner_follower_count: number | null
  owner_is_verified: boolean
  owner_profile_pic: string | null
  owner_post_count: number | null
  audio_name: string | null
  audio_artist: string | null
  is_original_audio: boolean
  is_paid_partnership: boolean
  tagged_users: string[]
  has_audio: boolean
  retweet_count?: number | null
  quote_count?: number | null
  bookmark_count?: number | null
  post_lang?: string | null
  post_source?: string | null
  hashtag_names?: string[]
  mention_handles?: string[]
  link_urls?: string[]
  post_description?: string | null
  post_genre?: string | null
  keyword_names?: string[]
  transcript_language?: string | null
}

export interface SocialAccountSearchResult {
  username: string
  full_name: string
  profile_pic_url: string | null
  is_verified: boolean
  pk: string
}

export function getSocialItemsForView(
  items: Array<{ custom_data: Record<string, unknown> }>,
  platform: SocialPlatform,
): Array<{ custom_data: Record<string, unknown> }> {
  const target = SOCIAL_VIEW_TYPE_BY_PLATFORM[platform]
  return items.filter((item) => item.custom_data?._view_type === target)
}

export async function addTrackedSocialAccount(
  platform: SocialPlatform,
  spaceId: string,
  handle: string,
  backend?: BackendFetchOptions,
): Promise<{ account: SocialTrackedAccount; itemCount: number }> {
  const res = await backendPost<{
    success: boolean
    account: SocialTrackedAccount
    item_count: number
  }>(socialApiPath(spaceId, platform, '/accounts'), { handle }, { ...backend, resilient: true })
  return { account: res.account, itemCount: res.item_count }
}

export async function syncTrackedSocialAccount(
  platform: SocialPlatform,
  spaceId: string,
  handle: string,
  backend?: BackendFetchOptions,
): Promise<{
  itemCount: number
  lastSyncedAt: string
  accountPatch?: Partial<SocialTrackedAccount>
}> {
  const encoded = encodeURIComponent(handle)
  const res = await backendPost<{
    success: boolean
    item_count: number
    last_synced_at: string
    account_patch?: Partial<SocialTrackedAccount>
  }>(
    socialApiPath(spaceId, platform, `/accounts/${encoded}/sync`),
    {},
    { ...backend, resilient: true },
  )
  return {
    itemCount: res.item_count,
    lastSyncedAt: res.last_synced_at,
    accountPatch: res.account_patch,
  }
}

export async function removeTrackedSocialAccountItems(
  platform: SocialPlatform,
  spaceId: string,
  handle: string,
  backend?: BackendFetchOptions,
): Promise<number> {
  const encoded = encodeURIComponent(handle)
  const res = await backendDelete<{ success: boolean; deleted_count: number }>(
    socialApiPath(spaceId, platform, `/accounts/${encoded}`),
    undefined,
    backend,
  )
  return res.deleted_count
}

export async function analyzeSocialPost(
  platform: SocialPlatform,
  spaceId: string,
  itemId: string,
  shortcodeOrId: string,
  ctx: { handle?: string; isSlideshow?: boolean } = {},
): Promise<{ postInfo: SocialRichPostInfo; transcript: string | null; hook: string | null }> {
  const res = await backendPost<{
    success: boolean
    post_info: SocialRichPostInfo
    transcript: string | null
    hook: string | null
  }>(
    socialApiPath(spaceId, platform, `/items/${itemId}/analyze`),
    {
      shortcode_or_id: shortcodeOrId,
      handle: ctx.handle,
      is_slideshow: ctx.isSlideshow,
    },
    { resilient: true },
  )
  return {
    postInfo: res.post_info,
    transcript: res.transcript,
    hook: res.hook,
  }
}

export function extractHook(transcript: string): string {
  const sentences = transcript.match(/[^.!?]+[.!?]+/g)
  if (!sentences || sentences.length === 0) {
    const words = transcript.split(/\s+/)
    return words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '')
  }
  return sentences.slice(0, 3).join('').trim()
}

export function resolveTranscriptHookFromCustomData(customData: Record<string, unknown>): {
  transcript: string | null
  hook: string | null
} {
  const transcript =
    typeof customData.transcript === 'string' && customData.transcript.trim()
      ? customData.transcript.trim()
      : null
  const hook =
    typeof customData.hook === 'string' && customData.hook.trim()
      ? customData.hook.trim()
      : transcript
        ? extractHook(transcript)
        : null
  return { transcript, hook }
}

export function buildPostInfoCustomDataPatch(
  info: SocialRichPostInfo,
  extras?: { transcript?: string | null; hook?: string | null },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (info.caption) patch.caption = info.caption
  if (info.like_count != null) patch.like_count = info.like_count
  if (info.comment_count != null) patch.comment_count = info.comment_count
  if (info.play_count != null) patch.play_count = info.play_count
  if (info.video_duration != null) patch.video_duration = info.video_duration
  if (info.owner_username) patch.owner_username = info.owner_username
  if (info.owner_full_name) patch.owner_full_name = info.owner_full_name
  if (info.owner_follower_count != null) patch.owner_follower_count = info.owner_follower_count
  if (info.owner_is_verified) patch.owner_is_verified = info.owner_is_verified
  if (info.owner_profile_pic) patch.owner_profile_pic = info.owner_profile_pic
  if (info.owner_post_count != null) patch.owner_post_count = info.owner_post_count
  if (info.audio_name) patch.audio_name = info.audio_name
  if (info.audio_artist) patch.audio_artist = info.audio_artist
  if (info.is_original_audio) patch.is_original_audio = info.is_original_audio
  if (info.is_paid_partnership) patch.is_paid_partnership = info.is_paid_partnership
  if (info.tagged_users.length > 0) patch.tagged_users = info.tagged_users
  if (info.has_audio) patch.has_audio = info.has_audio
  if (info.retweet_count != null) patch.retweet_count = info.retweet_count
  if (info.quote_count != null) patch.quote_count = info.quote_count
  if (info.bookmark_count != null) patch.bookmark_count = info.bookmark_count
  if (info.post_lang) patch.post_lang = info.post_lang
  if (info.post_source) patch.post_source = info.post_source
  if (info.hashtag_names && info.hashtag_names.length > 0) patch.hashtag_names = info.hashtag_names
  if (info.mention_handles && info.mention_handles.length > 0) {
    patch.mention_handles = info.mention_handles
  }
  if (info.link_urls && info.link_urls.length > 0) patch.link_urls = info.link_urls
  if (info.post_description) patch.post_description = info.post_description
  if (info.post_genre) patch.post_genre = info.post_genre
  if (info.keyword_names && info.keyword_names.length > 0) patch.keyword_names = info.keyword_names
  if (info.transcript_language) patch.transcript_language = info.transcript_language
  if (extras?.transcript) patch.transcript = extras.transcript
  if (extras?.hook) patch.hook = extras.hook
  patch.analyzed_at = new Date().toISOString()
  return patch
}

export function applyAnalyzeResultToSpaceItem(
  item: SpaceItem,
  result: { postInfo: SocialRichPostInfo; transcript: string | null; hook: string | null },
): SpaceItem {
  const prev = (item.custom_data ?? {}) as Record<string, unknown>
  const hook = result.hook ?? (result.transcript ? extractHook(result.transcript) : null)
  return {
    ...item,
    custom_data: {
      ...prev,
      ...buildPostInfoCustomDataPatch(result.postInfo, {
        transcript: result.transcript,
        hook,
      }),
    },
  }
}

export async function runInlineIgResearchAnalyze(params: {
  platform: SocialPlatform
  spaceId: string
  item: SpaceItem
  shortcode: string
  handle?: string
  isSlideshow?: boolean
  resolvePersistedItemId?: () => Promise<string | null>
}): Promise<SpaceItem> {
  let targetItemId = params.item.id
  if (isTopicPreviewItemId(targetItemId)) {
    const persisted = await params.resolvePersistedItemId?.()
    if (!persisted) throw new Error('Failed to persist preview before analyze')
    targetItemId = persisted
  }
  const result = await analyzeSocialPost(
    params.platform,
    params.spaceId,
    targetItemId,
    params.shortcode,
    { handle: params.handle, isSlideshow: params.isSlideshow },
  )
  return applyAnalyzeResultToSpaceItem({ ...params.item, id: targetItemId }, result)
}

export async function getConnectedSocialHandle(platform: SocialPlatform): Promise<string | null> {
  try {
    // One overview fetch serves all four platform lookups and survives the
    // keyed view remount on research-view switches.
    const res = await cachedFetch(
      'integrations-overview',
      () =>
        backendGet<{
          integrations?: Array<{
            integration_id: string
            status: string
            metadata?: Record<string, unknown>
          }>
        }>('/api/integrations/overview'),
      { ttlMs: 60_000 },
    )
    const integration = res?.integrations?.find(
      (i) => i.integration_id === platform && i.status === 'connected',
    )
    if (!integration) return null
    const m = integration.metadata ?? {}
    if (platform === 'tiktok') {
      return (
        (m.tiktok_handle as string) ??
        (m.username as string) ??
        (m.handle as string) ??
        (m.unique_id as string) ??
        null
      )
    }
    if (platform === 'youtube') {
      return (
        (m.youtube_handle as string) ??
        (m.channel_handle as string) ??
        (m.custom_url as string) ??
        (m.username as string) ??
        (m.handle as string) ??
        null
      )
    }
    if (platform === 'twitter') {
      return (
        (m.twitter_handle as string) ??
        (m.screen_name as string) ??
        (m.username as string) ??
        (m.handle as string) ??
        null
      )
    }
    return (m.instagram_handle as string) ?? (m.username as string) ?? (m.handle as string) ?? null
  } catch {
    return null
  }
}

export async function isSocialPlatformConnected(platform: SocialPlatform): Promise<boolean> {
  try {
    const res = await backendGet<{ success: boolean; connected: boolean }>(
      `/api/integrations/status/${platform}`,
    )
    return res?.connected === true
  } catch {
    return false
  }
}

export function parseSocialHandle(platform: SocialPlatform, input: string): string {
  let val = input.trim()
  try {
    const url = new URL(val.startsWith('http') ? val : `https://${val}`)
    const host = url.hostname.replace('www.', '').toLowerCase()
    if (platform === 'instagram' && host === 'instagram.com') {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length > 0) return segments[0]!
    }
    if (platform === 'tiktok' && host === 'tiktok.com') {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length > 0) return segments[0]!.replace(/^@/, '')
    }
    if (platform === 'youtube' && (host === 'youtube.com' || host === 'm.youtube.com')) {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length === 0) return val.replace(/^@/, '').split('/')[0]!.trim()
      if (segments[0]!.startsWith('@')) return segments[0]!.replace(/^@/, '')
      if (segments[0] === 'channel' && segments[1]) return segments[1]!
      if (segments[0] === 'c' && segments[1]) return segments[1]!
      if (segments[0] === 'user' && segments[1]) return segments[1]!
    }
    if (
      platform === 'twitter' &&
      (host === 'x.com' ||
        host === 'twitter.com' ||
        host === 'www.x.com' ||
        host === 'www.twitter.com' ||
        host === 'mobile.twitter.com')
    ) {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length === 0) return val.replace(/^@/, '').split('/')[0]!.trim()
      return segments[0]!.replace(/^@/, '')
    }
  } catch {
    // not a URL
  }
  val = val.replace(/^@/, '')
  return val.split('/')[0]!.trim()
}

export async function searchSocialAccounts(
  platform: SocialPlatform,
  query: string,
): Promise<SocialAccountSearchResult[]> {
  if (platform === 'tiktok') return ttSearchAccounts(query)
  if (platform === 'youtube') return ytSearchAccounts(query)
  if (platform === 'twitter') return xSearchAccounts(query)
  return igSearchAccounts(query)
}

interface ThreadsSearchResponse {
  success: boolean
  data?: {
    users?: Array<{
      username?: string
      full_name?: string
      profile_pic_url?: string
      is_verified?: boolean
      pk?: string
      id?: string
    }>
  }
  users?: Array<{
    username?: string
    full_name?: string
    profile_pic_url?: string
    is_verified?: boolean
    pk?: string
    id?: string
  }>
}

async function igSearchAccounts(query: string): Promise<SocialAccountSearchResult[]> {
  const res = await backendGet<ThreadsSearchResponse>(
    `/api/integrations/scrapecreators/threads/search/users?query=${encodeURIComponent(query)}`,
  )
  const users = res?.data?.users ?? res?.users ?? []
  const fromThreads = users
    .filter((u) => u.username)
    .map((u) => ({
      username: u.username!,
      full_name: u.full_name ?? '',
      profile_pic_url: u.profile_pic_url ?? null,
      is_verified: u.is_verified ?? false,
      pk: u.pk ?? u.id ?? '',
    }))

  if (fromThreads.length > 0) return fromThreads

  const handleGuess = parseSocialHandle('instagram', query).toLowerCase()
  if (handleGuess.length < 3 || !/^[a-zA-Z0-9._]+$/.test(handleGuess)) return fromThreads

  try {
    const profileRes = await backendGet<{
      data?: { user?: { id?: string; profile_pic_url?: string; full_name?: string } }
    }>(
      `/api/integrations/scrapecreators/instagram/profile?handle=${encodeURIComponent(handleGuess)}`,
    )
    const user = profileRes?.data?.user
    const hit = Boolean(user?.id || user?.profile_pic_url)
    if (!hit) return fromThreads
    return [
      {
        username: handleGuess,
        full_name: user?.full_name ?? '',
        profile_pic_url: user?.profile_pic_url ?? null,
        is_verified: false,
        pk: user?.id ?? '',
      },
    ]
  } catch {
    return fromThreads
  }
}

interface TtSearchUsersResponse {
  data?: {
    user_list?: Array<{
      user_info?: {
        unique_id?: string
        nickname?: string
        avatar_thumb?: { url_list?: string[] }
        avatar_medium?: { url_list?: string[] }
        sec_uid?: string
        uid?: string
        custom_verify?: string
        verification_type?: number
      }
    }>
  }
}

function ttPickFirstUrl(urls: string[] | undefined): string | null {
  return urls?.[0] ?? null
}

async function ttSearchAccounts(query: string): Promise<SocialAccountSearchResult[]> {
  try {
    const res = await backendGet<TtSearchUsersResponse>(
      `/api/integrations/scrapecreators/tiktok/search/users?query=${encodeURIComponent(query)}`,
    )
    const list = res?.data?.user_list ?? []
    const mapped = list
      .map((row) => row.user_info)
      .filter((info): info is NonNullable<typeof info> => Boolean(info?.unique_id))
      .map((info) => ({
        username: info.unique_id!,
        full_name: info.nickname ?? '',
        profile_pic_url:
          ttPickFirstUrl(info.avatar_medium?.url_list) ??
          ttPickFirstUrl(info.avatar_thumb?.url_list) ??
          null,
        is_verified: Boolean(info.custom_verify || info.verification_type),
        pk: info.sec_uid ?? String(info.uid ?? ''),
      }))
    if (mapped.length > 0) return mapped
  } catch {
    // fall through
  }

  const guess = parseSocialHandle('tiktok', query).toLowerCase()
  if (guess.length < 2) return []
  try {
    const profileRes = await backendGet<{
      data?: {
        user?: {
          sec_uid?: string
          uid?: string | number
          nickname?: string
          avatar_thumb?: { url_list?: string[] }
        }
      }
    }>(`/api/integrations/scrapecreators/tiktok/profile?handle=${encodeURIComponent(guess)}`)
    const user = profileRes?.data?.user
    if (!user?.sec_uid && !user?.uid) return []
    return [
      {
        username: guess,
        full_name: user.nickname ?? '',
        profile_pic_url: ttPickFirstUrl(user.avatar_thumb?.url_list),
        is_verified: false,
        pk: user.sec_uid ?? String(user.uid ?? ''),
      },
    ]
  } catch {
    return []
  }
}

interface YtSearchChannel {
  type?: string
  id?: string
  channelId?: string
  handle?: string
  channel?: string
  title?: string
  name?: string
  thumbnail?: string
  avatar?: { image?: { sources?: Array<{ url?: string; width?: number }> } }
}

interface YtSearchResponse {
  data?: {
    channels?: YtSearchChannel[]
  }
  channels?: YtSearchChannel[]
}

interface YtChannelResponse {
  channelId?: string
  channel?: string
  name?: string
  avatar?: { image?: { sources?: Array<{ url?: string; width?: number }> } }
}

function ytBestAvatarUrl(channel: Pick<YtSearchChannel, 'thumbnail' | 'avatar'>): string | null {
  if (channel.thumbnail) return channel.thumbnail
  const sources = channel.avatar?.image?.sources ?? []
  if (sources.length === 0) return null
  const sorted = [...sources].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return sorted[0]?.url ?? null
}

function ytChannelUsername(ch: YtSearchChannel): string {
  const rawHandle = ch.handle ?? ch.channel ?? ''
  if (rawHandle.startsWith('channel/')) {
    return ch.channelId ?? ch.id ?? rawHandle.replace('channel/', '')
  }
  if (rawHandle.startsWith('@')) return rawHandle.slice(1)
  if (rawHandle) return rawHandle
  return ch.channelId ?? ch.id ?? ''
}

function ytChannelUrlFromHandle(handle: string): string {
  const normalized = handle.replace(/^@/, '')
  if (normalized.startsWith('UC')) return `https://www.youtube.com/channel/${normalized}`
  return `https://www.youtube.com/@${normalized}`
}

async function ytSearchAccounts(query: string): Promise<SocialAccountSearchResult[]> {
  try {
    const res = await backendGet<YtSearchResponse>(
      `/api/integrations/scrapecreators/youtube/search?query=${encodeURIComponent(query)}&limit=10&type=channels`,
    )
    const channels = res?.data?.channels ?? res?.channels ?? []
    const mapped = channels
      .map((ch) => {
        const username = ytChannelUsername(ch)
        if (!username) return null
        return {
          username,
          full_name: ch.title ?? ch.name ?? '',
          profile_pic_url: ytBestAvatarUrl(ch),
          is_verified: false,
          pk: ch.channelId ?? ch.id ?? '',
        }
      })
      .filter((row): row is SocialAccountSearchResult => Boolean(row?.username))
    if (mapped.length > 0) return mapped
  } catch {
    // fall through
  }

  const guess = parseSocialHandle('youtube', query)
  if (guess.length < 2) return []
  try {
    const profileRes = await backendGet<{ data?: YtChannelResponse } & YtChannelResponse>(
      `/api/integrations/scrapecreators/youtube/channel?url=${encodeURIComponent(ytChannelUrlFromHandle(guess))}`,
    )
    const channel = profileRes?.data ?? profileRes
    if (!channel?.channelId && !channel?.name && !channel?.channel) return []
    const username = channel.channel?.replace(/^@/, '') ?? guess.replace(/^@/, '')
    return [
      {
        username,
        full_name: channel.name ?? '',
        profile_pic_url: ytBestAvatarUrl(channel),
        is_verified: false,
        pk: channel.channelId ?? '',
      },
    ]
  } catch {
    return []
  }
}

interface TwitterProfileResponse {
  id_str?: string
  screen_name?: string
  name?: string
  profile_image_url_https?: string
}

async function xSearchAccounts(query: string): Promise<SocialAccountSearchResult[]> {
  const guess = parseSocialHandle('twitter', query)
  if (guess.length < 2) return []
  try {
    const profileRes = await backendGet<{ data?: TwitterProfileResponse } & TwitterProfileResponse>(
      `/api/integrations/scrapecreators/twitter/profile?handle=${encodeURIComponent(guess)}`,
    )
    const profile = profileRes?.data ?? profileRes
    if (!profile?.screen_name && !profile?.name) return []
    return [
      {
        username: profile.screen_name ?? guess,
        full_name: profile.name ?? '',
        profile_pic_url: profile.profile_image_url_https ?? null,
        is_verified: false,
        pk: profile.id_str ?? '',
      },
    ]
  } catch {
    return []
  }
}
