'use client'

import { useEffect, useState } from 'react'
import {
  injectPresentationRenderTheme,
  resolvePresentationRenderTheme,
} from '@/lib/presentations/presentation-render-theme.util'
import { buildPresentationSlideThumbnailSrcDoc } from '@/lib/presentations/presentation-slide-thumbnail.util'
import {
  fetchPresentationBundleCached,
  fetchPresentationCached,
} from '@/lib/artifacts/artifact-preview-api'
import { usePresentationLiveThemeStore } from '@/lib/presentations/presentation-live-theme-store'
import type { Presentation } from '@/lib/artifacts/artifact-types'

export type PresentationCardPreviewPayload =
  | { mode: 'tsx'; code: string; css: string }
  | { mode: 'html'; srcDoc: string }
  | { mode: 'iframe'; url: string }

function resolvePresentationHeroPayload(p: Presentation): PresentationCardPreviewPayload | null {
  if (p.generated_html?.trim()) {
    return { mode: 'tsx', code: p.generated_html, css: '' }
  }
  if (p.file_url?.trim()) {
    return { mode: 'iframe', url: p.file_url }
  }
  const slides = Array.isArray(p.slides) ? p.slides : []
  const tsxSlide = slides.find(
    (s): s is Record<string, unknown> & { type: 'tsx'; content?: string; body?: string } =>
      (s as Record<string, unknown>)?.type === 'tsx',
  )
  const tsxCode =
    tsxSlide &&
    (typeof tsxSlide.content === 'string'
      ? tsxSlide.content
      : typeof tsxSlide.body === 'string'
        ? tsxSlide.body
        : '')
  if (tsxCode) {
    return { mode: 'tsx', code: tsxCode, css: '' }
  }
  return null
}

/** Resolve TSX/HTML slide, packaged HTML URL, or first TSX slide — for Spaces grid hero (same idea as funnel first page). */
export function usePresentationCardPreview(presentationId: string): {
  payload: PresentationCardPreviewPayload | null
  loading: boolean
} {
  const livePresentationId = usePresentationLiveThemeStore((s) => s.presentationId)
  const liveThemeCss = usePresentationLiveThemeStore((s) => s.liveThemeCss)
  const liveThemeFontsUrl = usePresentationLiveThemeStore((s) => s.liveThemeFontsUrl)
  const liveThemeNonce = usePresentationLiveThemeStore((s) => s.liveThemeNonce)
  const [payload, setPayload] = useState<PresentationCardPreviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [htmlBundleSrcDoc, setHtmlBundleSrcDoc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setHtmlBundleSrcDoc(null)
    const load = async () => {
      try {
        // Cached per presentation — card hero, slide-over and full mode share
        // one bundle download instead of fetching it up to 3×.
        const bundle = await fetchPresentationBundleCached(presentationId)
        if (cancelled) return
        if (bundle.source_mode === 'html_bundle' && bundle.has_entry) {
          const renderTheme = await resolvePresentationRenderTheme(bundle)
          if (cancelled) return
          const thumbDoc = buildPresentationSlideThumbnailSrcDoc(bundle, 0)
          if (!thumbDoc) {
            setPayload(null)
            return
          }
          const srcDoc = injectPresentationRenderTheme(thumbDoc, renderTheme)
          setHtmlBundleSrcDoc(thumbDoc)
          setPayload({ mode: 'html', srcDoc })
          return
        }
        const p = await fetchPresentationCached(presentationId)
        if (cancelled) return
        setPayload(resolvePresentationHeroPayload(p))
      } catch {
        if (!cancelled) setPayload(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [presentationId])

  useEffect(() => {
    if (livePresentationId !== presentationId || !htmlBundleSrcDoc || !liveThemeCss) return
    const srcDoc = injectPresentationRenderTheme(htmlBundleSrcDoc, {
      css: liveThemeCss,
      fontsUrl: liveThemeFontsUrl,
    })
    setPayload({ mode: 'html', srcDoc })
  }, [
    htmlBundleSrcDoc,
    livePresentationId,
    liveThemeCss,
    liveThemeFontsUrl,
    liveThemeNonce,
    presentationId,
  ])

  return { payload, loading }
}
