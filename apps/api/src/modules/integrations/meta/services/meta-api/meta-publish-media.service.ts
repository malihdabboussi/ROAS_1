import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveApiService } from '../../../google-drive/services/google-drive-api.service'
import { MetaIntegration } from '../../integrations/meta.integration'

type PlacementImage = { image_url?: string; image_asset_id?: string }
type PlacementHash = { placement: string; hash: string; label: string }
type CarouselImageHash = {
  hash: string
  link: string
  name?: string
  description?: string
}

export type MetaPlacementRule = {
  customization_spec: {
    publisher_platforms: string[]
    facebook_positions?: string[]
    instagram_positions?: string[]
  }
  image_label: { name: string }
}

export type MetaPublishMediaResult = {
  imageHash?: string
  placementHashes: PlacementHash[]
  videoId?: string
  carouselImageHashes: CarouselImageHash[]
  useAssetFeed: boolean
}

@Injectable()
export class MetaPublishMediaService {
  private readonly logger = new Logger(MetaPublishMediaService.name)

  constructor(
    private readonly meta: MetaIntegration,
    private readonly driveApi: GoogleDriveApiService,
  ) {}

  buildPlacementRules(hashes: Array<{ placement: string; label: string }>): MetaPlacementRule[] {
    const rules: MetaPlacementRule[] = []

    for (const { placement, label } of hashes) {
      if (placement === 'feed') {
        rules.push({
          customization_spec: { publisher_platforms: ['facebook'], facebook_positions: ['feed'] },
          image_label: { name: label },
        })
        rules.push({
          customization_spec: {
            publisher_platforms: ['instagram'],
            instagram_positions: ['stream'],
          },
          image_label: { name: label },
        })
      } else if (placement === 'story') {
        rules.push({
          customization_spec: { publisher_platforms: ['facebook'], facebook_positions: ['story'] },
          image_label: { name: label },
        })
        rules.push({
          customization_spec: {
            publisher_platforms: ['instagram'],
            instagram_positions: ['story'],
          },
          image_label: { name: label },
        })
      } else if (placement === 'reels') {
        rules.push({
          customization_spec: {
            publisher_platforms: ['instagram'],
            instagram_positions: ['reels'],
          },
          image_label: { name: label },
        })
      }
    }

    return rules
  }

  async resolveAdMedia(
    supabase: SupabaseClient,
    userId: string,
    accessToken: string,
    adAccountId: string,
    ad: Record<string, any>,
    adFormat: string,
  ): Promise<MetaPublishMediaResult> {
    const placementImages =
      (ad.placement_images as Record<string, PlacementImage> | null) ?? {}
    const distinctPlacements = Object.entries(placementImages).filter(([, v]) => v?.image_url)
    const useAssetFeed = adFormat === 'SINGLE_IMAGE' && distinctPlacements.length >= 2

    let imageHash: string | undefined
    const placementHashes: PlacementHash[] = []
    let videoId: string | undefined
    const carouselImageHashes: CarouselImageHash[] = []

    if (adFormat === 'SINGLE_VIDEO') {
      const videoUrl = ad.video_url as string | null
      if (!videoUrl)
        throw new BadRequestException('Ad must have a video_url when format is SINGLE_VIDEO')
      this.logger.log(`Uploading video to Meta: ${videoUrl}`)
      const videoResult = await this.meta.uploadAdVideo(accessToken, adAccountId, videoUrl)
      videoId = videoResult.video_id
      await this.meta.waitForVideoReady(accessToken, videoId)
      const thumbUrl = ad.image_url as string | null
      if (thumbUrl) {
        const thumbResult = await this.meta.uploadAdImage(accessToken, adAccountId, thumbUrl)
        imageHash = thumbResult.hash
      }
    } else if (adFormat === 'CAROUSEL') {
      const cards =
        (ad.carousel_cards as Array<{
          image_url?: string
          headline?: string
          description?: string
          link?: string
        }> | null) ?? []
      if (cards.length < 2) throw new BadRequestException('Carousel ads require at least 2 cards')
      for (const card of cards) {
        if (!card.image_url)
          throw new BadRequestException('Each carousel card must have an image_url')
        const result = await this.meta.uploadAdImage(accessToken, adAccountId, card.image_url)
        carouselImageHashes.push({
          hash: result.hash,
          link: card.link || ad.destination_url,
          name: card.headline,
          description: card.description,
        })
      }
    } else if (useAssetFeed) {
      for (const [placement, img] of distinctPlacements) {
        this.logger.log(`Uploading ${placement} image to Meta: ${img.image_url}`)
        const result = await this.meta.uploadAdImage(accessToken, adAccountId, img.image_url!)
        placementHashes.push({ placement, hash: result.hash, label: `img_${placement}` })
      }
    } else {
      const adMeta = (ad.metadata as Record<string, unknown> | null) ?? {}
      const imageSource = adMeta.image_source as string | undefined
      const driveFileId = adMeta.drive_file_id as string | undefined

      if (imageSource === 'google_drive' && driveFileId?.trim()) {
        this.logger.log(`Resolving image from Google Drive file: ${driveFileId}`)
        const { buffer, exportMimeType } = await this.driveApi.downloadFile(
          supabase,
          userId,
          driveFileId.trim(),
          undefined,
        )
        const imageResult = await this.meta.uploadAdImageFromBuffer(
          accessToken,
          adAccountId,
          buffer,
          exportMimeType,
        )
        imageHash = imageResult.hash
      } else {
        const resolvedUrl =
          distinctPlacements.length === 1
            ? distinctPlacements[0][1].image_url!
            : (ad.image_url as string | null)
        if (resolvedUrl) {
          this.logger.log(`Uploading image to Meta: ${resolvedUrl}`)
          const imageResult = await this.meta.uploadAdImage(accessToken, adAccountId, resolvedUrl)
          imageHash = imageResult.hash
        }
      }
    }

    if (adFormat === 'SINGLE_IMAGE' && !useAssetFeed && !imageHash) {
      throw new BadRequestException('Ad must have an image to publish to Meta')
    }

    return {
      imageHash,
      placementHashes,
      videoId,
      carouselImageHashes,
      useAssetFeed,
    }
  }
}
