'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { buildPresentationHtmlSrcDoc } from '@/lib/presentations/presentation-html-srcdoc'
import { buildEditorBridgeScript, injectEditorBridge } from '../../lib/html-bundle-bridge'
import { injectPresentationRenderTheme } from '../../lib/presentation-render-theme.util'
import { usePresentationFullModeStore } from '../../store/use-presentation-full-mode-store'
import type {
  PresentationBundle,
  PresentationEditMode,
  PresentationElementTrace,
  PresentationMarkupStrokePoint,
} from '../../types'
import type { ViewportSize } from './SandpackPreview'

interface PresentationHtmlPreviewProps {
  bundle: PresentationBundle
  title?: string | null
  viewport?: ViewportSize
  /** Keep bridge script in srcDoc so mode switches use postMessage instead of iframe remounts. */
  bridgeEnabled?: boolean
  editMode?: PresentationEditMode
  activeSlideIndex?: number | null
  onElementSelect?: (trace: PresentationElementTrace) => void
  onSlideChange?: (index: number | null) => void
  onDrawingEvent?: (
    phase: 'start' | 'move' | 'end',
    point: PresentationMarkupStrokePoint | null,
  ) => void
  initialThemeCss?: string | null
  initialThemeFontsUrl?: string | null
}

function injectBridge(
  srcDoc: string,
  presentationId: string,
  enabled: boolean,
  initialMode: PresentationEditMode,
): string {
  if (!enabled) return srcDoc
  const bridge = buildEditorBridgeScript({
    messagePrefix: 'presentation',
    artifactIdField: 'presentation_id',
    artifactId: presentationId,
    initialMode,
  })
  return injectEditorBridge(srcDoc, bridge)
}

export function PresentationHtmlPreview({
  bundle,
  title,
  viewport: _viewport,
  bridgeEnabled = false,
  editMode = 'preview',
  activeSlideIndex = null,
  onElementSelect,
  onSlideChange,
  onDrawingEvent,
  initialThemeCss = null,
  initialThemeFontsUrl = null,
}: PresentationHtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const liveStyles = usePresentationFullModeStore((s) => s.liveStyles)
  const liveStyleNonce = usePresentationFullModeStore((s) => s.liveStyleNonce)
  const liveThemeCss = usePresentationFullModeStore((s) => s.liveThemeCss)
  const liveThemeFontsUrl = usePresentationFullModeStore((s) => s.liveThemeFontsUrl)
  const liveThemeNonce = usePresentationFullModeStore((s) => s.liveThemeNonce)
  const baseHtml = useMemo(() => buildPresentationHtmlSrcDoc(bundle), [bundle])
  const initiallyThemedHtml = useMemo(
    () =>
      injectPresentationRenderTheme(
        baseHtml,
        initialThemeCss ? { css: initialThemeCss, fontsUrl: initialThemeFontsUrl } : null,
      ),
    [baseHtml, initialThemeCss, initialThemeFontsUrl],
  )
  const presentationId = bundle.presentation.id

  const fullModeSrcDoc = useMemo(
    () => injectBridge(initiallyThemedHtml, presentationId, true, 'preview'),
    [initiallyThemedHtml, bridgeEnabled, presentationId],
  )

  const slideOverEditSrcDoc = useMemo(() => {
    if (editMode === 'preview') return initiallyThemedHtml
    return injectBridge(initiallyThemedHtml, presentationId, true, editMode)
  }, [initiallyThemedHtml, editMode, presentationId])

  const srcDoc = bridgeEnabled ? fullModeSrcDoc : slideOverEditSrcDoc

  const postJumpSlide = useCallback((index: number | null | undefined) => {
    if (index == null) return
    iframeRef.current?.contentWindow?.postMessage({ type: 'presentation:jump-slide', index }, '*')
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    iframe?.contentWindow?.postMessage({ type: 'presentation:set-mode', mode: editMode }, '*')
  }, [editMode, srcDoc])

  useEffect(() => {
    postJumpSlide(activeSlideIndex)
  }, [activeSlideIndex, postJumpSlide, srcDoc])

  useEffect(() => {
    if (!bridgeEnabled) return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ presentationId?: string; index?: number }>).detail
      if (detail?.presentationId !== presentationId || detail.index == null) return
      postJumpSlide(detail.index)
    }
    window.addEventListener('presentation-editor:jump-slide', handler)
    return () => window.removeEventListener('presentation-editor:jump-slide', handler)
  }, [bridgeEnabled, postJumpSlide, presentationId])

  useEffect(() => {
    if (!bridgeEnabled || !liveStyles) return
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'presentation:apply-style', styles: liveStyles },
      '*',
    )
  }, [bridgeEnabled, liveStyleNonce, liveStyles])

  useEffect(() => {
    // #region debug-log - H2/H3: parent send of apply-theme-css to main iframe
    fetch('http://127.0.0.1:7242/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesis: 'H2',
        location: 'PresentationHtmlPreview.tsx:apply-theme-css-effect',
        message:
          !bridgeEnabled || liveThemeCss == null
            ? 'apply-theme-css SKIPPED (bridge off or css null)'
            : 'apply-theme-css POSTED to main iframe',
        data: {
          bridgeEnabled,
          cssLen: liveThemeCss?.length ?? null,
          initialCssLen: initialThemeCss?.length ?? null,
          nonce: liveThemeNonce,
          hasContentWindow: Boolean(iframeRef.current?.contentWindow),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    if (!bridgeEnabled || liveThemeCss == null) return
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'presentation:apply-theme-css', css: liveThemeCss, fontsUrl: liveThemeFontsUrl },
      '*',
    )
  }, [bridgeEnabled, liveThemeNonce, liveThemeCss, liveThemeFontsUrl, presentationId, srcDoc])

  useEffect(() => {
    if (!bridgeEnabled) return
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          presentationId?: string
          domPath?: string | null
          styles?: Record<string, string>
        }>
      ).detail
      if (detail?.presentationId !== presentationId || !detail.styles) return
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'presentation:apply-style',
          domPath: detail.domPath ?? null,
          styles: detail.styles,
        },
        '*',
      )
    }
    window.addEventListener('presentation-editor:apply-live-styles', handler)
    return () => window.removeEventListener('presentation-editor:apply-live-styles', handler)
  }, [bridgeEnabled, presentationId])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        trace?: PresentationElementTrace
        phase?: 'start' | 'move' | 'end'
        point?: PresentationMarkupStrokePoint | null
      }
      if (data?.type === 'presentation:viewport-ready') {
        postJumpSlide(activeSlideIndex)
      }
      if (data?.type === 'presentation:element-clicked' && data.trace) {
        onElementSelect?.(data.trace)
        onSlideChange?.(data.trace.slide_index)
      }
      if (data?.type === 'presentation:drawing' && data.phase) {
        onDrawingEvent?.(data.phase, data.point ?? null)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [activeSlideIndex, onDrawingEvent, onElementSelect, onSlideChange, postJumpSlide])

  return (
    <iframe
      ref={iframeRef}
      key={`${bundle.presentation.id}:${bundle.entry_file}:${bundle.files.length}:${bundle.assets.length}:${bridgeEnabled ? 'bridge' : 'plain'}`}
      title={title ?? bundle.presentation.name ?? 'Presentation'}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
      data-presentation-export-iframe
    />
  )
}
