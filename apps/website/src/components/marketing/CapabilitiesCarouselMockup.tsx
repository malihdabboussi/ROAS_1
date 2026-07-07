'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAPABILITIES_CAROUSEL_META_CREATIVE_SRC,
  CompetitorReportPreview,
  FunnelRegisterPagePreview,
  MetaAdsInstagramFeedPreview,
  PresentationDeckPreview,
  SequenceEmailPreview,
  SocialPostPreview,
  StudioSkillChatPreview,
} from './CapabilitiesCarouselPreviews'

/**
 * Video Generated Preview - specific for capabilities mockup.
 * Embedded here since it requires custom assets.
 */
function VideoGeneratedPreview() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <img
        src={CAPABILITIES_CAROUSEL_META_CREATIVE_SRC}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        decoding="async"
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

const CAPABILITIES = [
  {
    id: 'funnel',
    label: 'Published Funnel',
    preview: <FunnelRegisterPagePreview />,
  },
  {
    id: 'social',
    label: 'Social Carousel',
    preview: <SocialPostPreview />,
  },
  {
    id: 'meta-ads',
    label: 'Meta Ads',
    preview: <MetaAdsInstagramFeedPreview />,
  },
  {
    id: 'email',
    label: 'Email Sequence',
    preview: <SequenceEmailPreview />,
  },
  {
    id: 'financial',
    label: 'Strategy PDF',
    preview: <CompetitorReportPreview />,
  },
  {
    id: 'presentation',
    label: 'Slide Deck',
    preview: <PresentationDeckPreview />,
  },
  {
    id: 'video',
    label: 'Video Creation',
    preview: <VideoGeneratedPreview />,
  },
  {
    id: 'skill',
    label: 'Agent Skill',
    preview: <StudioSkillChatPreview />,
  },
]

const SWIPE_THRESHOLD_PX = 48

export function CapabilitiesCarouselMockup() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const total = CAPABILITIES.length
  const dragStartXRef = useRef<number | null>(null)

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  useEffect(() => {
    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [goNext])

  const onPointerDownCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragStartXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const startX = dragStartXRef.current
      dragStartXRef.current = null
      if (startX === null) return
      const dx = e.clientX - startX
      if (dx > SWIPE_THRESHOLD_PX) {
        goPrev()
      } else if (dx < -SWIPE_THRESHOLD_PX) {
        goNext()
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    },
    [goNext, goPrev],
  )

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStartXRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative z-0 flex h-[400px] w-full cursor-grab touch-pan-y select-none items-center justify-center overflow-visible [perspective:1200px] active:cursor-grabbing md:h-[600px]"
        onPointerDownCapture={onPointerDownCapture}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {CAPABILITIES.map((cap, index) => {
          const offset = index - currentIndex
          let pos = ((offset % total) + total) % total
          if (pos > Math.floor(total / 2)) pos = pos - total

          const isCenter = pos === 0
          const isAdjacent = Math.abs(pos) === 1

          return (
            <div
              key={cap.id}
              className="absolute flex items-center justify-center transition-all duration-500 ease-in-out"
              style={{
                width: 'min(90%, 400px)',
                transform: `translateX(${pos * 60}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -10}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                pointerEvents: isCenter ? 'auto' : 'none',
              }}
            >
              <div className="glass-card relative flex w-full flex-col overflow-visible rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                <div className="relative h-[370px] w-full overflow-hidden rounded-2xl md:h-[580px]">
                  {cap.preview}
                </div>
                <div
                  className="pointer-events-none absolute left-1/2 top-0 z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-md md:left-auto md:right-0 md:top-0 md:translate-x-1/2"
                  style={{
                    rotate: '3deg',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-white">
                    {cap.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
