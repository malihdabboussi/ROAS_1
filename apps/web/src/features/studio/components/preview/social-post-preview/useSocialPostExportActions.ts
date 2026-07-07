import { useCallback, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { downloadCarouselAsPDF, downloadCarouselAsZIP } from '@/features/studio/lib/carousel-export'
import { downloadBlob, exportElementToPngBlob } from '@/features/studio/lib/png-export'
import type { SocialPost } from '../../../types'

interface SocialPostExportDimensions {
  width: number
  height: number
}

interface UseSocialPostExportActionsParams {
  post: SocialPost | null
  previewRef: RefObject<HTMLDivElement | null>
  setCarouselIndex: Dispatch<SetStateAction<number>>
  setPublishErrors: Dispatch<SetStateAction<string[]>>
  getExportDimensions: (post: SocialPost) => SocialPostExportDimensions
}

function getPostExportTitle(post: SocialPost): string {
  return post.caption?.split('\n')[0]?.slice(0, 60) || 'carousel'
}

async function renderCarouselSlideBlob({
  index,
  previewRef,
  setCarouselIndex,
}: {
  index: number
  previewRef: RefObject<HTMLDivElement | null>
  setCarouselIndex: Dispatch<SetStateAction<number>>
}): Promise<Blob> {
  setCarouselIndex(index)
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const currentPreview = previewRef.current
  if (!currentPreview) throw new Error('Failed to render slide')

  const target =
    (currentPreview.querySelector('[data-vibey-social-root]') as HTMLElement | null) ??
    currentPreview
  const blob = await exportElementToPngBlob(target, {
    scale: 4,
    useCORS: true,
    backgroundColor: null,
  })

  if (!blob) throw new Error('Failed to render slide')
  return blob
}

export function useSocialPostExportActions({
  post,
  previewRef,
  setCarouselIndex,
  setPublishErrors,
  getExportDimensions,
}: UseSocialPostExportActionsParams) {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingCarousel, setIsExportingCarousel] = useState(false)

  const handleExportPng = useCallback(async () => {
    if (isExporting || !previewRef.current) return
    setIsExporting(true)
    try {
      const target =
        (previewRef.current.querySelector('[data-vibey-social-root]') as HTMLElement | null) ??
        previewRef.current
      const blob = await exportElementToPngBlob(target)
      if (!blob) return
      downloadBlob(blob, `social-post-${post?.platform ?? 'export'}.png`)
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, post?.platform, previewRef])

  const handleExportCarouselPDF = useCallback(async () => {
    if (!post || isExportingCarousel || !previewRef.current) return
    const slides = post.carousel_slides ?? []
    if (slides.length === 0) return

    setIsExportingCarousel(true)
    try {
      await downloadCarouselAsPDF(
        getPostExportTitle(post),
        (index) => renderCarouselSlideBlob({ index, previewRef, setCarouselIndex }),
        slides.length,
        getExportDimensions(post),
      )
    } catch (err) {
      setPublishErrors([err instanceof Error ? err.message : 'Failed to export carousel as PDF'])
    } finally {
      setIsExportingCarousel(false)
    }
  }, [
    getExportDimensions,
    isExportingCarousel,
    post,
    previewRef,
    setCarouselIndex,
    setPublishErrors,
  ])

  const handleExportCarouselZIP = useCallback(async () => {
    if (!post || isExportingCarousel || !previewRef.current) return
    const slides = post.carousel_slides ?? []
    if (slides.length === 0) return

    setIsExportingCarousel(true)
    try {
      await downloadCarouselAsZIP(
        getPostExportTitle(post),
        (index) => renderCarouselSlideBlob({ index, previewRef, setCarouselIndex }),
        slides.length,
      )
    } catch (err) {
      setPublishErrors([err instanceof Error ? err.message : 'Failed to export carousel as ZIP'])
    } finally {
      setIsExportingCarousel(false)
    }
  }, [isExportingCarousel, post, previewRef, setCarouselIndex, setPublishErrors])

  return {
    isExporting,
    isExportingCarousel,
    handleExportPng,
    handleExportCarouselPDF,
    handleExportCarouselZIP,
  }
}
