import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { MediaAssetRow, QueryAssetsInput, UpdateAssetInput } from '../dto'
import { MediaServiceBase02 } from './media-service-02.base'
const REMOTE_MEDIA_IMPORT_MAX_BYTES = 50 * 1024 * 1024
const REMOTE_MEDIA_FETCH_TIMEOUT_MS = 30_000
const REMOTE_MEDIA_MAX_REDIRECTS = 3
const METADATA_HOSTS = new Set(['metadata.google.internal'])

// Categories that are produced/consumed by other product surfaces (Spaces research,
// agent settings, brain import, themes) and should NOT clutter the media library UI.
// Backend access controls (read/edit/delete) still apply via the standard rules.
const HIDDEN_LIBRARY_CATEGORIES = [
  'instagram_research',
  'tiktok_research',
  'youtube_research',
  'twitter_research',
  'agent-avatar',
  'brain_import',
  'theme-logo',
] as const
// PostgREST `.or()` filter that excludes hidden categories while preserving
// rows where category IS NULL (most user uploads have null category).
// `category.not.in.(...)` alone would also drop NULL rows due to SQL NULL semantics.
const HIDDEN_CATEGORIES_OR_FILTER = `category.is.null,category.not.in.(${HIDDEN_LIBRARY_CATEGORIES.join(',')})`

// Org roles permitted to edit any asset in the org (creator can only edit own).
const EDITOR_ROLES = ['editor', 'admin', 'owner'] as const
// Org roles permitted to delete any asset in the org (editor can only delete own).
const DELETER_ROLES = ['admin', 'owner'] as const

export abstract class MediaServiceBase03 extends MediaServiceBase02 {
  /**
   * Read a single asset. Allowed if:
   *   - caller owns it (user_id match), OR
   *   - asset belongs to an org and caller is an active member of that org.
   * Personal assets (org_id IS NULL) are owner-only.
   */
  protected async resolveAssetForRead(
    assetId: string,
    user: { id: string },
    _orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    const r = await this.mediaRepository.findAssetById(assetId)
    if (!r) return null
    if (r.user_id === user.id) return r
    if (!r.org_id) return null
    const role = await this.getOrgRole(r.org_id, user.id)
    return role ? r : null
  }

  // ── List Assets ─────────────────────────────────────────────────────────

  async listAssets(
    query: QueryAssetsInput,
    user: { id: string },
    orgId?: string | null,
  ): Promise<{ assets: MediaAssetRow[]; total: number }> {
    if (query.space_id) {
      const allowed = await this.canAccessSpaceForMedia(query.space_id, user.id, orgId)
      if (!allowed) {
        return { assets: [], total: 0 }
      }

      const result = await this.mediaRepository.listAssets(query, {
        userId: user.id,
        orgId,
        hiddenCategoryFilter: HIDDEN_CATEGORIES_OR_FILTER,
        spaceId: query.space_id,
      })

      if (result.errorMessage) {
        this.logger.error(`List assets failed: ${result.errorMessage}`)
        return { assets: [], total: 0 }
      }

      return { assets: result.assets, total: result.total }
    }

    const sharedCampaign =
      Boolean(query.campaign_id) && typeof orgId === 'string' && orgId.length > 0

    if (sharedCampaign) {
      const campaignOk = await this.campaignBelongsToOrg(query.campaign_id!, orgId!)
      if (!campaignOk) {
        return { assets: [], total: 0 }
      }

      const result = await this.mediaRepository.listAssets(query, {
        userId: user.id,
        orgId,
        hiddenCategoryFilter: HIDDEN_CATEGORIES_OR_FILTER,
        sharedCampaign: true,
      })

      if (result.errorMessage) {
        this.logger.error(`List assets failed: ${result.errorMessage}`)
        return { assets: [], total: 0 }
      }

      return { assets: result.assets, total: result.total }
    }

    // Default library: org context shows ALL org members' media; personal context
    // shows only the caller's personal items (org_id IS NULL).
    const result = await this.mediaRepository.listAssets(query, {
      userId: user.id,
      orgId,
      hiddenCategoryFilter: HIDDEN_CATEGORIES_OR_FILTER,
    })

    if (result.errorMessage) {
      this.logger.error(`List assets failed: ${result.errorMessage}`)
      return { assets: [], total: 0 }
    }

    return { assets: result.assets, total: result.total }
  }

  // ── Get Single Asset ────────────────────────────────────────────────────

  async getAsset(
    assetId: string,
    user: { id: string },
    orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    const asset = await this.resolveAssetForRead(assetId, user, orgId)
    if (!asset) return null
    if (asset.conversation_id) return asset

    const conversationId = await this.mediaRepository.findOriginConversationId(assetId)
    if (!conversationId) return asset
    return { ...asset, conversation_id: conversationId }
  }

  async resolveAssetIdByUrl(
    url: string,
    user: { id: string },
    orgId?: string | null,
  ): Promise<string | null> {
    const assetId = await this.mediaRepository.findAssetIdByUrl(url)
    if (!assetId) return null
    const asset = await this.resolveAssetForRead(assetId, user, orgId)
    return asset?.id ?? null
  }

  // ── Update Asset ────────────────────────────────────────────────────────

  async updateAsset(
    assetId: string,
    input: UpdateAssetInput,
    user: { id: string },
    _orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    const existing = await this.mediaRepository.findAssetById(assetId)
    if (!existing) return null
    const asset = existing

    const isOwner = asset.user_id === user.id
    let allowed = isOwner
    if (!allowed && asset.org_id) {
      const role = await this.getOrgRole(asset.org_id, user.id)
      allowed = role !== null && (EDITOR_ROLES as readonly string[]).includes(role)
    }
    if (!allowed) return null

    const data = await this.mediaRepository.updateAsset(assetId, input)
    if (!data) return null
    await this.indexMediaAsset(
      data as MediaAssetRow,
      user.id,
      (data as MediaAssetRow).org_id ?? null,
    )
    return data as MediaAssetRow
  }

  // ── Copy Asset to Campaign ──────────────────────────────────────────────

  async copyAssetToCampaign(
    assetId: string,
    targetCampaignId: string,
    user: { id: string },
    orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    const original = await this.getAsset(assetId, user, orgId)
    if (!original) return null

    if (original.campaign_id === targetCampaignId) return original

    const { asset: data, errorMessage } = await this.mediaRepository.copyAssetToCampaign(original, {
      targetCampaignId,
      userId: user.id,
      orgId,
    })

    if (errorMessage || !data) {
      this.logger.error(`Copy asset failed: ${errorMessage}`)
      return null
    }

    await this.indexMediaAsset(data as MediaAssetRow, user.id, orgId)
    return data as MediaAssetRow
  }

  // ── Delete Asset ────────────────────────────────────────────────────────

  async deleteAsset(
    assetId: string,
    user: { id: string },
    _orgId?: string | null,
  ): Promise<boolean> {
    const existing = await this.mediaRepository.findAssetById(assetId)
    if (!existing) return false
    const asset = existing

    const isOwner = asset.user_id === user.id
    let allowed = isOwner
    if (!allowed && asset.org_id) {
      const role = await this.getOrgRole(asset.org_id, user.id)
      allowed = role !== null && (DELETER_ROLES as readonly string[]).includes(role)
    }
    if (!allowed) return false

    await this.mediaRepository.removeAssetStorageObject(asset)
    await this.mediaRepository.deleteAssetRow(assetId)
    await this.spaceRetrievalIndex?.deleteSource(this.supabase, 'media_asset', assetId)
    return true
  }

  // ── Refresh Signed URL ──────────────────────────────────────────────────

  async refreshUrl(
    assetId: string,
    user: { id: string },
    orgId?: string | null,
  ): Promise<string | null> {
    const asset = await this.getAsset(assetId, user, orgId)
    if (!asset) return null

    const signedUrl = await this.mediaRepository.createAssetSignedUrl(asset, 365 * 24 * 60 * 60)

    if (signedUrl) {
      await this.mediaRepository.updateAssetPublicUrlForUser(assetId, user.id, signedUrl, orgId)
    }

    return signedUrl
  }

  async cleanupPendingUploads(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const staleAssets = await this.mediaRepository.listStalePendingAssets(cutoff)
    if (staleAssets.length === 0) return 0

    for (const asset of staleAssets) {
      await this.mediaRepository.removeAssetStorageObject(asset)
      await this.mediaRepository.markAssetDeleted(asset.id)
    }
    return staleAssets.length
  }

  async cleanupAiAnalysisSources(): Promise<number> {
    const now = new Date().toISOString()
    const candidates = await this.mediaRepository.listExpiredAiAnalysisAssets(now)
    if (candidates.length === 0) return 0

    for (const asset of candidates) {
      await this.mediaRepository.removeAssetStorageObject(asset)
      await this.mediaRepository.markAssetDeleted(asset.id, { clearPublicUrl: true })
    }
    return candidates.length
  }

  protected async getUserStorageBytes(userId: string): Promise<number> {
    return this.mediaRepository.getUserStorageBytes(userId)
  }

  protected inferAssetType(mimeType: string): 'image' | 'document' | 'video' | 'audio' | 'other' {
    const normalizedMimeType = mimeType.toLowerCase()
    if (normalizedMimeType.startsWith('image/')) return 'image'
    if (normalizedMimeType.startsWith('video/')) return 'video'
    if (normalizedMimeType.startsWith('audio/')) return 'audio'
    if (
      normalizedMimeType.includes('pdf') ||
      normalizedMimeType.includes('text/') ||
      normalizedMimeType.includes('json') ||
      normalizedMimeType.includes('xml') ||
      normalizedMimeType.includes('yaml') ||
      normalizedMimeType.includes('word') ||
      normalizedMimeType.includes('document') ||
      normalizedMimeType.includes('presentation') ||
      normalizedMimeType.includes('powerpoint') ||
      normalizedMimeType.includes('spreadsheet') ||
      normalizedMimeType.includes('excel')
    ) {
      return 'document'
    }
    return 'other'
  }

  protected getFileExtension(filename: string): string {
    const parts = filename.split('.')
    if (parts.length < 2) return 'bin'
    const ext = parts[parts.length - 1]
    return ext ? ext.toLowerCase() : 'bin'
  }

  protected async fetchRemoteMedia(
    rawUrl: string,
  ): Promise<{ buffer: Buffer; mimeType: string; url: URL }> {
    let current = this.parseRemoteMediaUrl(rawUrl)

    for (let redirects = 0; redirects <= REMOTE_MEDIA_MAX_REDIRECTS; redirects++) {
      await this.assertPublicRemoteMediaUrl(current)

      const response = await fetch(current.toString(), {
        redirect: 'manual',
        headers: {
          Accept: 'image/*,video/*;q=0.9,*/*;q=0.1',
          'User-Agent': 'Vibey-Media-Importer/1.0',
        },
        signal: AbortSignal.timeout(REMOTE_MEDIA_FETCH_TIMEOUT_MS),
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new Error('Remote URL redirected without a location')
        current = this.parseRemoteMediaUrl(location, current)
        continue
      }

      if (!response.ok) {
        throw new Error(`Remote returned ${response.status}`)
      }

      const mimeType = this.normalizeRemoteMediaContentType(response.headers.get('content-type'))
      if (!mimeType || (!mimeType.startsWith('image/') && !mimeType.startsWith('video/'))) {
        throw new Error('URL does not point to a supported image or video')
      }

      const contentLength = Number(response.headers.get('content-length') ?? 0)
      if (contentLength > REMOTE_MEDIA_IMPORT_MAX_BYTES) {
        throw new Error('Remote file is too large')
      }

      return {
        buffer: await this.readRemoteMediaBuffer(response),
        mimeType,
        url: current,
      }
    }

    throw new Error('Remote URL redirected too many times')
  }

  protected parseRemoteMediaUrl(rawUrl: string, base?: URL): URL {
    let parsed: URL
    try {
      parsed = base ? new URL(rawUrl, base) : new URL(rawUrl)
    } catch {
      throw new Error('Invalid URL')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL')
    }
    return parsed
  }

  protected async assertPublicRemoteMediaUrl(url: URL): Promise<void> {
    const hostname = url.hostname.trim().toLowerCase()
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
      throw new Error('URL is not allowed')
    }
    if (METADATA_HOSTS.has(hostname)) {
      throw new Error('URL is not allowed')
    }

    if (isIP(hostname)) {
      if (this.isPrivateOrSpecialIp(hostname)) throw new Error('URL is not allowed')
      return
    }

    let records: Array<{ address: string }> = []
    try {
      records = await lookup(hostname, { all: true, verbatim: false })
    } catch {
      throw new Error('URL is not allowed')
    }

    if (
      records.length === 0 ||
      records.some((record) => this.isPrivateOrSpecialIp(record.address))
    ) {
      throw new Error('URL is not allowed')
    }
  }
}
