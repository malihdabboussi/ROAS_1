import { createHash } from 'node:crypto'
import type { MediaAssetRow, SocialPlatform } from '../dto'
import { MediaServiceBase03 } from './media-service-03.base'

const REMOTE_MEDIA_IMPORT_MAX_BYTES = 50 * 1024 * 1024

export abstract class MediaServiceBase04 extends MediaServiceBase03 {

  protected isPrivateOrSpecialIp(address: string): boolean {
    const normalized = address.toLowerCase()
    if (normalized.includes(':')) {
      if (
        normalized === '::' ||
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
      ) {
        return true
      }
      const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
      return mapped ? this.isPrivateOrSpecialIp(mapped[1]!) : false
    }

    const parts = normalized.split('.').map((part) => Number(part))
    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return true
    }
    const [a, b, c] = parts as [number, number, number, number]
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 192 && b === 0) return true
    if (a === 198 && (b === 18 || b === 19)) return true
    if (a === 203 && b === 0 && c === 113) return true
    if (a >= 224) return true
    return false
  }

  protected normalizeRemoteMediaContentType(value: string | null): string | null {
    const type = value?.split(';')[0]?.trim().toLowerCase()
    return type || null
  }

  protected async readRemoteMediaBuffer(response: Response): Promise<Buffer> {
    const reader = response.body?.getReader()
    if (!reader) {
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length > REMOTE_MEDIA_IMPORT_MAX_BYTES) {
        throw new Error('Remote file is too large')
      }
      return buffer
    }

    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.length
      if (total > REMOTE_MEDIA_IMPORT_MAX_BYTES) {
        throw new Error('Remote file is too large')
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  }

  protected filenameFromRemoteMediaUrl(url: URL, mimeType: string): string {
    const pathname = decodeURIComponent(url.pathname)
    const last = pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, '_')
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last.slice(0, 255)

    const ext =
      mimeType === 'image/jpeg'
        ? 'jpg'
        : mimeType === 'image/png'
          ? 'png'
          : mimeType === 'image/gif'
            ? 'gif'
            : mimeType === 'image/webp'
              ? 'webp'
              : mimeType === 'video/mp4'
                ? 'mp4'
                : mimeType === 'video/webm'
                  ? 'webm'
                  : 'bin'
    return `media-from-url.${ext}`
  }

  protected parseAllowedSocialMediaUrl(platform: SocialPlatform, raw: string): URL | null {
    let parsed: URL
    try {
      parsed = new URL(raw)
    } catch {
      return null
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    const h = parsed.hostname.toLowerCase()
    if (platform === 'instagram') {
      const allowed =
        h === 'instagram.com' ||
        h.endsWith('.instagram.com') ||
        h.endsWith('.cdninstagram.com') ||
        h.endsWith('.fbcdn.net')
      return allowed ? parsed : null
    }
    if (platform === 'youtube') {
      const allowed =
        h === 'youtube.com' ||
        h.endsWith('.youtube.com') ||
        h === 'i.ytimg.com' ||
        h.endsWith('.ytimg.com') ||
        h === 'img.youtube.com' ||
        h === 'yt3.googleusercontent.com' ||
        h.endsWith('.googleusercontent.com') ||
        h.endsWith('.ggpht.com')
      return allowed ? parsed : null
    }
    if (platform === 'twitter') {
      const allowed =
        h === 'twitter.com' ||
        h.endsWith('.twitter.com') ||
        h === 'x.com' ||
        h.endsWith('.x.com') ||
        h === 'pbs.twimg.com' ||
        h === 'video.twimg.com' ||
        h === 'abs.twimg.com' ||
        h === 'ton.twimg.com' ||
        h.endsWith('.twimg.com')
      return allowed ? parsed : null
    }
    const allowed =
      h === 'tiktok.com' ||
      h.endsWith('.tiktok.com') ||
      h.endsWith('.tiktokcdn.com') ||
      h.endsWith('.tiktokcdn-us.com') ||
      h.endsWith('.tiktokcdn-eu.com') ||
      h.endsWith('.bytedance.com') ||
      h.endsWith('.bytedanceapi.com') ||
      h.endsWith('.byteoversea.com') ||
      h.endsWith('.muscdn.com')
    return allowed ? parsed : null
  }

  protected invalidSocialUrlError(platform: SocialPlatform): string {
    if (platform === 'instagram') return 'Invalid Instagram media URL'
    if (platform === 'youtube') return 'Invalid YouTube media URL'
    if (platform === 'twitter') return 'Invalid X media URL'
    return 'Invalid TikTok media URL'
  }

  protected socialMediaFetchHeaders(platform: SocialPlatform): Record<string, string> {
    const referer =
      platform === 'instagram'
        ? 'https://www.instagram.com/'
        : platform === 'youtube'
          ? 'https://www.youtube.com/'
          : platform === 'twitter'
            ? 'https://x.com/'
            : 'https://www.tiktok.com/'
    return {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: referer,
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    }
  }

  protected safeCacheKey(cacheKey: string, platform: SocialPlatform = 'instagram'): string {
    const normalized = cacheKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._/-]/g, '_')
    const compact = normalized
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '')
      .replace(/\//g, '__')
    const hash = createHash('sha256').update(cacheKey).digest('hex').slice(0, 16)
    const base = compact.slice(0, 120).replace(/^_+|_+$/g, '') || platform
    return `${base}-${hash}`
  }

  protected async findCachedSocialAsset(
    filePath: string,
    userId: string,
    orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    return this.mediaRepository.findCachedSocialAsset(filePath, userId, this.bucket, orgId)
  }

  protected async refreshAssetSignedUrl(asset: MediaAssetRow): Promise<string | null> {
    const signedUrl = await this.mediaRepository.createAssetSignedUrl(asset, 365 * 24 * 60 * 60)

    if (signedUrl && signedUrl !== asset.public_url) {
      await this.mediaRepository.updateAssetPublicUrl(asset.id, signedUrl)
    }

    return signedUrl
  }

  protected async getStorageObjectMetadata(
    bucketName: string,
    filePath: string,
  ): Promise<{ size: number | null } | null> {
    return this.mediaRepository.getStorageObjectMetadata(bucketName, filePath)
  }
}
