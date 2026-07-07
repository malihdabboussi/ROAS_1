'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteAsset,
  fetchImageGenerationModels,
  generateImageStream,
  listAssets,
  type GenerateImageParams,
  type GenerationProgress,
  type GenerationResult,
  type ImageGenerationModelIdWeb,
  type ImageGenerationModelMeta,
} from '@/lib/services/media-api'

const FALLBACK_IMAGE_MODELS: ImageGenerationModelMeta[] = [
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana',
    tier: 'pro',
    description: 'Best for polished, final assets.',
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
    id: 'gpt-5.4-image-2',
    name: 'GPT Image 2',
    tier: 'pro',
    description: 'Best when you want strong detail.',
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
}

export function useMediaImageGeneration({
  open,
  campaignId,
  spaceId,
  extraTags,
}: UseMediaImageGenerationOptions) {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<CoverAspectRatio>('16:9')
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModelIdWeb>(
    'gemini-3.1-flash-image-preview',
  )
  const [imageCount, setImageCount] = useState(1)
  const [availableModels, setAvailableModels] = useState<ImageGenerationModelMeta[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [currentBatchImages, setCurrentBatchImages] = useState<MediaBatchImage[]>([])
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0)
  const [generatedImages, setGeneratedImages] = useState<MediaGeneratedImage[]>([])
  const [isLoadingCreations, setIsLoadingCreations] = useState(false)

  const fetchCreations = useCallback(async () => {
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
  }, [campaignId, spaceId])

  useEffect(() => {
    if (!open) {
      setPrompt('')
      return
    }
    void fetchCreations()
    setIsLoadingModels(true)
    fetchImageGenerationModels()
      .then((res) => {
        const list = res.models?.length > 0 ? res.models : FALLBACK_IMAGE_MODELS
        setAvailableModels(list)
        const def =
          (res.defaultModel as ImageGenerationModelIdWeb | undefined) ??
          'gemini-3.1-flash-image-preview'
        if (IMAGE_MODEL_IDS.has(def)) {
          setSelectedModel(def)
        }
      })
      .catch(() => {
        setAvailableModels(FALLBACK_IMAGE_MODELS)
      })
      .finally(() => setIsLoadingModels(false))
  }, [open, fetchCreations])

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

  const handleGenerate = useCallback(async () => {
    const p = prompt.trim()
    if (!p || isGenerating) return

    setIsGenerating(true)
    setProgress(0)
    setProgressMessage('')
    setGeneratedImageUrl(null)
    setCurrentBatchImages([])
    setSelectedBatchIndex(0)

    const tagList = ['ai-generated', 'doc-cover', ...(extraTags ?? [])]

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

    try {
      await generateImageStream(params, {
        onStart: () => {
          setProgressMessage('Starting…')
        },
        onProgress: (ev: GenerationProgress) => {
          setProgress(ev.progress)
          setProgressMessage(ev.message)
        },
        onComplete: (res: GenerationResult) => {
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
          }
        },
        onError: (msg: string) => {
          setProgressMessage(msg)
        },
      })
      void fetchCreations()
    } finally {
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
  }
}

export type DocGeneratedImage = MediaGeneratedImage
export type DocBatchImage = MediaBatchImage
export const useDocImageGen = useMediaImageGeneration
