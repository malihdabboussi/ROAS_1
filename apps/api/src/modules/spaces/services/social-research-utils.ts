import type {
  CachedSocialImageResult,
  SocialContentItem,
  SocialResearchAutomationItem,
  SocialResearchPlatform,
  SocialResearchPlatformSelector,
  SocialResearchViewType,
  SocialRichPostInfo,
} from '../types/social-research.types'

export const SOCIAL_VIEW_TYPE_BY_PLATFORM: Record<SocialResearchPlatform, SocialResearchViewType> =
  {
    instagram: 'instagram_research',
    tiktok: 'tiktok_research',
    youtube: 'youtube_research',
    twitter: 'twitter_research',
  }

export const VIEW_TYPE_TO_SOCIAL_PLATFORM: Record<SocialResearchViewType, SocialResearchPlatform> =
  {
    instagram_research: 'instagram',
    tiktok_research: 'tiktok',
    youtube_research: 'youtube',
    twitter_research: 'twitter',
  }

export const REELS_WINDOW_DAYS = 30

export function socialResearchViewTypeForPlatform(
  platform: SocialResearchPlatform,
): SocialResearchViewType {
  return SOCIAL_VIEW_TYPE_BY_PLATFORM[platform]
}

export function socialResearchConfigKeyForPlatform(
  platform: SocialResearchPlatform,
):
  | 'ig_research_config'
  | 'tiktok_research_config'
  | 'youtube_research_config'
  | 'twitter_research_config' {
  if (platform === 'tiktok') return 'tiktok_research_config'
  if (platform === 'youtube') return 'youtube_research_config'
  if (platform === 'twitter') return 'twitter_research_config'
  return 'ig_research_config'
}

export type SocialResearchSpaceViewRow = {
  id?: string
  type?: string
  ig_research_config?: { tracked_accounts?: unknown[] }
  tiktok_research_config?: { tracked_accounts?: unknown[] }
  youtube_research_config?: { tracked_accounts?: unknown[] }
  twitter_research_config?: { tracked_accounts?: unknown[] }
}

export function socialResearchViewsFromSchema(
  schema: unknown,
  platforms: SocialResearchPlatform[],
): Array<{ view: SocialResearchSpaceViewRow; platform: SocialResearchPlatform }> {
  const views =
    schema &&
    typeof schema === 'object' &&
    !Array.isArray(schema) &&
    Array.isArray((schema as { views?: unknown }).views)
      ? ((schema as { views: SocialResearchSpaceViewRow[] }).views ?? [])
      : []
  const platformSet = new Set(platforms)
  const out: Array<{ view: SocialResearchSpaceViewRow; platform: SocialResearchPlatform }> = []
  for (const view of views) {
    if (view.type === 'instagram_research' && platformSet.has('instagram')) {
      out.push({ view, platform: 'instagram' })
    }
    if (view.type === 'tiktok_research' && platformSet.has('tiktok')) {
      out.push({ view, platform: 'tiktok' })
    }
    if (view.type === 'youtube_research' && platformSet.has('youtube')) {
      out.push({ view, platform: 'youtube' })
    }
    if (view.type === 'twitter_research' && platformSet.has('twitter')) {
      out.push({ view, platform: 'twitter' })
    }
  }
  return out
}

export function socialResearchSourceType(
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

export function platformsForSelector(
  selector: SocialResearchPlatformSelector,
): SocialResearchPlatform[] {
  if (selector === 'both') return ['instagram', 'tiktok']
  if (selector === 'all') return ['instagram', 'tiktok', 'youtube', 'twitter']
  return [selector]
}

export function medianPlayCount(items: Array<{ play_count: number }>): number {
  if (items.length === 0) return 0
  const counts = items.map((i) => i.play_count).sort((a, b) => a - b)
  const mid = Math.floor(counts.length / 2)
  return counts.length % 2 === 0 ? (counts[mid - 1]! + counts[mid]!) / 2 : counts[mid]!
}

export function computeOutlierScores<T extends { play_count: number }>(
  items: T[],
): (T & { outlier_score: number })[] {
  if (items.length === 0) return []
  const median = medianPlayCount(items)
  if (median === 0) return items.map((i) => ({ ...i, outlier_score: 0 }))
  return items.map((i) => ({
    ...i,
    outlier_score: Math.round((i.play_count / median) * 100) / 100,
  }))
}

export function extractHook(transcript: string): string {
  const sentences = transcript.match(/[^.!?]+[.!?]+/g)
  if (!sentences || sentences.length === 0) {
    const words = transcript.split(/\s+/)
    return words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '')
  }
  return sentences.slice(0, 3).join('').trim()
}

export function parseSocialHandle(platform: SocialResearchPlatform, input: string): string {
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

export function socialPostUrlFromShortcode(
  platform: SocialResearchPlatform,
  shortcode: string,
  ctx: { handle?: string; isSlideshow?: boolean; mediaType?: string } = {},
): string {
  if (platform === 'tiktok') {
    const segment = ctx.isSlideshow ? 'photo' : 'video'
    const h = ctx.handle ?? ''
    return `https://www.tiktok.com/@${h}/${segment}/${shortcode}`
  }
  if (platform === 'youtube') {
    if (ctx.isSlideshow) return `https://www.youtube.com/shorts/${shortcode}`
    return `https://www.youtube.com/watch?v=${shortcode}`
  }
  if (platform === 'twitter') {
    return `https://x.com/${ctx.handle ?? 'i'}/status/${shortcode}`
  }
  if (ctx.mediaType && ctx.mediaType !== 'reel') {
    return `https://www.instagram.com/p/${shortcode}/`
  }
  return `https://www.instagram.com/reel/${shortcode}/`
}

export function socialPostUrlForContent(
  platform: SocialResearchPlatform,
  handle: string,
  shortcode: string,
  mediaType: string,
): string {
  return socialPostUrlFromShortcode(platform, shortcode, {
    handle,
    isSlideshow: mediaType === 'slideshow' || mediaType === 'youtube_short',
    mediaType,
  })
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

export function formatSocialResearchDigest(items: SocialResearchAutomationItem[]): string {
  if (items.length === 0) return 'No social research outliers matched the filters.'
  const lines: string[] = ['Top social research outliers:', '']
  items.forEach((item, index) => {
    const score = item.outlier_score.toFixed(1)
    const views = formatViewCount(item.play_count)
    lines.push(
      `${index + 1}. @${item.handle} (${item.platform}) — ${score}x outlier — ${views} views`,
    )
    if (item.caption) lines.push(`Caption: ${item.caption}`)
    if (item.hook) lines.push(`Hook: ${item.hook}`)
    if (item.transcript) lines.push(`Transcript: ${item.transcript}`)
    if (item.url) lines.push(`URL: ${item.url}`)
    lines.push('')
  })
  return lines.join('\n').trim()
}

export function unwrapUpstreamPayload(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const o = body as Record<string, unknown>
  if ('data' in o && o.data !== undefined) return o.data
  return body
}

export function mediaIdFromCustomData(cd: Record<string, unknown>): string | undefined {
  const id = cd.media_id ?? cd.ig_media_id ?? cd.aweme_id ?? cd.video_id ?? cd.tweet_id
  return typeof id === 'string' && id ? id : undefined
}

export function socialImageCacheKey(
  platform: SocialResearchPlatform,
  handle: string,
  id: string,
  kind: 'thumbnail' | 'profile',
): string {
  const prefix =
    platform === 'tiktok'
      ? 'tt'
      : platform === 'youtube'
        ? 'yt'
        : platform === 'twitter'
          ? 'x'
          : 'ig'
  return `${prefix}/${handle.toLowerCase()}/${id}/${kind}`
}

export function thumbnailCachePatch(
  sourceUrl: string | null,
  cacheResult: CachedSocialImageResult | undefined,
): Record<string, unknown> {
  if (!sourceUrl) return { thumbnail_url: null }
  if (cacheResult?.ok) {
    return {
      thumbnail_url: cacheResult.url ?? null,
      thumbnail_source_url: sourceUrl,
      thumbnail_asset_id: cacheResult.assetId,
      thumbnail_storage_path: cacheResult.filePath,
      thumbnail_cached_at: cacheResult.cachedAt,
      thumbnail_cache_status: 'ready',
      thumbnail_cache_error: null,
    }
  }
  return {
    thumbnail_url: null,
    thumbnail_source_url: sourceUrl,
    thumbnail_cache_status: 'failed',
    thumbnail_cache_error: cacheResult?.error ?? 'Image cache failed',
  }
}

export function profilePicCachePatch(
  sourceUrl: string | null,
  cacheResult: CachedSocialImageResult | undefined,
): Record<string, unknown> {
  if (!sourceUrl) return {}
  if (cacheResult?.ok) {
    return {
      profile_pic_url: cacheResult.url,
      profile_pic_source_url: sourceUrl,
      profile_pic_asset_id: cacheResult.assetId,
      profile_pic_storage_path: cacheResult.filePath,
      profile_pic_cached_at: cacheResult.cachedAt,
      profile_pic_cache_status: 'ready',
    }
  }
  return {
    profile_pic_source_url: sourceUrl,
    profile_pic_cache_status: 'failed',
    profile_pic_cache_error: cacheResult?.error ?? 'Image cache failed',
  }
}

export function socialContentCustomData(
  platform: SocialResearchPlatform,
  handle: string,
  item: SocialContentItem,
  cacheResult: CachedSocialImageResult | undefined,
): Record<string, unknown> {
  const baseFields = {
    _view_type: SOCIAL_VIEW_TYPE_BY_PLATFORM[platform],
    _platform: platform,
    _handle: handle,
    media_id: item.media_id,
    shortcode: item.shortcode,
    media_type: item.media_type,
    post_url: socialPostUrlForContent(platform, handle, item.shortcode, item.media_type),
    play_count: item.play_count,
    like_count: item.like_count,
    comment_count: item.comment_count,
    ...thumbnailCachePatch(item.thumbnail_url, cacheResult),
    video_url: item.video_url,
    taken_at: item.taken_at,
    outlier_score: item.outlier_score,
    caption: item.caption,
    transcript: null,
  }
  if (platform === 'instagram') {
    return { ...baseFields, ig_media_id: item.media_id }
  }
  if (platform === 'youtube') {
    return { ...baseFields, video_id: item.media_id }
  }
  if (platform === 'twitter') {
    return { ...baseFields, tweet_id: item.media_id }
  }
  return { ...baseFields, aweme_id: item.media_id }
}

export function buildPostInfoCustomDataPatch(
  info: SocialRichPostInfo,
  postUrl?: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (postUrl) patch.post_url = postUrl
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
  patch.analyzed_at = new Date().toISOString()
  return patch
}

export function mapRowToAutomationItem(row: {
  id: string
  custom_data?: Record<string, unknown> | null
}): SocialResearchAutomationItem | null {
  const cd = (row.custom_data ?? {}) as Record<string, unknown>
  const rawViewType = cd._view_type
  const viewType =
    rawViewType === 'instagram_research' ||
    rawViewType === 'tiktok_research' ||
    rawViewType === 'youtube_research' ||
    rawViewType === 'twitter_research'
      ? rawViewType
      : undefined
  if (!viewType) return null
  const rawPlatform = cd._platform
  const platform =
    rawPlatform === 'instagram' ||
    rawPlatform === 'tiktok' ||
    rawPlatform === 'youtube' ||
    rawPlatform === 'twitter'
      ? rawPlatform
      : VIEW_TYPE_TO_SOCIAL_PLATFORM[viewType]
  const handle = String(cd._handle ?? '')
  const mediaId = mediaIdFromCustomData(cd)
  if (!mediaId) return null
  const shortcode = String(cd.shortcode ?? mediaId)
  const transcript = typeof cd.transcript === 'string' ? cd.transcript : null
  const hook =
    typeof cd.hook === 'string' && cd.hook ? cd.hook : transcript ? extractHook(transcript) : null
  return {
    item_id: row.id,
    platform,
    view_type: viewType,
    handle,
    media_id: mediaId,
    shortcode,
    media_type: String(cd.media_type ?? 'reel'),
    taken_at: typeof cd.taken_at === 'string' ? cd.taken_at : null,
    play_count: Number(cd.play_count ?? 0),
    like_count: cd.like_count != null ? Number(cd.like_count) : null,
    comment_count: cd.comment_count != null ? Number(cd.comment_count) : null,
    outlier_score: Number(cd.outlier_score ?? 0),
    caption: typeof cd.caption === 'string' ? cd.caption : null,
    transcript,
    hook,
    url:
      typeof cd.post_url === 'string' && cd.post_url.trim()
        ? cd.post_url.trim()
        : socialPostUrlForContent(platform, handle, shortcode, String(cd.media_type ?? 'reel')),
  }
}
