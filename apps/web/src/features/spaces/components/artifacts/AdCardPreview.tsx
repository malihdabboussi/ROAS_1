'use client'

import { LayoutTemplate } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { SocialPostMiniCreative } from '@/components/artifacts/SocialPostMiniCreative'
import type { Ad } from '@/lib/artifacts/artifact-types'

const VIDEO_EXT_RE = /\.(mp4|mov|webm|ogg|m4v)(?:\?|$)/i

function looksLikeVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url) || url.includes('/videos/')
}

const PREVIEW_W = 390
const PREVIEW_H = Math.round(PREVIEW_W * (5 / 4))

function getRasterImageUrl(ad: Ad): string | null {
  const top = typeof ad.image_url === 'string' ? ad.image_url.trim() : ''
  if (top && !looksLikeVideoUrl(top)) return top
  const cards = ad.carousel_cards
  if (!cards?.length) return null
  for (const c of cards) {
    const u = typeof c?.image_url === 'string' ? c.image_url.trim() : ''
    if (u && !looksLikeVideoUrl(u)) return u
  }
  return null
}

function getRasterVideoUrl(ad: Ad): string | null {
  const v = typeof ad.video_url === 'string' ? ad.video_url.trim() : ''
  if (v) return v
  const topImg = typeof ad.image_url === 'string' ? ad.image_url.trim() : ''
  if (topImg && looksLikeVideoUrl(topImg)) return topImg
  const cards = ad.carousel_cards ?? []
  for (const c of cards) {
    const img = typeof c?.image_url === 'string' ? c.image_url.trim() : ''
    if (img && looksLikeVideoUrl(img)) return img
  }
  return null
}

function getCreativeTsx(ad: Ad): string | null {
  if (ad.generated_tsx?.trim()) return ad.generated_tsx.trim()
  const placementTsx = ad.placement_tsx ?? {}
  for (const k of Object.keys(placementTsx)) {
    const t = typeof placementTsx[k] === 'string' ? placementTsx[k].trim() : ''
    if (t) return t
  }
  return null
}

function TsxCreativeCoverSquare({ code }: { code: string }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.35)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    const run = () => {
      const cr = el.getBoundingClientRect()
      const cw = Math.max(1, cr.width)
      const ch = Math.max(1, cr.height)
      const sc = Math.max(cw / PREVIEW_W, ch / PREVIEW_H)
      setScale(sc)
      setOffset({ x: (cw - PREVIEW_W * sc) / 2, y: (ch - PREVIEW_H * sc) / 2 })
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={shellRef} className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--color-hover-subtle)]">
      <div
        className="pointer-events-none absolute overflow-hidden border-0"
        style={{
          left: offset.x,
          top: offset.y,
          width: PREVIEW_W,
          height: PREVIEW_H,
          transform: scale > 0 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <SocialPostMiniCreative code={code} width={PREVIEW_W} height={PREVIEW_H} />
      </div>
    </div>
  )
}

export function AdCardPreview({ ad }: { ad: Ad }) {
  const rasterImg = getRasterImageUrl(ad)
  const rasterVid = rasterImg ? null : getRasterVideoUrl(ad)
  const tsxCode = rasterImg || rasterVid ? null : getCreativeTsx(ad)

  return (
    <div className="relative aspect-square w-full shrink-0 overflow-hidden border-b border-[var(--border)] bg-[var(--color-hover-subtle)]">
      <div className="absolute inset-0 min-h-0 min-w-0">
        {rasterImg ? (
          <img src={rasterImg} alt="" className="h-full w-full object-cover" />
        ) : rasterVid ? (
          <video
            src={rasterVid}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            aria-hidden
          />
        ) : tsxCode ? (
          <TsxCreativeCoverSquare code={tsxCode} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LayoutTemplate className="h-6 w-6 animate-pulse text-[var(--color-muted-foreground)]" />
          </div>
        )}
      </div>
    </div>
  )
}
