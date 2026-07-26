import {
  editImageStream,
  generateImageStream,
  type GenerateImageParams,
  type GenerationProgress,
  type GenerationResult,
  type ImageGenerationModelIdWeb,
  type ImageGenerationModelMeta,
} from '@/lib/services/media-api'

export const DEFAULT_IMAGE_MODEL: ImageGenerationModelIdWeb = 'gpt-5.4-image-2'

export const FALLBACK_IMAGE_MODELS: ImageGenerationModelMeta[] = [
  {
    id: 'gpt-5.4-image-2',
    name: 'ChatGPT',
    tier: 'pro',
    description: 'OpenAI GPT Image 2 — ChatGPT images (not GPT-5.6 chat).',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '3:4', '3:2', '4:3'],
    defaultAspectRatio: '16:9',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    tier: 'free',
    description: 'Best for fast drafts and iteration.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '3:4', '3:2', '4:3'],
    defaultAspectRatio: '16:9',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana',
    tier: 'pro',
    description: 'Best for polished, final assets.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '3:4', '3:2', '4:3'],
    defaultAspectRatio: '16:9',
  },
]

export const IMAGE_MODEL_IDS = new Set<ImageGenerationModelIdWeb>([
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gpt-5.4-image-2',
])

interface RunMediaImageGenerationInput {
  prompt: string
  aspectRatio: NonNullable<GenerateImageParams['aspect_ratio']>
  model: ImageGenerationModelIdWeb
  imageCount: number
  referenceAssetId: string | null
  campaignId?: string | null
  spaceId?: string | null
  conversationId?: string | null
  additionalReferenceAssetIds?: string[]
  extraTags?: string[]
  handlers: {
    onStart: () => void
    onProgress: (event: GenerationProgress) => void
    onComplete: (result: GenerationResult) => void
    onError: (message: string) => void
  }
  signal: AbortSignal
}

export function runMediaImageGeneration(input: RunMediaImageGenerationInput) {
  const tags = ['ai-generated', ...(input.extraTags ?? [])]
  if (input.referenceAssetId) {
    return editImageStream(
      {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        category: 'ai-generated',
        tags: [...tags, 'ai-edited'],
        model: input.model,
        parent_image_asset_id: input.referenceAssetId,
        reference_image_asset_ids: input.additionalReferenceAssetIds,
        ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
        ...(input.spaceId ? { space_id: input.spaceId } : {}),
        ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
      },
      input.handlers,
      input.signal,
    )
  }
  return generateImageStream(
    {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      category: 'ai-generated',
      tags,
      model: input.model,
      count: input.imageCount,
      ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
      ...(input.spaceId ? { space_id: input.spaceId } : {}),
      ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
    },
    input.handlers,
    input.signal,
  )
}
