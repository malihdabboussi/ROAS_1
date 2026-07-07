/**
 * Same-origin image proxy + cached-thumbnail helpers shared by the
 * Instagram and TikTok research views. Both platforms block direct browser
 * embeds from their CDNs; routing through `/api/social-thumbnail` adds the
 * right Referer and cache-control headers.
 */
import type { SocialPlatform } from '../../types/space-schema'

function isInstagramCdnUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const h = url.hostname.toLowerCase()
    return (
      h === 'instagram.com' ||
      h.endsWith('.instagram.com') ||
      h.endsWith('.cdninstagram.com') ||
      h.endsWith('.fbcdn.net')
    )
  } catch {
    return false
  }
}

function isTiktokCdnUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const h = url.hostname.toLowerCase()
    return (
      h === 'tiktok.com' ||
      h.endsWith('.tiktok.com') ||
      h.endsWith('.tiktokcdn.com') ||
      h.endsWith('.tiktokcdn-us.com') ||
      h.endsWith('.tiktokcdn-eu.com') ||
      h.endsWith('.bytedance.com') ||
      h.endsWith('.bytedanceapi.com') ||
      h.endsWith('.byteoversea.com') ||
      h.endsWith('.muscdn.com')
    )
  } catch {
    return false
  }
}

function isYoutubeCdnUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const h = url.hostname.toLowerCase()
    return (
      h === 'youtube.com' ||
      h.endsWith('.youtube.com') ||
      h === 'i.ytimg.com' ||
      h.endsWith('.ytimg.com') ||
      h === 'img.youtube.com' ||
      h === 'yt3.googleusercontent.com' ||
      h.endsWith('.googleusercontent.com') ||
      h.endsWith('.ggpht.com')
    )
  } catch {
    return false
  }
}

function isTwitterCdnUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const h = url.hostname.toLowerCase()
    return (
      h === 'twitter.com' ||
      h.endsWith('.twitter.com') ||
      h === 'x.com' ||
      h.endsWith('.x.com') ||
      h === 'pbs.twimg.com' ||
      h === 'video.twimg.com' ||
      h === 'abs.twimg.com' ||
      h === 'ton.twimg.com' ||
      h.endsWith('.twimg.com')
    )
  } catch {
    return false
  }
}

function isCdnUrl(platform: SocialPlatform, raw: string): boolean {
  if (platform === 'tiktok') return isTiktokCdnUrl(raw)
  if (platform === 'youtube') return isYoutubeCdnUrl(raw)
  if (platform === 'twitter') return isTwitterCdnUrl(raw)
  return isInstagramCdnUrl(raw)
}

/**
 * Wrap a raw social-CDN URL with our same-origin proxy so the browser doesn't
 * try to fetch it directly (which the CDN typically rejects with 403).
 */
export function proxiedSocialMediaUrl(
  platform: SocialPlatform,
  originalUrl: string | null | undefined,
): string | null {
  if (originalUrl == null || originalUrl === '') return null
  return `/api/social-thumbnail?platform=${platform}&url=${encodeURIComponent(originalUrl)}`
}

/**
 * Returns a Supabase-cached thumbnail URL only when:
 *  - we have a `thumbnail_asset_id` (i.e. the cache write succeeded), AND
 *  - the stored `thumbnail_url` is not the raw CDN URL (those expire fast).
 */
export function cachedSocialThumbnailUrl(
  platform: SocialPlatform,
  customData: Record<string, unknown>,
): string | null {
  const url = customData.thumbnail_url
  if (typeof url !== 'string' || url.trim() === '') return null
  if (!customData.thumbnail_asset_id) return null
  if (isCdnUrl(platform, url)) return null
  return url
}

/** Durable cache → Supabase asset → proxied CDN URL (topic search / preview). */
export function resolveSocialThumbnailUrl(
  platform: SocialPlatform,
  customData: Record<string, unknown>,
): string | null {
  const durable = customData.thumbnail_cached_url
  if (typeof durable === 'string' && durable.trim() !== '') return durable

  const cached = cachedSocialThumbnailUrl(platform, customData)
  if (cached) return cached

  const raw = customData.thumbnail_url
  if (typeof raw !== 'string' || raw.trim() === '') return null
  return proxiedSocialMediaUrl(platform, raw)
}

export function cachedSocialProfileImageUrl<
  T extends { profile_pic_url?: string; profile_pic_asset_id?: string },
>(platform: SocialPlatform, account: T): string | null {
  const url = account.profile_pic_url
  if (!url || !account.profile_pic_asset_id) return null
  if (isCdnUrl(platform, url)) return null
  return url
}
