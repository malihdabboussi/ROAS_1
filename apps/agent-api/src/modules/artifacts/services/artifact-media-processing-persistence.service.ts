import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Logger } from '@nestjs/common'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'
import { ArtifactIgStoryMissionDeliverableService } from './artifact-ig-story-mission-deliverable.service'

export interface PersistProcessedMediaInput {
  target: Record<string, any>
  userId: string
  sessionKey?: string
  campaignId: string | null | undefined
  operation: string
  outputPath: string
  outputFormat: string
  logger: Pick<Logger, 'error'>
}

export class ArtifactMediaProcessingPersistenceService {
  private readonly igStoryMissionDeliverable = new ArtifactIgStoryMissionDeliverableService()

  constructor(private readonly repository: ArtifactMediaAssetsRepository) {}

  async persistProcessedMedia(input: PersistProcessedMediaInput) {
    const outputBuffer = await readFile(input.outputPath)
    const mimeType = this.mimeForFormat(input.outputFormat)
    const storagePath = `${input.userId}/processed/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${input.outputFormat}`

    const { error: uploadErr } = await this.repository.uploadMediaObject(
      input.target.serviceClient,
      {
        filePath: storagePath,
        buffer: outputBuffer,
        contentType: mimeType,
      },
    )
    if (uploadErr) {
      return { success: false, error: `Upload failed: ${uploadErr.message}` }
    }

    const { data: signedData, error: signErr } = await this.repository.createMediaSignedUrl(
      input.target.serviceClient,
      storagePath,
    )
    if (signErr) {
      input.logger.error(
        `process_media signed_url_failed path=${storagePath} error=${signErr.message}`,
      )
    }
    const publicUrl = signedData?.signedUrl ?? ''

    let mediaAssetId: string | null = null
    const processOrgId = input.target.resolveOrgId?.(input.sessionKey) as string | null | undefined
    const assetType = this.assetTypeForFormat(input.outputFormat)
    const { data: asset, error: dbErr } = await this.repository.createGeneratedMediaAsset(
      input.target.serviceClient,
      {
        user_id: input.userId,
        org_id: processOrgId ?? null,
        name: `processed-${input.operation}-${randomUUID().slice(0, 8)}`,
        original_filename: `output.${input.outputFormat}`,
        file_path: storagePath,
        bucket_name: 'media',
        file_size: outputBuffer.length,
        mime_type: mimeType,
        asset_type: assetType,
        category: 'processed',
        campaign_id: input.campaignId ?? null,
        tags: [`process-media-${input.operation}`],
        source: 'generated',
        source_model: 'ffmpeg',
        source_prompt: `process_media: ${input.operation}`,
        public_url: publicUrl || null,
        is_public: false,
      },
    )
    if (dbErr) {
      input.logger.error(`process_media media_assets_insert_failed error=${dbErr.message}`)
    }
    mediaAssetId = typeof asset?.id === 'string' ? asset.id : null

    const result = {
      success: true,
      operation: input.operation,
      url: publicUrl,
      file_path: storagePath,
      media_asset_id: mediaAssetId,
      format: input.outputFormat,
      file_size: outputBuffer.length,
      campaign_id: input.campaignId ?? null,
    }
    if (input.operation !== 'render_ig_story') return result
    return this.igStoryMissionDeliverable.persist({
      target: input.target,
      userId: input.userId,
      campaignId: input.campaignId,
      sessionKey: input.sessionKey,
      processed: result,
    })
  }

  private mimeForFormat(format: string): string {
    const map: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      gif: 'image/gif',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    }
    return map[format] ?? 'application/octet-stream'
  }

  private assetTypeForFormat(format: string): string {
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(format)) return 'audio'
    if (['gif', 'jpg', 'png', 'webp'].includes(format)) return 'image'
    return 'video'
  }
}
