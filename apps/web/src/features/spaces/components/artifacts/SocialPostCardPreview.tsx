'use client'

import { LayoutTemplate } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { SocialPostMiniCreative } from '@/components/artifacts/SocialPostMiniCreative'
import type { SocialPost } from '@/lib/artifacts/artifact-types'

export const SOCIAL_POST_PLATFORM_IMG: Record<SocialPost['platform'], string> = {
  instagram: '/Integrations/Instagram.png',
  linkedin: '/Integrations/LinkedIn.png',
}

export function socialPostPlatformIconSrc(platform: SocialPost['platform']): string {
  return SOCIAL_POST_PLATFORM_IMG[platform] ?? SOCIAL_POST_PLATFORM_IMG.instagram
}

const VIDEO_EXT_RE = /\.(mp4|mov|webm|ogg|m4v)(?:\?|$)/i

function looksLikeVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url) || url.includes('/videos/')
}

type AspectKey = '1:1' | '4:5' | '9:16' | '1.91:1'

const PREVIEW_DIMENSIONS: Record<AspectKey, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1.91:1': { width: 1200, height: 627 },
}

function defaultAspectForPost(post: SocialPost): AspectKey {
  if (post.post_type === 'text_only') return '4:5'
  if (post.post_type === 'story' || post.post_type === 'reel') return '9:16'
  if (post.post_type === 'single_image' || post.post_type === 'carousel') return '4:5'
  if (post.platform === 'linkedin') return '1.91:1'
  return '4:5'
}

/** Same logic as `/schedule/schedule-thumbnail` + `/preview/SocialPostPreview` sizing. */
function getCreativeRenderSize(post: SocialPost): { width: number; height: number } {
  const aspect = defaultAspectForPost(post)
  const base = PREVIEW_DIMENSIONS[aspect]
  const previewWidth = post.platform === 'linkedin' ? 460 : post.platform === 'instagram' ? 390 : 360
  const width = previewWidth
  const height = Math.round((previewWidth * base.height) / base.width)
  return { width, height }
}

function getRasterImageUrl(post: SocialPost): string | null {
  const top = typeof post.image_url === 'string' ? post.image_url.trim() : ''
  if (top && !looksLikeVideoUrl(top)) return top
  const slides = post.carousel_slides
  if (!slides?.length) return null
  for (const s of slides) {
    const u = typeof s?.image_url === 'string' ? s.image_url.trim() : ''
    if (u && !looksLikeVideoUrl(u)) return u
  }
  return null
}

function getRasterVideoUrl(post: SocialPost): string | null {
  const pv = typeof post.video_url === 'string' ? post.video_url.trim() : ''
  if (pv) return pv
  const slides = post.carousel_slides ?? []
  for (const s of slides) {
    const v = typeof s?.video_url === 'string' ? s.video_url.trim() : ''
    if (v) return v
    const img = typeof s?.image_url === 'string' ? s.image_url.trim() : ''
    if (img && looksLikeVideoUrl(img)) return img
  }
  const topImg = typeof post.image_url === 'string' ? post.image_url.trim() : ''
  if (topImg && looksLikeVideoUrl(topImg)) return topImg
  return null
}

function getCreativeTsx(post: SocialPost): string | null {
  if (post.generated_tsx?.trim()) return post.generated_tsx.trim()
  const slides = post.carousel_slides
  if (!slides?.length) return null
  for (const s of slides) {
    const t = typeof s.tsx === 'string' ? s.tsx.trim() : ''
    if (t) return t
  }
  return null
}

function TsxCreativeCoverSquare({
  post,
  code,
}: {
  post: SocialPost
  code: string
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const { width: vw, height: vh } = getCreativeRenderSize(post)
  const [scale, setScale] = useState(0.35)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    const run = () => {
      const cr = el.getBoundingClientRect()
      const cw = Math.max(1, cr.width)
      const ch = Math.max(1, cr.height)
      const sc = Math.max(cw / vw, ch / vh)
      setScale(sc)
      setOffset({ x: (cw - vw * sc) / 2, y: (ch - vh * sc) / 2 })
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [vh, vw])

  return (
    <div ref={shellRef} className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--color-hover-subtle)]">
      <div
        className="pointer-events-none absolute overflow-hidden border-0"
        style={{
          left: offset.x,
          top: offset.y,
          width: vw,
          height: vh,
          transform: scale > 0 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <SocialPostMiniCreative code={code} width={vw} height={vh} />
      </div>
    </div>
  )
}

export function SocialPostCardPreview({ post }: { post: SocialPost }) {
  const rasterImg = getRasterImageUrl(post)
  const rasterVid = rasterImg ? null : getRasterVideoUrl(post)
  const tsxCode = rasterImg || rasterVid ? null : getCreativeTsx(post)

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
          <TsxCreativeCoverSquare post={post} code={tsxCode} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LayoutTemplate className="h-6 w-6 animate-pulse text-[var(--color-muted-foreground)]" />
          </div>
        )}
      </div>
    </div>
  )
}
