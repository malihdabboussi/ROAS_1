import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type {
  CachedInstagramImageResult,
  CachedSocialImageResult,
  GenerateImageInput,
  GenerateImageResult,
  MediaAssetRef,
  MediaAssetRow,
  MediaDirectUploadOpts,
  SocialPlatform,
} from '../dto'
import { buildMediaAssetRef } from '../utils/media-asset-ref'
import { MediaServiceBase01 } from './media-service-01.base'

export type SendFn = (type: string, data: Record<string, unknown>) => Promise<void>

const SOCIAL_IMAGE_CACHE_MAX_BYTES = 8 * 1024 * 1024
const SOCIAL_IMAGE_FETCH_TIMEOUT_MS = 25_000
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
type GeneratedImageSaveInput = GenerateImageInput & { name?: string }

// Org roles permitted to edit any asset in the org (creator can only edit own).
const EDITOR_ROLES = ['editor', 'admin', 'owner'] as const
// Org roles permitted to delete any asset in the org (editor can only delete own).
const DELETER_ROLES = ['admin', 'owner'] as const

export abstract class MediaServiceBase02 extends MediaServiceBase01 {
  async uploadFile(
    rawBuffer: Buffer,
    mimeType: string,
    originalFilename: string,
    user: { id: string },
    orgId?: string | null,
    opts?: MediaDirectUploadOpts,
  ): Promise<GenerateImageResult> {
    let buffer = rawBuffer
    let finalMimeType = mimeType
    let ext = originalFilename.split('.').pop() || 'bin'
    const isImage = mimeType.startsWith('image/')

    if (isImage) {
      try {
        const isJpeg = mimeType === 'image/jpeg' || mimeType === 'image/jpg'
        const isPng = mimeType === 'image/png'
        const isWebp = mimeType === 'image/webp'

        if (isJpeg || isPng || isWebp) {
          let pipeline = sharp(rawBuffer).resize(2048, 2048, {
            fit: 'inside',
            withoutEnlargement: true,
          })

          if (isJpeg) {
            pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true })
            finalMimeType = 'image/jpeg'
            ext = 'jpg'
          } else if (isPng) {
            pipeline = pipeline.png({ compressionLevel: 8 })
            finalMimeType = 'image/png'
            ext = 'png'
          } else if (isWebp) {
            pipeline = pipeline.webp({ quality: 85 })
            finalMimeType = 'image/webp'
            ext = 'webp'
          }

          buffer = await pipeline.toBuffer()
          this.logger.log(
            `Image compressed: ${rawBuffer.length} → ${buffer.length} bytes (${Math.round((1 - buffer.length / rawBuffer.length) * 100)}% reduction)`,
          )
        }
      } catch (err) {
        this.logger.warn(
          `Image compression failed, uploading original: ${err instanceof Error ? err.message : err}`,
        )
        buffer = rawBuffer
      }
    }

    const assetType = isImage ? 'image' : mimeType.startsWith('video/') ? 'video' : 'document'
    const folder = isImage ? 'images' : 'documents'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `${user.id}/${folder}/${filename}`

    const uploadErr = await this.mediaUploadRepository.uploadStorageObject(
      this.bucket,
      filePath,
      buffer,
      {
        contentType: finalMimeType,
        upsert: false,
      },
    )

    if (uploadErr) {
      this.logger.error(`Storage upload failed: ${uploadErr}`)
      return { success: false, error: 'Failed to upload file' }
    }

    const publicUrl =
      (await this.mediaUploadRepository.createSignedUrlForPath(
        this.bucket,
        filePath,
        365 * 24 * 60 * 60,
      )) ?? ''

    let uploadSpaceId: string | null = opts?.space_id ?? null
    if (uploadSpaceId) {
      const ok = await this.canAccessSpaceForMedia(uploadSpaceId, user.id, orgId)
      if (!ok) {
        return { success: false, error: 'Invalid or inaccessible space_id' }
      }
    }

    const { asset, errorMessage: dbErr } = await this.mediaUploadRepository.insertMediaAsset({
      user_id: user.id,
      name: opts?.name || originalFilename,
      original_filename: originalFilename,
      file_path: filePath,
      bucket_name: this.bucket,
      file_size: buffer.length,
      mime_type: mimeType,
      asset_type: assetType,
      category: opts?.category ?? 'upload',
      campaign_id: opts?.campaign_id ?? null,
      space_id: uploadSpaceId,
      source: 'upload',
      public_url: publicUrl,
      is_public: false,
      status: 'ready',
      org_id: orgId ?? null,
    })

    if (dbErr) {
      this.logger.error(`DB insert failed: ${dbErr}`)
      return { success: true, url: publicUrl }
    }

    this.mediaIndexer
      .indexAsset((asset as { id?: string }).id ?? '')
      .catch((err) =>
        this.logger.warn(
          `Background media indexing failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )

    const readyAsset = asset as MediaAssetRow
    await this.indexMediaAsset(readyAsset, user.id, orgId)

    return {
      success: true,
      asset: readyAsset,
      asset_ref: buildMediaAssetRef(readyAsset, publicUrl),
      url: publicUrl,
    }
  }

  async cacheInstagramImage(
    sourceUrl: string,
    cacheKey: string,
    user: { id: string },
    orgId?: string | null,
    opts?: { name?: string },
  ): Promise<CachedInstagramImageResult> {
    return this.cacheSocialImage('instagram', sourceUrl, cacheKey, user, orgId, opts)
  }

  async cacheSocialImage(
    platform: SocialPlatform,
    sourceUrl: string,
    cacheKey: string,
    user: { id: string },
    orgId?: string | null,
    opts?: { name?: string },
  ): Promise<CachedSocialImageResult> {
    const parsed = this.parseAllowedSocialMediaUrl(platform, sourceUrl)
    if (!parsed) return { cacheKey, ok: false, error: this.invalidSocialUrlError(platform) }

    const safeKey = this.safeCacheKey(cacheKey, platform)
    const filePath = `${user.id}/external/${platform}/${safeKey}.jpg`
    const cachedAt = new Date().toISOString()

    const existing = await this.findCachedSocialAsset(filePath, user.id, orgId)
    if (existing) {
      const url = await this.refreshAssetSignedUrl(existing)
      return {
        cacheKey,
        ok: true,
        assetId: existing.id,
        url: url ?? existing.public_url ?? undefined,
        filePath: existing.file_path,
        cachedAt,
      }
    }

    let upstream: Response
    try {
      upstream = await fetch(parsed.toString(), {
        headers: this.socialMediaFetchHeaders(platform),
        signal: AbortSignal.timeout(SOCIAL_IMAGE_FETCH_TIMEOUT_MS),
      })
    } catch (err) {
      this.logger.warn(
        `${platform} image cache fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return { cacheKey, ok: false, error: 'Fetch failed' }
    }

    if (!upstream.ok) {
      return { cacheKey, ok: false, error: `Upstream ${upstream.status}` }
    }

    const contentType = upstream.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
    if (!contentType?.startsWith('image/')) {
      return { cacheKey, ok: false, error: 'Upstream is not an image' }
    }

    const contentLength = Number(upstream.headers.get('content-length') ?? 0)
    if (contentLength > SOCIAL_IMAGE_CACHE_MAX_BYTES) {
      return { cacheKey, ok: false, error: 'Image too large' }
    }

    const raw = Buffer.from(await upstream.arrayBuffer())
    if (raw.length > SOCIAL_IMAGE_CACHE_MAX_BYTES) {
      return { cacheKey, ok: false, error: 'Image too large' }
    }

    let imageBuffer: Buffer
    let width: number | null = null
    let height: number | null = null
    try {
      imageBuffer = await sharp(raw)
        .rotate()
        .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer()
      const metadata = await sharp(imageBuffer).metadata()
      width = metadata.width ?? null
      height = metadata.height ?? null
    } catch (err) {
      this.logger.warn(
        `${platform} image cache transform failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return { cacheKey, ok: false, error: 'Image transform failed' }
    }

    const uploadErr = await this.mediaUploadRepository.uploadStorageObject(
      this.bucket,
      filePath,
      imageBuffer,
      {
        contentType: 'image/jpeg',
        upsert: true,
      },
    )

    if (uploadErr) {
      this.logger.error(`${platform} image cache upload failed: ${uploadErr}`)
      return { cacheKey, ok: false, error: 'Upload failed' }
    }

    const publicUrl =
      (await this.mediaUploadRepository.createSignedUrlForPath(
        this.bucket,
        filePath,
        365 * 24 * 60 * 60,
      )) ?? ''
    const platformLabel =
      platform === 'instagram'
        ? 'Instagram'
        : platform === 'youtube'
          ? 'YouTube'
          : platform === 'twitter'
            ? 'X'
            : 'TikTok'
    const assetName = opts?.name ?? `${platformLabel} image ${cacheKey}`
    const category = `${platform}_research`
    const tags = [`${platform}-research`]

    const { asset, errorMessage: dbErr } = await this.mediaUploadRepository.insertMediaAsset({
      user_id: user.id,
      name: assetName.slice(0, 255),
      original_filename: `${safeKey}.jpg`,
      file_path: filePath,
      bucket_name: this.bucket,
      file_size: imageBuffer.length,
      mime_type: 'image/jpeg',
      width,
      height,
      asset_type: 'image',
      category,
      tags,
      source: 'imported',
      public_url: publicUrl,
      is_public: false,
      status: 'ready',
      org_id: orgId ?? null,
    })

    if (dbErr || !asset) {
      this.logger.error(`${platform} image cache DB insert failed: ${dbErr ?? 'unknown'}`)
      return { cacheKey, ok: false, error: 'Asset record failed' }
    }

    await this.indexMediaAsset(asset as MediaAssetRow, user.id, orgId)

    return {
      cacheKey,
      ok: true,
      assetId: (asset as MediaAssetRow).id,
      url: publicUrl,
      filePath,
      cachedAt,
    }
  }

  async uploadCampaignAsset(
    fileBuffer: Buffer,
    mimeType: string,
    userId: string,
    campaignId: string,
    filename: string,
    folder = 'uploads',
    orgId?: string | null,
  ): Promise<{
    signedUrl: string
    path: string
    assetId?: string
    asset?: MediaAssetRow
    asset_ref?: MediaAssetRef
  }> {
    const ext = this.getFileExtension(filename)
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${userId}/${campaignId}/${folder}/${Date.now()}-${randomUUID()}-${safeName || `file.${ext}`}`
    const uploadErr = await this.mediaUploadRepository.uploadStorageObject(
      'campaigns',
      filePath,
      fileBuffer,
      {
        contentType: mimeType,
        upsert: true,
      },
    )
    if (uploadErr) throw new Error(`Failed to upload campaigns asset: ${uploadErr}`)

    const publicUrl = this.mediaUploadRepository.getPublicUrl('campaigns', filePath)
    const assetType = this.inferAssetType(mimeType)
    const { asset, errorMessage: dbErr } = await this.mediaUploadRepository.insertMediaAsset({
      user_id: userId,
      name: filename,
      original_filename: filename,
      file_path: filePath,
      bucket_name: 'campaigns',
      file_size: fileBuffer.length,
      mime_type: mimeType,
      asset_type: assetType,
      category: 'campaign_upload',
      campaign_id: campaignId,
      source: 'upload',
      source_surface: 'campaign',
      public_url: publicUrl,
      is_public: false,
      status: 'ready',
      org_id: orgId ?? null,
    })

    if (dbErr || !asset) {
      this.logger.error(`Campaign upload DB insert failed: ${dbErr ?? 'unknown'}`)
      return { signedUrl: publicUrl, path: filePath }
    }

    const readyAsset = asset as MediaAssetRow
    this.mediaIndexer
      .indexAsset(readyAsset.id)
      .catch((err) =>
        this.logger.warn(
          `Background media indexing failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    await this.indexMediaAsset(readyAsset, userId, orgId)

    return {
      signedUrl: publicUrl,
      path: filePath,
      assetId: readyAsset.id,
      asset: readyAsset,
      asset_ref: buildMediaAssetRef(readyAsset, publicUrl),
    }
  }

  // ── Save Generated Image (shared logic) ─────────────────────────────────

  protected async indexMediaAsset(
    asset: MediaAssetRow,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    if (!this.spaceRetrievalIndex) return
    await this.spaceRetrievalIndex.indexSource(this.supabase, {
      sourceType: 'media_asset',
      sourceId: asset.id,
      userId,
      orgId: asset.org_id ?? orgId ?? null,
      spaceId: asset.space_id ?? null,
    })
  }

  protected async saveGeneratedImage(
    buffer: Buffer,
    mimeType: string,
    input: GeneratedImageSaveInput,
    user: { id: string },
    orgId?: string | null,
  ): Promise<GenerateImageResult> {
    let spaceId: string | null = input.space_id ?? null
    if (spaceId) {
      const ok = await this.canAccessSpaceForMedia(spaceId, user.id, orgId)
      if (!ok) {
        return { success: false, error: 'Invalid or inaccessible space_id' }
      }
    }

    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `${user.id}/images/${filename}`

    // Upload to storage
    const uploadErr = await this.mediaUploadRepository.uploadStorageObject(
      this.bucket,
      filePath,
      buffer,
      {
        contentType: mimeType,
        upsert: false,
      },
    )

    if (uploadErr) {
      this.logger.error(`Storage upload failed: ${uploadErr}`)
      return { success: false, error: 'Failed to save image' }
    }

    // Get signed URL (1 year)
    const publicUrl =
      (await this.mediaUploadRepository.createSignedUrlForPath(
        this.bucket,
        filePath,
        365 * 24 * 60 * 60,
      )) ?? ''

    // Create media_assets row
    const { asset, errorMessage: dbErr } = await this.mediaUploadRepository.insertMediaAsset({
      user_id: user.id,
      name: input.name?.trim().slice(0, 100) || input.prompt.slice(0, 100),
      original_filename: filename,
      file_path: filePath,
      bucket_name: this.bucket,
      file_size: buffer.length,
      mime_type: mimeType,
      asset_type: 'image',
      category: input.category ?? 'generated',
      campaign_id: input.campaign_id ?? null,
      space_id: spaceId,
      conversation_id: input.conversation_id ?? null,
      tags: input.tags ?? ['ai-generated'],
      source: 'generated',
      source_model: input.model ?? 'gemini-3.1-flash-image-preview',
      source_prompt: input.prompt,
      public_url: publicUrl,
      is_public: false,
      status: 'ready',
      org_id: orgId ?? null,
    })

    if (dbErr) {
      this.logger.error(`DB insert failed: ${dbErr}`)
      return { success: true, url: publicUrl }
    }

    this.mediaIndexer
      .indexAsset((asset as { id?: string }).id ?? '')
      .catch((err) =>
        this.logger.warn(
          `Background media indexing failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )

    const readyAsset = asset as MediaAssetRow
    await this.indexMediaAsset(readyAsset, user.id, orgId)

    return {
      success: true,
      asset: readyAsset,
      asset_ref: buildMediaAssetRef(readyAsset, publicUrl),
      url: publicUrl,
    }
  }

  protected async campaignBelongsToOrg(campaignId: string, orgId: string): Promise<boolean> {
    return this.mediaUploadRepository.campaignBelongsToOrg(campaignId, orgId)
  }

  /**
   * Returns the user's active role in the given org, or null if not a member.
   * Used for media library role-based access (edit/delete authorization).
   */
  protected async getOrgRole(orgId: string, userId: string): Promise<string | null> {
    return this.mediaUploadRepository.getOrgRole(orgId, userId)
  }

  /** Space picker / attach: same visibility rules as media_assets RLS for space-scoped rows. */
  protected async canAccessSpaceForMedia(
    spaceId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    const sp = await this.mediaUploadRepository.findSpaceForMedia(spaceId)
    if (!sp) return false
    if ((sp as { user_id?: string }).user_id === userId) return true
    const visibility = (sp as { visibility?: string }).visibility
    const spaceOrgId = (sp as { org_id?: string | null }).org_id ?? null
    if (visibility === 'team' && spaceOrgId && orgId && spaceOrgId === orgId) {
      const role = await this.getOrgRole(spaceOrgId, userId)
      return role !== null
    }
    const shareUser = await this.mediaUploadRepository.findSpaceShare({
      spaceId,
      entityType: 'user',
      entityId: userId,
    })
    if (shareUser) return true
    if (spaceOrgId && orgId && spaceOrgId === orgId) {
      const shareOrg = await this.mediaUploadRepository.findSpaceShare({
        spaceId,
        entityType: 'org',
        entityId: orgId,
      })
      if (shareOrg) {
        const role = await this.getOrgRole(orgId, userId)
        return role !== null
      }
    }
    return false
  }
}
