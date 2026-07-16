'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteAsset,
  editImageStream,
  fetchImageGenerationModels,
  generateImageStream,
  listAssets,
  type GenerateImageParams,
  type GenerationProgress,
  type GenerationResult,
  type ImageGenerationModelIdWeb,
  type ImageGenerationModelMeta,
} from '@/lib/services/media-api'

const DEFAULT_MODEL: ImageGenerationModelIdWeb = 'gpt-5.4-image-2'

const FALLBACK_IMAGE_MODELS: ImageGenerationModelMeta[] = [
  {
    id: 'gpt-5.4-image-2',
    name: 'ChatGPT',
    tier: 'pro',
    description: 'OpenAI GPT Image 2 — ChatGPT images (not GPT-5.6 chat).',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '3:2', '4:3'],
    defaultAspectRatio: '16:9',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    tier: 'free',
    description: 'Best for fast drafts and iteration.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '3:2', '4:3'],
    defaultAspectRatio: '16:9',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana',
    tier: 'pro',
    description: 'Best for polished, final assets.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '3:2', '4:3'],
    defaultAspectRatio: '16:9',
  },
]

const IMAGE_MODEL_IDS = new Set<ImageGenerationModelIdWeb>([
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gpt-5.4-image-2',
])

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

interface UseMediaImageGenerationOptions {
  /** When panel opens — fetch creations + models */
  open: boolean
  campaignId?: string | null
  spaceId?: string | null
  /** Extra tags on generated assets (e.g. iteration pointer). */
  extraTags?: string[]
  /** Load prior AI creations into the hook (modal grid). Default true. */
  loadCreations?: boolean
  /** Fired after each successful generate/edit completion. */
  onGenerationComplete?: (result: { url: string; assetId: string }) => void
}

export function useMediaImageGeneration({
  open,
  campaignId,
  spaceId,
  extraTags,
  loadCreations = true,
  onGenerationComplete,
}: UseMediaImageGenerationOptions) {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<CoverAspectRatio>('16:9')
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModelIdWeb>(DEFAULT_MODEL)
  const [imageCount, setImageCount] = useState(1)
  const [availableModels, setAvailableModels] = useState<ImageGenerationModelMeta[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null)
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [currentBatchImages, setCurrentBatchImages] = useState<MediaBatchImage[]>([])
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0)
  const [generatedImages, setGeneratedImages] = useState<MediaGeneratedImage[]>([])
  const [isLoadingCreations, setIsLoadingCreations] = useState(false)

  const clearReference = useCallback(() => {
    setReferenceAssetId(null)
    setReferencePreviewUrl(null)
  }, [])

  const setReference = useCallback((assetId: string, previewUrl: string) => {
    setReferenceAssetId(assetId)
    setReferencePreviewUrl(previewUrl)
  }, [])

  const fetchCreations = useCallback(async () => {
    if (!loadCreations) return
    setIsLoadingCreations(true)
    try {
      const { assets } = await listAssets({
        category: 'ai-generated',
        asset_type: 'image',
        limit: 50,
        ...(campaignId ? { campaign_id: campaignId } : {}),
        ...(spaceId ? { space_id: spaceId } : {}),
      })
      setGeneratedImages(
        assets
          .filter((a) => a.public_url)
          .map((a) => ({
            id: a.id,
            url: a.public_url!,
            prompt: a.source_prompt ?? a.description ?? '',
          })),
      )
    } catch {
      setGeneratedImages([])
    } finally {
      setIsLoadingCreations(false)
    }
  }, [campaignId, spaceId, loadCreations])

  useEffect(() => {
    if (!open) {
      setPrompt('')
      clearReference()
      return
    }
    void fetchCreations()
    setIsLoadingModels(true)
    fetchImageGenerationModels()
      .then((res) => {
        const list = res.models?.length > 0 ? res.models : FALLBACK_IMAGE_MODELS
        setAvailableModels(list)
        // Always prefer ChatGPT / GPT Image 2 when available (ignore stale API defaults).
        const hasPreferred = list.some((m) => m.id === DEFAULT_MODEL)
        if (hasPreferred) {
          setSelectedModel(DEFAULT_MODEL)
          return
        }
        const fromApi = res.defaultModel as ImageGenerationModelIdWeb | undefined
        if (fromApi && IMAGE_MODEL_IDS.has(fromApi) && list.some((m) => m.id === fromApi)) {
          setSelectedModel(fromApi)
          return
        }
        const first = list[0]?.id
        if (first && IMAGE_MODEL_IDS.has(first as ImageGenerationModelIdWeb)) {
          setSelectedModel(first as ImageGenerationModelIdWeb)
        }
      })
      .catch(() => {
        setAvailableModels(FALLBACK_IMAGE_MODELS)
        setSelectedModel(DEFAULT_MODEL)
      })
      .finally(() => setIsLoadingModels(false))
  }, [open, fetchCreations, clearReference])

  const selectedModelInfo = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [availableModels, selectedModel],
  )

  const supportedAspectRatios = useMemo(() => {
    const fromApi = selectedModelInfo?.supportedAspectRatios
    if (fromApi?.length) return fromApi as CoverAspectRatio[]
    return ['1:1', '16:9', '9:16', '3:2', '4:3'] as CoverAspectRatio[]
  }, [selectedModelInfo])

  useEffect(() => {
    if (!supportedAspectRatios.length) return
    if (!supportedAspectRatios.includes(aspectRatio)) {
      const fallback = (selectedModelInfo?.defaultAspectRatio ??
        supportedAspectRatios[0] ??
        '16:9') as CoverAspectRatio
      setAspectRatio(fallback)
    }
  }, [supportedAspectRatios, aspectRatio, selectedModelInfo])

  const applyComplete = useCallback(
    (res: GenerationResult) => {
      const url = res.url ?? res.asset?.public_url ?? null
      const id = res.asset?.id ?? ''
      if (url) {
        setCurrentBatchImages((prev) => {
          const next = [...prev, { id, url }]
          setSelectedBatchIndex(next.length - 1)
          return next
        })
        setGeneratedImageUrl(url)
        setPreviewImageUrl(url)
        onGenerationComplete?.({ url, assetId: id })
      }
    },
    [onGenerationComplete],
  )

  const handleGenerate = useCallback(async () => {
    const p = prompt.trim()
    if (!p || isGenerating) return

    setIsGenerating(true)
    setProgress(0)
    setProgressMessage('')
    setGeneratedImageUrl(null)
    setCurrentBatchImages([])
    setSelectedBatchIndex(0)

    const tagList = ['ai-generated', ...(extraTags ?? [])]
    const streamHandlers = {
      onStart: () => {
        setProgressMessage(referenceAssetId ? 'Applying edits…' : 'Starting…')
      },
      onProgress: (ev: GenerationProgress) => {
        setProgress(ev.progress)
        setProgressMessage(ev.message)
      },
      onComplete: applyComplete,
      onError: (msg: string) => {
        setProgressMessage(msg)
      },
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000)
    try {
      if (referenceAssetId) {
        await editImageStream(
          {
            prompt: p,
            aspect_ratio: aspectRatio,
            category: 'ai-generated',
            tags: [...tagList, 'ai-edited'],
            model: selectedModel,
            parent_image_asset_id: referenceAssetId,
            ...(campaignId ? { campaign_id: campaignId } : {}),
            ...(spaceId ? { space_id: spaceId } : {}),
          },
          streamHandlers,
          controller.signal,
        )
      } else {
        const params: GenerateImageParams = {
          prompt: p,
          aspect_ratio: aspectRatio,
          category: 'ai-generated',
          tags: tagList,
          model: selectedModel,
          count: imageCount,
          ...(campaignId ? { campaign_id: campaignId } : {}),
          ...(spaceId ? { space_id: spaceId } : {}),
        }
        await generateImageStream(params, streamHandlers, controller.signal)
      }
      void fetchCreations()
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === 'AbortError') || controller.signal.aborted
      setProgressMessage(
        aborted
          ? 'Image generation timed out. Try again or switch models.'
          : err instanceof Error
            ? err.message
            : 'Image generation failed',
      )
    } finally {
      clearTimeout(timeout)
      setIsGenerating(false)
    }
  }, [
    prompt,
    isGenerating,
    aspectRatio,
    campaignId,
    spaceId,
    fetchCreations,
    selectedModel,
    imageCount,
    extraTags,
    referenceAssetId,
    applyComplete,
  ])

  const selectBatchImage = useCallback(
    (index: number) => {
      setSelectedBatchIndex(index)
      const img = currentBatchImages[index]
      if (img) {
        setGeneratedImageUrl(img.url)
        setPreviewImageUrl(img.url)
      }
    },
    [currentBatchImages],
  )

  const handleDeleteGeneratedImage = useCallback(
    async (imageId: string, imageUrl: string) => {
      if (!imageId) return
      await deleteAsset(imageId)
      setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId))
      if (generatedImageUrl === imageUrl) {
        setGeneratedImageUrl(null)
        setPreviewImageUrl(null)
      }
      void fetchCreations()
    },
    [generatedImageUrl, fetchCreations],
  )

  return {
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    selectedModel,
    setSelectedModel,
    imageCount,
    setImageCount,
    availableModels,
    isLoadingModels,
    selectedModelInfo,
    supportedAspectRatios,
    isGenerating,
    progress,
    progressMessage,
    generatedImageUrl,
    setGeneratedImageUrl,
    previewImageUrl,
    setPreviewImageUrl,
    currentBatchImages,
    selectedBatchIndex,
    selectBatchImage,
    generatedImages,
    isLoadingCreations,
    handleGenerate,
    handleDeleteGeneratedImage,
    fetchCreations,
    referenceAssetId,
    referencePreviewUrl,
    setReference,
    clearReference,
  }
}

export type DocGeneratedImage = MediaGeneratedImage
export type DocBatchImage = MediaBatchImage
export const useDocImageGen = useMediaImageGeneration
