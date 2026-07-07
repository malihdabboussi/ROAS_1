import { Injectable } from '@nestjs/common'
import { buildVibeyAssetRef, type VibeyAssetRef } from '@vibey/api-shared'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'

@Injectable()
export class ArtifactLegacyMediaUploadService {
  constructor(
    private readonly repository: ArtifactMediaAssetsRepository = new ArtifactMediaAssetsRepository(),
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
        tags: ['ai-generated'],
        source: 'generated',
        source_surface: 'agent_generated_media',
        source_model: model,
        source_prompt: prompt,
        public_url: publicUrl,
        is_public: false,
      },
    )

    if (dbErr) {
      target.logger.error(`[Media] DB insert failed: ${dbErr.message}`)
      return { success: true, url: publicUrl }
    }

    return {
      success: true,
      asset,
      asset_ref: buildVibeyAssetRef(asset as Parameters<typeof buildVibeyAssetRef>[0], publicUrl),
      url: publicUrl,
    }
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
  ): Promise<{
    success: boolean
    url?: string
    asset?: unknown
    asset_ref?: VibeyAssetRef
    error?: string
  }> {
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
        tags: ['ai-generated'],
        source: 'generated',
        source_surface: 'agent_generated_media',
        source_model: model,
        source_prompt: prompt,
        public_url: publicUrl,
        is_public: false,
      },
    )

    if (dbErr) {
      target.logger.error(`[Media] DB insert failed: ${dbErr.message}`)
      return { success: true, url: publicUrl }
    }

    return {
      success: true,
      asset,
      asset_ref: buildVibeyAssetRef(asset as Parameters<typeof buildVibeyAssetRef>[0], publicUrl),
      url: publicUrl,
    }
  }
}
