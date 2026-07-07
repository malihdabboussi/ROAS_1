'use client'

import { useEffect, useState } from 'react'
import {
  injectPresentationRenderTheme,
  resolvePresentationRenderTheme,
} from '@/lib/presentations/presentation-render-theme.util'
import { buildPresentationSlideThumbnailSrcDoc } from '@/lib/presentations/presentation-slide-thumbnail.util'
import { fetchPresentation, fetchPresentationBundle } from '@/lib/artifacts'
import { usePresentationLiveThemeStore } from '@/lib/presentations/presentation-live-theme-store'

type PresentationPreviewPayload = { mode: 'tsx'; code: string } | { mode: 'html'; srcDoc: string }

export function usePresentationHtml(artifactId: string): PresentationPreviewPayload | null {
  const livePresentationId = usePresentationLiveThemeStore((s) => s.presentationId)
  const liveThemeCss = usePresentationLiveThemeStore((s) => s.liveThemeCss)
  const liveThemeFontsUrl = usePresentationLiveThemeStore((s) => s.liveThemeFontsUrl)
  const liveThemeNonce = usePresentationLiveThemeStore((s) => s.liveThemeNonce)
  const [presentation, setPresentation] = useState<
    { mode: 'tsx'; code: string } | { mode: 'html'; srcDoc: string } | null
  >(null)
  const [htmlBundleSrcDoc, setHtmlBundleSrcDoc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtmlBundleSrcDoc(null)
    ;(async () => {
      const bundle = await fetchPresentationBundle(artifactId)
      if (cancelled) return
      if (bundle.source_mode === 'html_bundle' && bundle.has_entry) {
        const renderTheme = await resolvePresentationRenderTheme(bundle)
        if (cancelled) return
        const thumbDoc = buildPresentationSlideThumbnailSrcDoc(bundle, 0)
        if (!thumbDoc) return
        const srcDoc = injectPresentationRenderTheme(thumbDoc, renderTheme)
        setHtmlBundleSrcDoc(thumbDoc)
        setPresentation({ mode: 'html', srcDoc })
        return
      }
      const row = await fetchPresentation(artifactId)
      if (cancelled || !row?.generated_html) return
      setPresentation({ mode: 'tsx', code: row.generated_html })
    })().catch(() => {
      if (!cancelled) setPresentation(null)
    })
    return () => {
      cancelled = true
    }
  }, [artifactId])

  useEffect(() => {
    if (livePresentationId !== artifactId || !htmlBundleSrcDoc || !liveThemeCss) return
    const srcDoc = injectPresentationRenderTheme(htmlBundleSrcDoc, {
      css: liveThemeCss,
      fontsUrl: liveThemeFontsUrl,
    })
    setPresentation({ mode: 'html', srcDoc })
  }, [
    artifactId,
    htmlBundleSrcDoc,
    livePresentationId,
    liveThemeCss,
    liveThemeFontsUrl,
    liveThemeNonce,
  ])

  return presentation
}
