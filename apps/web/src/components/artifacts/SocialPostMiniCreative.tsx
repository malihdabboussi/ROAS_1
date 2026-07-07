'use client'

import { useCallback, useMemo } from 'react'
import {
  looksLikeInvalidCreativeTsx,
  SAFE_FALLBACK_SOCIAL_TSX,
} from '@/lib/tsx-runner/creative-tsx-validation'
import { createTsxRunnerScope } from '@/lib/tsx-runner/tsx-runner-scope'
import { useSelfHealingPreview } from '@/lib/tsx-runner/use-self-healing-preview'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'

export function SocialPostMiniCreative({
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
  const { resolvedCode } = useSelfHealingPreview({
    code,
    shouldFallback,
    fallbackCode: SAFE_FALLBACK_SOCIAL_TSX,
    maxAttempts: 1,
  })
  const appCode = useMemo(
    () =>
      `${resolvedCode}\nexport default function VibeySocialRoot() {\n  const C = typeof SocialCreative !== 'undefined' ? SocialCreative : typeof AdCreative !== 'undefined' ? AdCreative : null\n  if (!C) return null\n  return <div data-vibey-social-root style={{width:'100%',maxWidth:'${width}px',aspectRatio:'${width}/${height}',overflow:'hidden'}}><C width={${width}} height={${height}} /></div>\n}`,
    [resolvedCode, width, height],
  )
  const { element } = useEsbuildRunner({ code: appCode, scope })
  return <>{element}</>
}
