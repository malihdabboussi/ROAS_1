'use client'

import type { ReactNode, RefObject } from 'react'
import { FolderOpen, Upload } from 'lucide-react'
import type { SocialPost } from '../../../types'
import {
  looksLikeVideoUrl,
  SocialRasterVisual,
  SocialTsxRenderer,
} from './SocialPostVisualRenderers'

interface BuildSocialPostVisualPresentationParams {
  post: SocialPost
  carouselSlides: NonNullable<SocialPost['carousel_slides']>
  safeCarouselIndex: number
  isCarousel: boolean
  width: number
  height: number
  previewRef: RefObject<HTMLDivElement | null>
  mediaUploading: boolean
  openFilePicker: (kind: 'video' | 'image') => void
  openLibraryPicker: () => void
}

interface SocialPostVisualPresentation {
  hasTsx: boolean
  hasVideo: boolean
  hasImage: boolean
  carouselSlideElements: ReactNode[] | undefined
  singleVisualContent: ReactNode | null
}

export function buildSocialPostVisualPresentation({
  post,
  carouselSlides,
  safeCarouselIndex,
  isCarousel,
  width,
  height,
  previewRef,
  mediaUploading,
  openFilePicker,
  openLibraryPicker,
}: BuildSocialPostVisualPresentationParams): SocialPostVisualPresentation {
  const hasTsx = Boolean(
    (isCarousel
      ? typeof carouselSlides[safeCarouselIndex]?.tsx === 'string'
        ? carouselSlides[safeCarouselIndex].tsx
        : null
      : post.generated_tsx
    )?.trim(),
  )
  const rawImage = post.image_url?.trim() ?? ''
  const rawVideo = post.video_url?.trim() ?? ''
  const hasVideo = Boolean(rawVideo || (rawImage && looksLikeVideoUrl(rawImage)))
  const hasImage = Boolean(rawImage && !looksLikeVideoUrl(rawImage))

  const carouselSlideElements =
    isCarousel && carouselSlides.length > 1
      ? carouselSlides.map((slide, index) => {
          const tsx = typeof slide.tsx === 'string' ? slide.tsx.trim() : null
          const img = typeof slide.image_url === 'string' ? slide.image_url.trim() : null
          const vid = typeof slide.video_url === 'string' ? slide.video_url.trim() : null
          if (tsx) return <SocialTsxRenderer key={index} code={tsx} width={width} height={height} />
          if (vid || img)
            return (
              <SocialRasterVisual
                key={index}
                videoUrl={vid}
                imageUrl={img}
                width={width}
                height={height}
              />
            )
          return (
            <div
              key={index}
              className="flex w-full items-center justify-center bg-zinc-800 text-sm text-zinc-500"
              style={{ aspectRatio: `${width}/${height}` }}
            >
              No visual
            </div>
          )
        })
      : undefined

  const singleVisualContent =
    isCarousel && carouselSlideElements
      ? null
      : buildSingleVisualContent({
          post,
          carouselSlides,
          safeCarouselIndex,
          isCarousel,
          width,
          height,
          previewRef,
          hasVideo,
          hasImage,
          mediaUploading,
          openFilePicker,
          openLibraryPicker,
        })

  return {
    hasTsx,
    hasVideo,
    hasImage,
    carouselSlideElements,
    singleVisualContent,
  }
}

function buildSingleVisualContent({
  post,
  carouselSlides,
  safeCarouselIndex,
  isCarousel,
  width,
  height,
  previewRef,
  hasVideo,
  hasImage,
  mediaUploading,
  openFilePicker,
  openLibraryPicker,
}: BuildSocialPostVisualPresentationParams & { hasVideo: boolean; hasImage: boolean }) {
  const activeTsx = isCarousel
    ? typeof carouselSlides[safeCarouselIndex]?.tsx === 'string'
      ? carouselSlides[safeCarouselIndex].tsx
      : null
    : post.generated_tsx
  const activeImg = isCarousel
    ? typeof carouselSlides[safeCarouselIndex]?.image_url === 'string'
      ? carouselSlides[safeCarouselIndex].image_url
      : null
    : null
  const activeVid = isCarousel
    ? typeof carouselSlides[safeCarouselIndex]?.video_url === 'string'
      ? carouselSlides[safeCarouselIndex].video_url
      : null
    : null
  if (activeTsx?.trim())
    return (
      <div ref={previewRef}>
        <SocialTsxRenderer code={activeTsx} width={width} height={height} />
      </div>
    )
  if (activeVid?.trim() || activeImg?.trim())
    return (
      <div ref={previewRef}>
        <SocialRasterVisual
          videoUrl={activeVid}
          imageUrl={activeImg}
          width={width}
          height={height}
        />
      </div>
    )
  if (hasVideo || hasImage)
    return (
      <div ref={previewRef}>
        <SocialRasterVisual
          videoUrl={post.video_url}
          imageUrl={post.image_url}
          width={width}
          height={height}
        />
      </div>
    )
  if (post.post_type === 'text_only') return null
  return (
    <div
      ref={previewRef}
      className="gap-spacing-2 flex aspect-square w-full flex-col items-center justify-center bg-zinc-800 p-4 text-sm text-zinc-500"
    >
      <div className="body-3 text-zinc-400">No visual content yet</div>
      <div className="gap-spacing-2 flex flex-wrap items-center justify-center">
        <button
          type="button"
          onClick={() => openFilePicker('video')}
          disabled={mediaUploading}
          className="chip-glass-on-dark-surface rounded-spacing-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <Upload className="icon-xs" /> Upload video
        </button>
        <button
          type="button"
          onClick={() => openFilePicker('image')}
          disabled={mediaUploading}
          className="chip-glass-on-dark-surface rounded-spacing-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <Upload className="icon-xs" /> Upload image
        </button>
        <button
          type="button"
          onClick={() => openLibraryPicker()}
          disabled={mediaUploading}
          className="chip-glass-on-dark-surface rounded-spacing-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <FolderOpen className="icon-xs" /> Media library
        </button>
      </div>
    </div>
  )
}
