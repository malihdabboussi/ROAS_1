'use client'

import { useMemo } from 'react'
import { ImageIcon } from 'lucide-react'
import { createTsxRunnerScope } from '@/features/studio/lib/tsx-runner-scope'
import type { ScheduledSocialPost } from '@/features/studio/services/artifact-preview.service'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'

type AspectKey = '1:1' | '4:5' | '9:16' | '1.91:1'
type ThumbSize = 'xs' | 'sm' | 'md'

const SIZE_PX: Record<ThumbSize, number> = { xs: 16, sm: 22, md: 40 }

const THUMB_DIMENSIONS: Record<AspectKey, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1.91:1': { width: 1200, height: 627 },
}

function defaultAspectForPost(post: ScheduledSocialPost): AspectKey {
  if (post.post_type === 'text_only') return '4:5'
  if (post.post_type === 'story' || post.post_type === 'reel') return '9:16'
  if (post.post_type === 'single_image' || post.post_type === 'carousel') return '4:5'
  if (post.platform === 'linkedin') return '1.91:1'
  return '4:5'
}

function getThumbnailRenderSize(post: ScheduledSocialPost): { width: number; height: number } {
  const aspect = defaultAspectForPost(post)
  const base = THUMB_DIMENSIONS[aspect]
  const previewWidth =
    post.platform === 'linkedin' ? 420 : post.platform === 'instagram' ? 390 : 360
  const width = previewWidth
  const height = Math.round((previewWidth * base.height) / base.width)
  return { width, height }
}

function getThumbnailImage(row: ScheduledSocialPost): string | null {
  if (row.image_url) return row.image_url
  if (row.carousel_slides?.length) {
    const first = row.carousel_slides[0]
    if (first?.image_url) return first.image_url
  }
  return null
}

function getThumbnailTsx(row: ScheduledSocialPost): string | null {
  if (row.generated_tsx?.trim()) return row.generated_tsx
  if (row.carousel_slides?.length) {
    const first = row.carousel_slides[0]
    const tsx = typeof first?.tsx === 'string' ? first.tsx?.trim() : null
    if (tsx) return tsx
  }
  return null
}

function getTextSnippet(row: ScheduledSocialPost): string {
  const raw = row.caption?.trim() || row.headline?.trim() || ''
  return raw.slice(0, 24)
}

function TsxThumbnail({
  code,
  width,
  height,
  scale,
  px,
}: {
  code: string
  width: number
  height: number
  scale: number
  px: number
}) {
  const thumbWidth = Math.max(1, Math.round(width * scale))
  const thumbHeight = Math.max(1, Math.round(height * scale))
  const scope = useMemo(() => createTsxRunnerScope(), [])
  const appCode = useMemo(
    () => `
${code}
export default function VibeyThumbRoot() {
  const Component = typeof SocialCreative !== 'undefined' ? SocialCreative : typeof AdCreative !== 'undefined' ? AdCreative : null
  if (!Component) return <div style={{ width: '${width}px', height: '${height}px', display: 'grid', placeItems: 'center', background: 'var(--color-card)', color: 'var(--color-muted-foreground)' }} /> 
  return (
    <div data-vibey-thumb style={{ width: '${width}px', height: '${height}px', overflow: 'hidden', background: 'var(--color-card)' }}>
      <Component width={${width}} height={${height}} />
    </div>
  )
}
`,
    [code, width, height],
  )
  const { element, error } = useEsbuildRunner({ code: appCode, scope })
  if (error) {
    return (
      <div
        className="bg-muted flex items-center justify-center rounded-md"
        style={{ width: `${px}px`, height: `${px}px` }}
      >
        <ImageIcon className="icon-sm text-muted-foreground" />
      </div>
    )
  }
  return (
    <div
      className="bg-card overflow-hidden rounded-md"
      style={{ width: `${thumbWidth}px`, height: `${thumbHeight}px` }}
    >
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {element}
      </div>
    </div>
  )
}

function TextThumbnail({ row, px }: { row: ScheduledSocialPost; px: number }) {
  const snippet = getTextSnippet(row)
  const platformColor =
    row.platform === 'linkedin'
      ? 'bg-blue-500/15 text-blue-400'
      : 'bg-purple-500/15 text-purple-400'
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-md ${platformColor}`}
      style={{ width: `${px}px`, height: `${px}px` }}
    >
      {snippet ? (
        <span
          className="select-none overflow-hidden text-center font-medium leading-none opacity-70"
          style={{ fontSize: `${Math.max(4, px * 0.16)}px`, padding: '1px' }}
        >
          {snippet}
        </span>
      ) : (
        <ImageIcon style={{ width: `${px * 0.5}px`, height: `${px * 0.5}px` }} />
      )}
    </div>
  )
}

export function SchedulePostThumbnail({
  row,
  size = 'md',
}: {
  row: ScheduledSocialPost
  size?: ThumbSize
}) {
  const px = SIZE_PX[size]
  const img = getThumbnailImage(row)
  const tsx = getThumbnailTsx(row)
  const sizeClass = size === 'sm' ? 'rounded' : 'rounded-md'

  if (img) {
    return (
      <img
        src={img}
        alt=""
        className={`${sizeClass} object-cover`}
        style={{ width: `${px}px`, height: `${px}px` }}
      />
    )
  }
  if (tsx) {
    const { width, height } = getThumbnailRenderSize(row)
    const scale = Math.min(px / width, px / height)
    return <TsxThumbnail code={tsx} width={width} height={height} scale={scale} px={px} />
  }
  return <TextThumbnail row={row} px={px} />
}
