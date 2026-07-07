'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Film, ImagePlus } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  createCreativeRepairFn,
  looksLikeInvalidCreativeTsx,
  SAFE_FALLBACK_AD_TSX,
} from '@/features/studio/lib/creative-tsx-validation'
import { createTsxRunnerScope } from '@/features/studio/lib/tsx-runner-scope'
import { useSelfHealingPreview } from '@/features/studio/lib/use-self-healing-preview'
import { stripCopyFromAdHeadline } from '@/features/studio/utils/ad-headline'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'
import type { Ad } from '../../../types'
import { placementDims, placementRatio, resolveAdImageUrl, resolveAdTsx } from './ad-preview.utils'
import { useDriveThumbnail } from './use-ad-drive-thumbnail'

const adRepairFn = createCreativeRepairFn()

function CreativeCarousel({ ad, placement }: { ad: Ad; placement: string }) {
  const ratio = placementRatio(placement)
  const cards = ad.carousel_cards ?? []
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const GAP = 8
  const CARD_WIDTH = 260

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const step = CARD_WIDTH + GAP
      const idx = Math.round(el.scrollLeft / step)
      setActiveIndex(Math.min(Math.max(0, idx), cards.length - 1))
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [cards.length])

  const scrollToIndex = (idx: number) => {
    const el = scrollRef.current
    if (!el) return
    const step = CARD_WIDTH + GAP
    el.scrollTo({ left: idx * step, behavior: 'smooth' })
    setActiveIndex(idx)
  }

  if (cards.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center bg-[#1a1a1a]"
        style={{ aspectRatio: ratio }}
      >
        <div className="flex flex-col items-center gap-2">
          <ImagePlus className="h-6 w-6 text-white/30" />
          <span className="text-sm text-white/40">Add carousel cards</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden bg-[#f0f2f5]">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto overscroll-x-contain px-2 py-2"
        style={{ scrollSnapType: 'x mandatory', scrollPaddingInline: 8 }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="flex w-[260px] flex-shrink-0 snap-center overflow-hidden rounded-lg border border-[#e4e6eb] bg-white shadow-sm"
          >
            <div className="flex flex-col">
              <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-[#1a1a1a]">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.headline || `Card ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-white/30" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                {card.headline && (
                  <p className="text-[14px] font-bold leading-tight text-[#050505]">
                    {card.headline}
                  </p>
                )}
                {card.description && (
                  <p className="line-clamp-2 text-[13px] text-[#65676b]">{card.description}</p>
                )}
                <div className="mt-1 flex justify-end">
                  {card.link ? (
                    <a
                      href={card.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-learn-more rounded-md bg-[#e4e6eb] px-3 py-1.5 text-[13px] font-semibold hover:bg-[#d8dadf]"
                    >
                      {ad.cta_text || 'Learn more'}
                    </a>
                  ) : (
                    <span className="link-learn-more rounded-md bg-[#e4e6eb] px-3 py-1.5 text-[13px] font-semibold">
                      {ad.cta_text || 'Learn more'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 py-2">
        {cards.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToIndex(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? 'w-4 bg-[#0095f6]' : 'w-1.5 bg-[#8e8e8e]'}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function TsxAdImage({
  tsx,
  placement,
  fallbackImageUrl,
}: {
  tsx: string
  placement: string
  fallbackImageUrl?: string | null
}) {
  const ratio = placementRatio(placement)
  const dims = placementDims(placement)
  const scope = useMemo(() => createTsxRunnerScope(), [])
  const shouldFallback = useCallback(
    (candidate: string) => looksLikeInvalidCreativeTsx(candidate),
    [],
  )
  const repairCode = useCallback(
    async (brokenCode: string, error: string) => adRepairFn(brokenCode, error),
    [],
  )
  const { resolvedCode, status } = useSelfHealingPreview({
    code: tsx,
    shouldFallback,
    fallbackCode: SAFE_FALLBACK_AD_TSX,
    maxAttempts: 3,
    repairCode,
  })
  const code = useMemo(
    () => `
${resolvedCode}
const W=${dims.width},H=${dims.height}
export default function AdFrame() {
  const C = typeof AdCreative !== 'undefined' ? AdCreative : null
  if (!C) return <div style={{ width: W, height: H, display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa' }}>No creative found</div>
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: W, height: H, transformOrigin: 'top left' }}>
        <C width={W} height={H} />
      </div>
    </div>
  )
}
`,
    [dims.height, dims.width, resolvedCode],
  )
  const { element, error } = useEsbuildRunner({ code, scope })

  if (status === 'validating' || status === 'fixing') {
    return (
      <div className="relative w-full overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: ratio }}>
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-xs text-white/50">Preparing preview...</span>
          {fallbackImageUrl ? (
            <img src={fallbackImageUrl} alt="Ad creative" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative w-full overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: ratio }}>
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <span className="text-xs text-red-400">TSX error</span>
          <span className="line-clamp-2 text-xs text-white/60">{String(error)}</span>
          {fallbackImageUrl ? (
            <img
              src={fallbackImageUrl}
              alt="Ad creative fallback"
              className="mt-2 max-h-24 max-w-full object-contain"
            />
          ) : null}
        </div>
      </div>
    )
  }

  if (!element) {
    return (
      <div className="relative w-full overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: ratio }}>
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-xs text-white/50">Rendering…</span>
          {fallbackImageUrl ? (
            <img src={fallbackImageUrl} alt="Ad creative" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: ratio }}>
      <div className="absolute inset-0">
        <style>
          {
            'html,body,#root{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent}'
          }
        </style>
        {element}
      </div>
    </div>
  )
}

export function CreativeMedia({ ad, placement }: { ad: Ad; placement: string }) {
  const ratio = placementRatio(placement)
  const driveThumbnail = useDriveThumbnail(ad)

  if (ad.ad_format === 'CAROUSEL') {
    return <CreativeCarousel ad={ad} placement={placement} />
  }

  const imageUrlRaw = resolveAdImageUrl(ad, placement)
  const tsx = resolveAdTsx(ad, placement)
  const fallbackImageUrl = imageUrlRaw || driveThumbnail
  const imageUrl =
    imageUrlRaw ||
    (ad.metadata?.drive_file_id && !ad.placement_images?.[placement]?.image_url
      ? driveThumbnail
      : null)
  const placementVideos = ad.metadata?.placement_videos as
    | Record<string, { video_url?: string }>
    | undefined
  const placementVideoUrl = placementVideos?.[placement]?.video_url ?? null
  const videoUrl =
    ad.ad_format === 'SINGLE_VIDEO' ? (placementVideoUrl ?? ad.video_url ?? null) : null

  if (videoUrl) {
    return (
      <div className="w-full overflow-hidden bg-black" style={{ aspectRatio: ratio }}>
        <video src={videoUrl} controls className="h-full w-full object-cover" />
      </div>
    )
  }
  if (ad.ad_format === 'SINGLE_VIDEO') {
    return (
      <div
        className="flex w-full items-center justify-center bg-[#1a1a1a]"
        style={{ aspectRatio: ratio }}
      >
        <div className="flex flex-col items-center gap-2">
          <Film className="h-6 w-6 text-white/30" />
          <span className="text-sm text-white/40">Add video</span>
        </div>
      </div>
    )
  }
  if (imageUrl) {
    return (
      <div className="w-full overflow-hidden bg-black" style={{ aspectRatio: ratio }}>
        <img
          src={imageUrl}
          alt={stripCopyFromAdHeadline(ad.headline) || 'Ad'}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }
  if (tsx) return <TsxAdImage tsx={tsx} placement={placement} fallbackImageUrl={fallbackImageUrl} />
  return (
    <div
      className="flex w-full items-center justify-center bg-[#1a1a1a]"
      style={{ aspectRatio: ratio }}
    >
      <div className="flex flex-col items-center gap-2">
        <ImagePlus className="h-6 w-6 text-white/30" />
        <span className="text-sm text-white/40">Drop image here</span>
      </div>
    </div>
  )
}

export function DropOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#7c3aed]/30">
      <ImagePlus className="h-10 w-10 text-white" />
      <span className="mt-2 text-sm font-semibold text-white">Drop to replace</span>
    </div>
  )
}

export function UploadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
      <VibeyLoadingOrb size="sm" text="Uploading..." />
    </div>
  )
}
