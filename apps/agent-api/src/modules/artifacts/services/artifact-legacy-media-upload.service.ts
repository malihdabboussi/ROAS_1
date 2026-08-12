import { Injectable } from '@nestjs/common'
import sharp from 'sharp'
import { buildVibeyAssetRef, type VibeyAssetRef } from '@vibey/api-shared'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'
import { normalizeGeneratedImage } from './artifact-generated-image-normalizer'
import { ArtifactVideoPosterService } from './artifact-video-poster.service'

@Injectable()
export class ArtifactLegacyMediaUploadService {
  constructor(
    private readonly repository: ArtifactMediaAssetsRepository = new ArtifactMediaAssetsRepository(),
    private readonly posterService: ArtifactVideoPosterService = new ArtifactVideoPosterService(),
  ) {}

  async uploadMediaFromUrl(
    target: Record<string, any>,
    url: string,
    assetType: 'image' | 'video',
    userId: string,
    campaignId: string | null,
    prompt: string,
    model: string,
    orgId?: string | null,
    spaceId?: string | null,
    conversationId?: string | null,
    durationSeconds?: number | null,
  ): Promise<{
    success: boolean
    url?: string
    asset?: unknown
    asset_ref?: VibeyAssetRef
    error?: string
  }> {
    const downloadRes = await fetch(url)
    if (!downloadRes.ok) return { success: false, error: 'Failed to download generated file' }

    const buffer = Buffer.from(await downloadRes.arrayBuffer())
    const contentType =
      downloadRes.headers.get('content-type') ?? (assetType === 'video' ? 'video/mp4' : 'image/png')

    const ext = contentType.includes('jpeg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('mp4') || contentType.includes('video')
          ? 'mp4'
          : assetType === 'video'
            ? 'mp4'
            : 'png'

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const subfolder = assetType === 'video' ? 'videos' : 'images'
    const filePath = `${userId}/${subfolder}/${filename}`

    const { error: uploadErr } = await this.repository.uploadMediaObject(target.serviceClient, {
      filePath,
      buffer,
      contentType,
    })

    if (uploadErr) {
      target.logger.error(`[Media] Storage upload failed: ${uploadErr.message}`)
      return { success: false, error: `Upload failed: ${uploadErr.message}` }
    }

    const { data: urlData } = await this.repository.createMediaSignedUrl(
      target.serviceClient,
      filePath,
    )
    const publicUrl = urlData?.signedUrl ?? ''

    const posterUrl =
      assetType === 'video' ? await this.buildVideoPoster(target, buffer, userId) : null

    const { data: asset, error: dbErr } = await this.repository.createGeneratedMediaAsset(
      target.serviceClient,
      {
        user_id: userId,
        org_id: orgId ?? null,
        name: prompt.slice(0, 100),
        original_filename: filename,
        file_path: filePath,
        bucket_name: 'media',
        file_size: buffer.length,
        mime_type: contentType,
        asset_type: assetType,
        category: 'generated',
        campaign_id: campaignId ?? null,
        space_id: spaceId ?? null,
        conversation_id: conversationId ?? null,
        tags: ['ai-generated'],
        source: 'generated',
        source_surface: 'generated',
        source_model: model,
        source_prompt: prompt,
        public_url: publicUrl,
        is_public: false,
        ...(assetType === 'video'
          ? { poster_url: posterUrl, duration_seconds: durationSeconds ?? null }
          : {}),
      },
    )

    if (dbErr) {
      target.logger.error(`[Media] DB insert failed: ${dbErr.message}`)
      return { success: false, error: `DB insert failed: ${dbErr.message}`, url: publicUrl }
    }

    return {
      success: true,
      asset,
      asset_ref: buildVibeyAssetRef(asset as Parameters<typeof buildVibeyAssetRef>[0], publicUrl),
      url: publicUrl,
    }
  }

  /** Best-effort poster frame for a video: a null return never fails the upload. */
  private async buildVideoPoster(
    target: Record<string, any>,
    videoBuffer: Buffer,
    userId: string,
  ): Promise<string | null> {
    const posterBuffer = await this.posterService.extractPosterFrame(videoBuffer)
    if (!posterBuffer) {
      target.logger.warn('[Media] Poster extraction failed — storing video without poster')
      return null
    }
    const posterPath = `${userId}/videos/poster-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`
    const { error } = await this.repository.uploadMediaObject(target.serviceClient, {
      filePath: posterPath,
      buffer: posterBuffer,
      contentType: 'image/jpeg',
    })
    if (error) {
      target.logger.warn(`[Media] Poster upload failed: ${error.message}`)
      return null
    }
    const { data } = await this.repository.createMediaSignedUrl(target.serviceClient, posterPath)
    return data?.signedUrl ?? null
  }

  async uploadMediaFromBytes(
    target: Record<string, any>,
    buffer: Buffer,
    contentType: string,
    assetType: 'image' | 'video',
    userId: string,
    campaignId: string | null,
    prompt: string,
    model: string,
    orgId?: string | null,
    spaceId?: string | null,
    conversationId?: string | null,
    assetName?: string,
    imageAspectRatio?: string,
    durationSeconds?: number | null,
  ): Promise<{
    success: boolean
    url?: string
    asset?: unknown
    asset_ref?: VibeyAssetRef
    error?: string
  }> {
    const normalized =
      assetType === 'image' && imageAspectRatio
        ? await normalizeGeneratedImage(buffer, contentType, imageAspectRatio)
        : { buffer, contentType }
    const storedBuffer = normalized.buffer
    const storedContentType = normalized.contentType
    const dimensions =
      assetType === 'image'
        ? await sharp(storedBuffer)
            .metadata()
            .then((metadata) => ({
              width: metadata.width ?? null,
              height: metadata.height ?? null,
            }))
            .catch(() => ({ width: null, height: null }))
        : { width: null, height: null }
    const ext = storedContentType.includes('jpeg')
      ? 'jpg'
      : storedContentType.includes('webp')
        ? 'webp'
        : storedContentType.includes('mp4') || storedContentType.includes('video')
          ? 'mp4'
          : assetType === 'video'
            ? 'mp4'
            : 'png'

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const subfolder = assetType === 'video' ? 'videos' : 'images'
    const filePath = `${userId}/${subfolder}/${filename}`

    const { error: uploadErr } = await this.repository.uploadMediaObject(target.serviceClient, {
      filePath,
      buffer: storedBuffer,
      contentType: storedContentType,
    })

    if (uploadErr) {
      target.logger.error(`[Media] Storage upload failed: ${uploadErr.message}`)
      return { success: false, error: `Upload failed: ${uploadErr.message}` }
    }

    const { data: urlData } = await this.repository.createMediaSignedUrl(
      target.serviceClient,
      filePath,
    )
    const publicUrl = urlData?.signedUrl ?? ''

    const posterUrl =
      assetType === 'video' ? await this.buildVideoPoster(target, storedBuffer, userId) : null

    const { data: asset, error: dbErr } = await this.repository.createGeneratedMediaAsset(
      target.serviceClient,
      {
        user_id: userId,
        org_id: orgId ?? null,
        name: (assetName ?? prompt).slice(0, 100),
        original_filename: filename,
        file_path: filePath,
        bucket_name: 'media',
        file_size: storedBuffer.length,
        mime_type: storedContentType,
        width: dimensions.width,
        height: dimensions.height,
        asset_type: assetType,
        category: 'generated',
        campaign_id: campaignId ?? null,
        space_id: spaceId ?? null,
        conversation_id: conversationId ?? null,
        tags: ['ai-generated'],
        source: 'generated',
        source_surface: 'generated',
        source_model: model,
        source_prompt: prompt,
        public_url: publicUrl,
        is_public: false,
        ...(assetType === 'video'
          ? { poster_url: posterUrl, duration_seconds: durationSeconds ?? null }
          : {}),
      },
    )

    if (dbErr) {
      target.logger.error(`[Media] DB insert failed: ${dbErr.message}`)
      return { success: false, error: `DB insert failed: ${dbErr.message}`, url: publicUrl }
    }

    return {
      success: true,
      asset,
      asset_ref: buildVibeyAssetRef(asset as Parameters<typeof buildVibeyAssetRef>[0], publicUrl),
      url: publicUrl,
    }
  }
}
