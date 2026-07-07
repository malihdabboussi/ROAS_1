'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  buildEditorBridgeScript,
  buildFunnelPreviewRuntimeScript,
  buildHtmlBundleSrcDoc,
  injectEditorBridge,
} from '../../lib/html-bundle-bridge'
import type { FunnelPageBundle } from '../../services/artifact-preview.service'
import { useFunnelFullModeStore } from '../../store/use-funnel-full-mode-store'
import type { FunnelEditMode, FunnelElementTrace, PresentationMarkupStrokePoint } from '../../types'
import type { ViewportSize } from './SandpackPreview'

interface FunnelHtmlPreviewProps {
  bundle: FunnelPageBundle
  title?: string | null
  viewport?: ViewportSize
  editMode?: FunnelEditMode
  themePreviewCss?: string | null
  bridgeEnabled?: boolean
  onElementSelect?: (trace: FunnelElementTrace) => void
  onDrawingEvent?: (
    phase: 'start' | 'move' | 'end',
    point: PresentationMarkupStrokePoint | null,
  ) => void
  /** Fired when a data-vibey-link target is clicked in preview mode. */
  onNavigateRequest?: (target: string) => void
  onHistoryRequest?: (direction: 'undo' | 'redo') => void
}

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

/**
 * Studio iframe preview for HTML bundle funnel pages. Shared CSS + page
 * files are inlined into the srcDoc; lead-capture forms are intercepted
 * (no real leads from preview) and the editor bridge powers markup/edit
 * element selection and drawing.
 */
export function FunnelHtmlPreview({
  bundle,
  title,
  viewport = 'desktop',
  editMode = 'preview',
  themePreviewCss,
  bridgeEnabled = true,
  onElementSelect,
  onDrawingEvent,
  onNavigateRequest,
  onHistoryRequest,
}: FunnelHtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const funnelId = bundle.page.funnel_id
  const liveStyles = useFunnelFullModeStore((s) => s.liveStyles)
  const liveStyleNonce = useFunnelFullModeStore((s) => s.liveStyleNonce)
  const liveThemeCss = useFunnelFullModeStore((s) => s.liveThemeCss)
  const liveThemeFontsUrl = useFunnelFullModeStore((s) => s.liveThemeFontsUrl)
  const liveThemeNonce = useFunnelFullModeStore((s) => s.liveThemeNonce)
  const bundleReloadNonce = useFunnelFullModeStore((s) => s.bundleReloadNonce)

  const srcDoc = useMemo(() => {
    const allFiles = [...bundle.shared_files, ...bundle.files]
    let doc = buildHtmlBundleSrcDoc(allFiles, bundle.assets, 'index.html', 'No funnel entry file')
    const unreferencedSharedCss = bundle.shared_files
      .filter(
        (file) =>
          (file.mime_type === 'text/css' || file.path.endsWith('.css')) &&
          !doc.includes(`data-vibey-source="${file.path}"`),
      )
      .map((file) => `<style data-vibey-source="${file.path}">\n${file.content}\n</style>`)
      .join('\n')
    if (unreferencedSharedCss) {
      doc = doc.includes('</head>')
        ? doc.replace('</head>', `${unreferencedSharedCss}</head>`)
        : `${unreferencedSharedCss}${doc}`
    }
    const themeHeadBits: string[] = []
    if (themePreviewCss) {
      themeHeadBits.push(
        `<style data-vibey-source="__theme-preview">\n${themePreviewCss}\n</style>`,
      )
    }
    if (liveThemeCss) {
      themeHeadBits.push(`<style id="vibey-tweaks-live">\n${liveThemeCss}\n</style>`)
    }
    if (liveThemeFontsUrl) {
      themeHeadBits.push(
        `<link id="vibey-tweaks-fonts" rel="stylesheet" href="${liveThemeFontsUrl}" />`,
      )
    }
    if (themeHeadBits.length > 0) {
      const injection = themeHeadBits.join('')
      doc = doc.includes('</head>')
        ? doc.replace('</head>', `${injection}</head>`)
        : `${injection}${doc}`
    }
    doc = injectEditorBridge(doc, buildFunnelPreviewRuntimeScript())
    if (bridgeEnabled) {
      const bridge = buildEditorBridgeScript({
        messagePrefix: 'funnel',
        artifactIdField: 'funnel_page_id',
        artifactId: bundle.page.id,
        initialMode: editMode,
        extraTraceFields: { funnel_id: bundle.page.funnel_id },
      })
      doc = injectEditorBridge(doc, bridge)
    }
    return doc
  }, [
    bridgeEnabled,
    bundle,
    themePreviewCss,
    editMode,
    liveThemeCss,
    liveThemeFontsUrl,
    liveThemeNonce,
  ])

  useEffect(() => {
    if (!bridgeEnabled) return
    iframeRef.current?.contentWindow?.postMessage({ type: 'funnel:set-mode', mode: editMode }, '*')
  }, [bridgeEnabled, editMode, srcDoc])

  useEffect(() => {
    if (!bridgeEnabled || !liveStyles) return
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'funnel:apply-style', styles: liveStyles },
      '*',
    )
  }, [bridgeEnabled, liveStyleNonce, liveStyles])

  const postApplyThemeCss = useCallback(
    (trigger: 'effect' | 'viewport-ready') => {
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bd981c' },
        body: JSON.stringify({
          sessionId: 'bd981c',
          runId: 'post-fix',
          hypothesisId: 'H2',
          location: 'FunnelHtmlPreview.tsx:postApplyThemeCss',
          message:
            !bridgeEnabled || liveThemeCss == null
              ? 'apply-theme-css SKIPPED'
              : 'apply-theme-css POSTED',
          data: {
            trigger,
            pageId: bundle.page.id,
            funnelId,
            bridgeEnabled,
            cssLen: liveThemeCss?.length ?? null,
            liveThemeNonce,
            hasContentWindow: Boolean(iframeRef.current?.contentWindow),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      if (!bridgeEnabled || liveThemeCss == null) return
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'funnel:apply-theme-css', css: liveThemeCss, fontsUrl: liveThemeFontsUrl },
        '*',
      )
    },
    [
      bridgeEnabled,
      bundle.page.id,
      funnelId,
      liveThemeCss,
      liveThemeFontsUrl,
      liveThemeNonce,
    ],
  )

  useEffect(() => {
    postApplyThemeCss('effect')
  }, [postApplyThemeCss, srcDoc])

  useEffect(() => {
    if (!bridgeEnabled) return
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string }
      if (data?.type !== 'funnel:viewport-ready') return
      postApplyThemeCss('viewport-ready')
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [bridgeEnabled, postApplyThemeCss])

  useEffect(() => {
    if (!bridgeEnabled) return
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          funnelId?: string
          domPath?: string | null
          styles?: Record<string, string>
        }>
      ).detail
      if (detail?.funnelId !== funnelId || !detail.styles) return
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'funnel:apply-style',
          domPath: detail.domPath ?? null,
          styles: detail.styles,
        },
        '*',
      )
    }
    window.addEventListener('funnel-editor:apply-live-styles', handler)
    return () => window.removeEventListener('funnel-editor:apply-live-styles', handler)
  }, [bridgeEnabled, funnelId])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        trace?: FunnelElementTrace
        phase?: 'start' | 'move' | 'end'
        point?: PresentationMarkupStrokePoint | null
        target?: string
        direction?: 'undo' | 'redo'
      }
      if (data?.type === 'funnel:element-clicked' && data.trace) {
        onElementSelect?.(data.trace)
      }
      if (data?.type === 'funnel:drawing' && data.phase) {
        onDrawingEvent?.(data.phase, data.point ?? null)
      }
      if (data?.type === 'funnel:navigate' && typeof data.target === 'string') {
        onNavigateRequest?.(data.target)
      }
      if (
        data?.type === 'funnel:history' &&
        (data.direction === 'undo' || data.direction === 'redo')
      ) {
        onHistoryRequest?.(data.direction)
      }
      if (data?.type === 'funnel:capture-blocked') {
        toast.info("Lead forms are preview-only here — they'll go live on your published page.")
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onDrawingEvent, onElementSelect, onHistoryRequest, onNavigateRequest])

  return (
    <div className="flex h-full w-full justify-center overflow-auto">
      <iframe
        ref={iframeRef}
        key={`${bundle.page.id}:${bundle.files.length}:${bundle.shared_files.length}:${bundle.assets.length}:${bundleReloadNonce}`}
        title={title ?? bundle.page.name ?? 'Funnel page'}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        className="h-full border-0"
        style={{ width: VIEWPORT_WIDTHS[viewport] ?? '100%' }}
        data-funnel-preview-iframe
        data-funnel-export-iframe
      />
    </div>
  )
}
