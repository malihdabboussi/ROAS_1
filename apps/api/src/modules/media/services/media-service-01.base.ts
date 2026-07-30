import { randomUUID } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import type {
  ConfirmUploadInput,
  ConfirmUploadResult,
  EditImageParsed,
  GenerateImageInput,
  GenerateImageResult,
  ImportUrlInput,
  MediaAssetRow,
  PresignUploadInput,
  PresignUploadResult,
} from '../dto'
import { GeminiImageIntegration } from '../integrations/gemini-image.integration'
import { MediaUploadRepository } from '../repositories/media-upload.repository'
import { MediaRepository } from '../repositories/media.repository'
import { buildMediaAssetRef } from '../utils/media-asset-ref'
import { MediaIndexerService } from './media-indexer.service'

export type SendFn = (type: string, data: Record<string, unknown>) => Promise<void>

const SOCIAL_IMAGE_CACHE_MAX_BYTES = 8 * 1024 * 1024
const SOCIAL_IMAGE_FETCH_TIMEOUT_MS = 25_000
const REMOTE_MEDIA_IMPORT_MAX_BYTES = 50 * 1024 * 1024
const REMOTE_MEDIA_FETCH_TIMEOUT_MS = 30_000
const REMOTE_MEDIA_MAX_REDIRECTS = 3
const METADATA_HOSTS = new Set(['metadata.google.internal'])

function nextImageEditName(sourceName: string | null): string {
  const fallback = 'Edited image'
  const rawName = sourceName?.trim()
  if (!rawName) return fallback
  const trimmed = /^processed-render_static_ad-/i.test(rawName) ? 'Static ad' : rawName
  const numberedEdit = trimmed.match(/^(.*) — Edit (\d+)$/)
  if (numberedEdit) {
    const next = Number(numberedEdit[2]) + 1
    return `${numberedEdit[1]} — Edit ${next}`.slice(0, 100)
  }
  if (trimmed.endsWith(' — Edit')) return `${trimmed} 2`.slice(0, 100)
  return `${trimmed} — Edit`.slice(0, 100)
}

export abstract class MediaServiceBase01 {
  abstract uploadFile(...args: any[]): any
  abstract getAsset(...args: any[]): any
  protected abstract indexMediaAsset(...args: any[]): any
  protected abstract saveGeneratedImage(...args: any[]): any
  protected abstract canAccessSpaceForMedia(...args: any[]): any
  protected abstract getUserStorageBytes(...args: any[]): any
  protected abstract inferAssetType(...args: any[]): any
  protected abstract getFileExtension(...args: any[]): any
  protected abstract fetchRemoteMedia(...args: any[]): any
  protected abstract filenameFromRemoteMediaUrl(...args: any[]): any
  protected abstract parseAllowedSocialMediaUrl(...args: any[]): any
  protected abstract invalidSocialUrlError(...args: any[]): any
  protected abstract socialMediaFetchHeaders(...args: any[]): any
  protected abstract safeCacheKey(...args: any[]): any
  protected abstract findCachedSocialAsset(...args: any[]): any
  protected abstract refreshAssetSignedUrl(...args: any[]): any
  protected abstract getStorageObjectMetadata(...args: any[]): any
  protected abstract normalizeRemoteMediaContentType(...args: any[]): any
  protected abstract readRemoteMediaBuffer(...args: any[]): any
  protected abstract isPrivateOrSpecialIp(...args: any[]): any

  protected readonly logger = new Logger('MediaService')
  protected readonly supabase: SupabaseClient
  protected readonly bucket = 'media'
  protected readonly maxUploadBytes = 100 * 1024 * 1024 * 1024
  constructor(
    protected readonly gemini: GeminiImageIntegration,
    protected readonly config: ConfigService,
    protected readonly mediaIndexer: MediaIndexerService,
    protected readonly mediaRepository: MediaRepository,
    protected readonly mediaUploadRepository: MediaUploadRepository,
    protected readonly errorReporter: ErrorReporter,
    protected readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
  ) {
    this.supabase = this.mediaRepository.client
  }

  protected reportMediaFailure(
    errorCode: string,
    message: string,
    userId?: string,
    context?: Record<string, unknown>,
  ): void {
    reportAppError(this.errorReporter, {
      app: process.env.APP_NAME ?? 'api',
      category: 'integration',
      feature: 'media',
      error_code: errorCode,
      message,
      user_id: userId,
      context,
    })
  }

  // ── Generate Image (non-streaming) ──────────────────────────────────────

  async generateImage(
    input: GenerateImageInput,
    user: { id: string },
    orgId?: string | null,
  ): Promise<GenerateImageResult> {
    if (!this.gemini.isConfigured()) {
      return { success: false, error: 'Image generation not configured' }
    }

    if ((input.count ?? 1) > 1) {
      return {
        success: false,
        error: 'Batch generation (count > 1) is only supported via the streaming endpoint.',
      }
    }

    try {
      const { buffer, mimeType } = await this.gemini.generate(input.prompt, input.aspect_ratio, {
        model: input.model,
        userId: user.id,
        orgId,
        campaignId: input.campaign_id,
      })
      return this.saveGeneratedImage(buffer, mimeType, input, user, orgId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Image generation failed: ${msg}`)
      this.reportMediaFailure('image_generation_failed', msg, user.id, {
        aspect_ratio: input.aspect_ratio,
        model: input.model,
      })
      return { success: false, error: msg }
    }
  }

  // ── Generate Image (SSE streaming) ──────────────────────────────────────

  async generateImageStream(
    input: GenerateImageInput,
    user: { id: string },
    send: SendFn,
    orgId?: string | null,
  ): Promise<void> {
    if (!this.gemini.isConfigured()) {
      await send('error', { error: 'Image generation not configured' })
      return
    }

    const count = Math.min(4, Math.max(1, input.count ?? 1))

    try {
      await send('generation_start', {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio,
        count,
        model: input.model,
      })

      for (let i = 0; i < count; i++) {
        const genMsg =
          count > 1 ? `Creating image ${i + 1} of ${count}...` : 'Creating your image...'
        await send('generation_progress', {
          stage: 'generating',
          message: genMsg,
          progress: count > 1 ? Math.max(0.05, (i / count) * 0.85) : 0.2,
        })

        const { buffer, mimeType } = await this.gemini.generate(input.prompt, input.aspect_ratio, {
          model: input.model,
          userId: user.id,
          orgId,
          campaignId: input.campaign_id,
        })

        await send('generation_progress', {
          stage: 'uploading',
          message: count > 1 ? `Saving image ${i + 1} of ${count}...` : 'Saving to your library...',
          progress: count > 1 ? Math.min(0.95, ((i + 0.85) / count) * 0.85 + 0.05) : 0.7,
        })

        const result = await this.saveGeneratedImage(buffer, mimeType, input, user, orgId)

        if (!result.success) {
          await send('error', { error: result.error ?? 'Failed to save image' })
          return
        }

        await send('generation_complete', {
          asset: result.asset,
          url: result.url,
          index: i,
          total: count,
        })
      }

      await send('generation_progress', {
        stage: 'complete',
        message: 'Done!',
        progress: 1.0,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Streaming image generation failed: ${msg}`)
      this.reportMediaFailure('streaming_image_generation_failed', msg, user.id)
      await send('error', { error: msg })
    }
  }

  // ── Edit Image (SSE streaming) ────────────────────────────────────────────

  async generateImageEditStream(
    input: EditImageParsed,
    user: { id: string },
    send: SendFn,
    orgId?: string | null,
  ): Promise<void> {
    if (!this.gemini.isConfigured()) {
      await send('error', { error: 'Image generation not configured' })
      return
    }

    try {
      await send('generation_start', {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio,
        model: input.model,
        mode: 'edit',
      })

      await send('generation_progress', {
        stage: 'loading_parent',
        message: 'Loading source image…',
        progress: 0.1,
      })

      const source = await this.resolveImageEditInputs(input, user, orgId)

      await send('generation_progress', {
        stage: 'generating',
        message: 'Applying edits…',
        progress: 0.35,
      })

      const { buffer, mimeType } = await this.gemini.editImage(
        source.images,
        input.prompt,
        input.aspect_ratio,
        {
          model: input.model,
          userId: user.id,
          orgId,
          campaignId: input.campaign_id,
        },
      )

      await send('generation_progress', {
        stage: 'uploading',
        message: 'Saving to your library…',
        progress: 0.75,
      })

      const result = await this.saveGeneratedImage(
        buffer,
        mimeType,
        {
          prompt: input.prompt,
          aspect_ratio: input.aspect_ratio,
          campaign_id: input.campaign_id,
          space_id: input.space_id,
          conversation_id: input.conversation_id ?? source.conversationId ?? undefined,
          category: input.category ?? 'generated',
          tags: input.tags ?? ['ai-edited'],
          model: input.model,
          name: nextImageEditName(source.sourceName),
        },
        user,
        orgId,
      )

      if (!result.success) {
        await send('error', { error: result.error ?? 'Failed to save edited image' })
        return
      }

      await send('generation_complete', {
        asset: result.asset,
        url: result.url,
      })

      await send('generation_progress', {
        stage: 'complete',
        message: 'Done!',
        progress: 1.0,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Streaming image edit failed: ${msg}`)
      this.reportMediaFailure('streaming_image_edit_failed', msg, user.id)
      await send('error', { error: 'We couldn’t create that edit. Try again.' })
    }
  }

  async generateImageEdit(
    input: EditImageParsed,
    user: { id: string },
    orgId?: string | null,
  ): Promise<GenerateImageResult> {
    if (!this.gemini.isConfigured()) {
      return { success: false, error: 'Image generation not configured' }
    }

    try {
      const source = await this.resolveImageEditInputs(input, user, orgId)
      const { buffer, mimeType } = await this.gemini.editImage(
        source.images,
        input.prompt,
        input.aspect_ratio,
        {
          model: input.model,
          userId: user.id,
          orgId,
          campaignId: input.campaign_id,
        },
      )
      return this.saveGeneratedImage(
        buffer,
        mimeType,
        {
          prompt: input.prompt,
          aspect_ratio: input.aspect_ratio,
          campaign_id: input.campaign_id,
          space_id: input.space_id,
          conversation_id: input.conversation_id ?? source.conversationId ?? undefined,
          category: input.category ?? 'generated',
          tags: input.tags ?? ['ai-edited'],
          model: input.model,
          name: nextImageEditName(source.sourceName),
        },
        user,
        orgId,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Image edit failed: ${msg}`)
      this.reportMediaFailure('image_edit_failed', msg, user.id)
      return { success: false, error: msg }
    }
  }

  protected async resolveImageEditInputs(
    input: EditImageParsed,
    user: { id: string },
    orgId?: string | null,
  ): Promise<{
    images: Array<{ buffer: Buffer; mimeType: string }>
    conversationId: string | null
    sourceName: string | null
  }> {
    const images: Array<{ buffer: Buffer; mimeType: string }> = []
    let conversationId: string | null = null
    let sourceName: string | null = null

    if (input.parent_image_asset_id) {
      const asset = await this.getAsset(input.parent_image_asset_id, user, orgId)
      if (!asset) throw new Error('Parent image asset not found')

      const data = await this.mediaUploadRepository.downloadStorageObject(
        asset.bucket_name,
        asset.file_path,
      )
      if (!data) throw new Error('Failed to download parent image asset')

      images.push({
        buffer: Buffer.from(await data.arrayBuffer()),
        mimeType: asset.mime_type || 'image/png',
      })
      conversationId = asset.conversation_id ?? null
      sourceName = asset.name ?? null
    } else if (input.parent_image_url) {
      const res = await fetch(input.parent_image_url)
      if (!res.ok) throw new Error(`Failed to fetch parent image: ${res.status}`)
      const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png'
      images.push({ buffer: Buffer.from(await res.arrayBuffer()), mimeType: contentType })
    } else {
      throw new Error('parent_image_url or parent_image_asset_id is required')
    }

    const referenceIds = Array.from(
      new Set(
        (input.reference_image_asset_ids ?? []).filter(
          (assetId) => assetId !== input.parent_image_asset_id,
        ),
      ),
    )
    for (const assetId of referenceIds) {
      const asset = await this.getAsset(assetId, user, orgId)
      if (!asset || asset.asset_type !== 'image') {
        throw new Error('Reference image asset not found')
      }
      const data = await this.mediaUploadRepository.downloadStorageObject(
        asset.bucket_name,
        asset.file_path,
      )
      if (!data) throw new Error('Failed to download reference image asset')
      images.push({
        buffer: Buffer.from(await data.arrayBuffer()),
        mimeType: asset.mime_type || 'image/png',
      })
    }

    return { images, conversationId, sourceName }
  }

  // ── Upload User File ────────────────────────────────────────────────────

  async importFromUrl(
    input: ImportUrlInput,
    user: { id: string },
    orgId?: string | null,
  ): Promise<GenerateImageResult> {
    try {
      const remote = await this.fetchRemoteMedia(input.url)
      const filename =
        input.name?.trim() || this.filenameFromRemoteMediaUrl(remote.url, remote.mimeType)
      return this.uploadFile(remote.buffer, remote.mimeType, filename, user, orgId, {
        category: input.category ?? 'product',
        campaign_id: input.campaign_id,
        space_id: input.space_id,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import URL'
      this.logger.warn(`Media URL import rejected: ${message}`)
      return { success: false, error: message }
    }
  }

  async createPresignedUpload(
    input: PresignUploadInput,
    user: { id: string },
    orgId?: string | null,
  ): Promise<PresignUploadResult> {
    const usedBytes = await this.getUserStorageBytes(user.id)
    if (usedBytes + input.fileSize > this.maxUploadBytes) {
      return { success: false, error: 'Storage limit reached' }
    }

    const ext = this.getFileExtension(input.filename)
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/uploads/${Date.now()}-${randomUUID()}-${safeName || `upload.${ext}`}`
    const assetType = this.inferAssetType(input.mimeType)

    let presignSpaceId: string | null = input.space_id ?? null
    if (presignSpaceId) {
      const ok = await this.canAccessSpaceForMedia(presignSpaceId, user.id, orgId)
      if (!ok) {
        return { success: false, error: 'Invalid or inaccessible space_id' }
      }
    }

    const uploadData = await this.mediaUploadRepository.createSignedUploadUrl(this.bucket, filePath)

    if (uploadData.errorMessage || !uploadData.signedUrl) {
      this.logger.error(`Create signed upload URL failed: ${uploadData.errorMessage ?? 'unknown'}`)
      return { success: false, error: 'Failed to create upload URL' }
    }

    const { asset, errorMessage: dbErr } = await this.mediaUploadRepository.insertMediaAsset(
      {
        user_id: user.id,
        name: input.name || input.filename,
        original_filename: input.filename,
        file_path: filePath,
        bucket_name: this.bucket,
        file_size: input.fileSize,
        mime_type: input.mimeType,
        asset_type: assetType,
        category: input.category ?? 'upload',
        campaign_id: input.campaign_id ?? null,
        space_id: presignSpaceId,
        source: 'upload',
        is_public: false,
        status: 'pending',
        org_id: orgId ?? null,
      },
      { selectIdOnly: true },
    )

    const assetId = (asset as { id?: string } | null)?.id
    if (dbErr || !assetId) {
      this.logger.error(`Pending asset insert failed: ${dbErr ?? 'unknown'}`)
      return { success: false, error: 'Failed to create upload record' }
    }

    return {
      success: true,
      assetId,
      uploadUrl: uploadData.signedUrl,
      path: uploadData.path,
      token: uploadData.token,
    }
  }

  async confirmPresignedUpload(
    input: ConfirmUploadInput,
    user: { id: string },
    orgId?: string | null,
  ): Promise<ConfirmUploadResult> {
    const pendingAsset = await this.mediaUploadRepository.findPendingUploadAsset(
      input.assetId,
      user.id,
      orgId,
    )

    if (!pendingAsset) {
      return { success: false, error: 'Asset not found' }
    }

    const metadata = await this.getStorageObjectMetadata(
      pendingAsset.bucket_name as string,
      pendingAsset.file_path as string,
    )
    if (!metadata) {
      return { success: false, error: 'Uploaded file not found' }
    }

    const signedUrl = await this.mediaUploadRepository.createSignedUrlForPath(
      pendingAsset.bucket_name as string,
      pendingAsset.file_path as string,
      365 * 24 * 60 * 60,
    )

    const deletableAfter =
      input.aiAnalysis === true ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null

    const { asset: updated, errorMessage: updateErr } =
      await this.mediaUploadRepository.confirmPendingUploadAsset(
        input.assetId,
        user.id,
        {
          status: 'ready',
          file_size: metadata.size ?? pendingAsset.file_size,
          public_url: signedUrl ?? pendingAsset.public_url,
          deletable_after: deletableAfter,
        },
        orgId,
      )

    if (updateErr || !updated) {
      this.logger.error(`Confirm upload update failed: ${updateErr ?? 'unknown'}`)
      return { success: false, error: 'Failed to finalize upload' }
    }

    this.mediaIndexer
      .indexAsset((updated as { id?: string }).id ?? '')
      .catch((err) =>
        this.logger.warn(
          `Background media indexing failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )

    await this.indexMediaAsset(updated as MediaAssetRow, user.id, orgId)

    return {
      success: true,
      asset: updated as MediaAssetRow,
      asset_ref: buildMediaAssetRef(
        updated as MediaAssetRow,
        (updated.public_url as string | null) ?? signedUrl,
      ),
      url: (updated.public_url as string | null) ?? '',
    }
  }
}
