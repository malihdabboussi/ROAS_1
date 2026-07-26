import type { GenerateImageParams, ImageGenerationModelIdWeb } from '@/lib/services/media-api'

export type CoverAspectRatio = NonNullable<GenerateImageParams['aspect_ratio']>

export interface MediaGeneratedImage {
  id: string
  url: string
  prompt: string
}

export interface MediaBatchImage {
  id: string
  url: string
}

export interface MediaImageGenerationOverrides {
  prompt?: string
  aspectRatio?: CoverAspectRatio
}

export interface UseMediaImageGenerationOptions {
  open: boolean
  campaignId?: string | null
  spaceId?: string | null
  conversationId?: string | null
  extraTags?: string[]
  loadCreations?: boolean
  onGenerationComplete?: (result: { url: string; assetId: string }) => void
}

export type MediaImageModelId = ImageGenerationModelIdWeb
export type DocGeneratedImage = MediaGeneratedImage
export type DocBatchImage = MediaBatchImage
