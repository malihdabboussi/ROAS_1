'use client'

import { useCallback, useMemo } from 'react'
import {
  createCreativeRepairFn,
  looksLikeInvalidCreativeTsx,
  SAFE_FALLBACK_SOCIAL_TSX,
} from '@/features/studio/lib/creative-tsx-validation'
import { createTsxRunnerScope } from '@/features/studio/lib/tsx-runner-scope'
import { useSelfHealingPreview } from '@/features/studio/lib/use-self-healing-preview'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'

const VIDEO_EXT_RE = /\.(mp4|mov|webm|ogg|m4v)(?:\?|$)/i

export function looksLikeVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url) || url.includes('/videos/')
}

export function SocialRasterVisual({
  videoUrl,
  imageUrl,
  width,
  height,
}: {
  videoUrl: string | null | undefined
  imageUrl: string | null | undefined
  width: number
  height: number
}) {
  const vid = typeof videoUrl === 'string' ? videoUrl.trim() : ''
  const img = typeof imageUrl === 'string' ? imageUrl.trim() : ''
  const effectiveVideo = vid || (img && looksLikeVideoUrl(img) ? img : '')
  const effectiveImage = effectiveVideo === img ? '' : img
  const ratioStyle = { aspectRatio: `${width}/${height}` } as const
  if (effectiveVideo) {
    return (
      <div className="relative w-full overflow-hidden" style={ratioStyle}>
        <video
          src={effectiveVideo}
          controls
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    )
  }
  if (effectiveImage) {
    return <img src={effectiveImage} alt="" className="w-full object-cover" style={ratioStyle} />
  }
  return null
}

const socialRepairFn = createCreativeRepairFn()

export function SocialTsxRenderer({
  code,
  width,
  height,
}: {
  code: string
  width: number
  height: number
}) {
  const scope = useMemo(() => createTsxRunnerScope(), [])
  const shouldFallback = useCallback(
    (candidate: string) => looksLikeInvalidCreativeTsx(candidate),
    [],
  )
  const repairCode = useCallback(
    async (brokenCode: string, error: string) => socialRepairFn(brokenCode, error),
    [],
  )
  const { resolvedCode, status } = useSelfHealingPreview({
    code,
    shouldFallback,
    fallbackCode: SAFE_FALLBACK_SOCIAL_TSX,
    maxAttempts: 3,
    repairCode,
  })
  const appCode = useMemo(
    () => `
${resolvedCode}
export default function VibeySocialRoot() {
  const Component = typeof SocialCreative !== 'undefined' ? SocialCreative : typeof AdCreative !== 'undefined' ? AdCreative : null
  if (!Component) return <div style={{ width: '${width}px', height: '${height}px', display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa' }}>No creative component found</div>
  return (
    <div data-vibey-social-root style={{ width: '100%', maxWidth: '${width}px', aspectRatio: '${width}/${height}', overflow: 'hidden' }}>
      <Component width={${width}} height={${height}} />
    </div>
  )
}
`,
    [resolvedCode, height, width],
  )
  const { element, error } = useEsbuildRunner({ code: appCode, scope })

  if (status === 'validating' || status === 'fixing') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 p-4 text-sm text-zinc-500">
        Preparing preview...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive flex h-full w-full items-center justify-center bg-zinc-900 p-4 text-sm">
        TSX Error: {String(error)}
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <style>{`html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }`}</style>
      {element}
    </div>
  )
}
