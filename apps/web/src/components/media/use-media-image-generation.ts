'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteAsset,
  fetchImageGenerationModels,
  listAssets,
  type GenerationProgress,
  type GenerationResult,
  type ImageGenerationModelIdWeb,
} from '@/lib/services/media-api'
import {
  DEFAULT_IMAGE_MODEL,
  FALLBACK_IMAGE_MODELS,
  IMAGE_MODEL_IDS,
  runMediaImageGeneration,
} from './media-image-generation-runner'
import type {
  CoverAspectRatio,
  MediaBatchImage,
  MediaGeneratedImage,
  MediaImageGenerationOverrides,
  UseMediaImageGenerationOptions,
} from './media-image-generation-types'

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
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModelIdWeb>(DEFAULT_IMAGE_MODEL)
  const [imageCount, setImageCount] = useState(1)
  const [availableModels, setAvailableModels] = useState<typeof FALLBACK_IMAGE_MODELS>([])
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
        const hasPreferred = list.some((m) => m.id === DEFAULT_IMAGE_MODEL)
        if (hasPreferred) {
          setSelectedModel(DEFAULT_IMAGE_MODEL)
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
        setSelectedModel(DEFAULT_IMAGE_MODEL)
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
        setPrompt('')
        onGenerationComplete?.({ url, assetId: id })
      }
    },
    [onGenerationComplete],
  )

  const generate = useCallback(
    async (overrides: MediaImageGenerationOverrides = {}) => {
      const p = (overrides.prompt ?? prompt).trim()
      const requestedAspectRatio = overrides.aspectRatio ?? aspectRatio
      if (!p || isGenerating) return

      setIsGenerating(true)
      setProgress(0)
      setProgressMessage('')
      setGeneratedImageUrl(null)
      setCurrentBatchImages([])
      setSelectedBatchIndex(0)

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
        await runMediaImageGeneration({
          prompt: p,
          aspectRatio: requestedAspectRatio,
          model: selectedModel,
          imageCount,
          referenceAssetId,
          campaignId,
          spaceId,
          extraTags,
          handlers: streamHandlers,
          signal: controller.signal,
        })
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
    },
    [
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
    ],
  )

  const handleGenerate = useCallback(() => generate(), [generate])

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
    generate,
    handleDeleteGeneratedImage,
    fetchCreations,
    referenceAssetId,
    referencePreviewUrl,
    setReference,
    clearReference,
  }
}
