import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveApiService } from '../../integrations/google-drive/services/google-drive-api.service'
import { fetchGenericPreview } from '../lib/generic-og'
import { fetchOEmbed } from '../lib/oembed'
import { detectProvider, extractDriveFileId } from '../lib/url-providers'
import type { LinkPreview } from '../link-preview.types'
import { LinkPreviewRepository } from '../repositories/link-preview.repository'

interface ResolveContext {
  supabase: SupabaseClient
  userId: string
  orgId: string | null
}

const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX = 500

interface CacheEntry {
  preview: LinkPreview
  expiresAt: number
}

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name)
  private readonly cache = new Map<string, CacheEntry>()

  constructor(
    private readonly drive: GoogleDriveApiService,
    private readonly linkPreviewRepository: LinkPreviewRepository,
  ) {}

  async resolveMany(urls: string[], ctx: ResolveContext): Promise<LinkPreview[]> {
    if (!urls.length) return []
    const unique = Array.from(new Set(urls)).slice(0, 5)
    const results = await Promise.all(unique.map((u) => this.resolveOne(u, ctx)))
    return results.filter((p): p is LinkPreview => p !== null)
  }

  private async resolveOne(url: string, ctx: ResolveContext): Promise<LinkPreview | null> {
    const cached = this.getCached(url)
    if (cached) return cached
    const provider = detectProvider(url)
    const canUseSharedCache = provider !== 'drive' && provider !== 'internal'
    const dbCached = canUseSharedCache ? await this.getDbCached(url, ctx.supabase) : null
    if (dbCached) {
      this.setCached(url, dbCached)
      return dbCached
    }

    let preview: LinkPreview | null = null

    try {
      if (provider === 'drive') {
        preview = await this.resolveDrive(url, ctx)
      } else if (
        provider === 'youtube' ||
        provider === 'loom' ||
        provider === 'vimeo' ||
        provider === 'figma'
      ) {
        preview = await fetchOEmbed(provider, url)
      } else if (provider === 'internal') {
        preview = this.resolveInternal(url)
      } else if (provider === 'generic') {
        preview = await fetchGenericPreview(url)
      }
    } catch (err) {
      this.logger.warn(`Link preview resolve failed for ${url}: ${err}`)
      preview = null
    }

    if (preview) this.setCached(url, preview)
    if (preview && canUseSharedCache) await this.setDbCached(url, preview, ctx.supabase)
    return preview
  }

  private async resolveDrive(url: string, ctx: ResolveContext): Promise<LinkPreview | null> {
    const fileId = extractDriveFileId(url)
    if (!fileId) return null
    try {
      const file = await this.drive.getFile(ctx.supabase, ctx.userId, fileId, ctx.orgId)
      return {
        url,
        provider: 'drive',
        title: file.name ?? null,
        description: file.mimeType ?? null,
        imageUrl: file.thumbnailLink ?? null,
        iconUrl: file.iconLink ?? null,
        siteName: 'Google Drive',
        driveFileId: fileId,
        mimeType: file.mimeType ?? undefined,
      }
    } catch {
      return {
        url,
        provider: 'drive',
        title: 'Google Drive file',
        description: null,
        imageUrl: null,
        iconUrl: null,
        siteName: 'Google Drive',
        driveFileId: fileId,
      }
    }
  }

  private resolveInternal(url: string): LinkPreview | null {
    try {
      const u = new URL(url)
      const segs = u.pathname.split('/').filter(Boolean)
      const [first, second, third] = segs
      let entityKind: string | null = null
      let entityId: string | null = null
      if (first === 'spaces' && second) {
        entityKind = third ? 'space-item' : 'space'
        entityId = third ?? second
      } else if (first === 'missions' && second) {
        entityKind = 'mission'
        entityId = second
      } else if (first === 'channels' && second) {
        entityKind = 'channel'
        entityId = second
      }
      if (!entityKind || !entityId) return null
      return {
        url,
        provider: 'internal',
        title: null,
        description: null,
        imageUrl: null,
        iconUrl: null,
        siteName: 'Vibey',
        entityKind,
        entityId,
      }
    } catch {
      return null
    }
  }

  private getCached(url: string): LinkPreview | null {
    const entry = this.cache.get(url)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(url)
      return null
    }
    return entry.preview
  }

  private setCached(url: string, preview: LinkPreview): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest) this.cache.delete(oldest)
    }
    this.cache.set(url, { preview, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  private cacheKey(url: string): string {
    return createHash('sha256').update(url).digest('hex')
  }

  private async getDbCached(url: string, supabase: SupabaseClient): Promise<LinkPreview | null> {
    try {
      const data = await this.linkPreviewRepository.findCachedPreview(supabase, this.cacheKey(url))
      if (!data) return null
      if (new Date(String(data.expires_at)).getTime() <= Date.now()) return null
      return data.payload as LinkPreview
    } catch {
      return null
    }
  }

  private async setDbCached(
    url: string,
    preview: LinkPreview,
    supabase: SupabaseClient,
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString()
      await this.linkPreviewRepository.upsertCachedPreview(supabase, {
        urlHash: this.cacheKey(url),
        url,
        provider: preview.provider,
        payload: preview,
        fetchedAt: new Date().toISOString(),
        expiresAt,
      })
    } catch {
      // Cache failures should never block comment creation.
    }
  }
}
