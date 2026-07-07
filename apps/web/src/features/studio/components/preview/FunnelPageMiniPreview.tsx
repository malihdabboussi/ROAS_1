'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildPresentationThemePaintScript } from '../../lib/presentation-theme-paint-script.util'
import { useFunnelFullModeStore } from '../../store/use-funnel-full-mode-store'

const PAGE_W = 1280
const PAGE_H = 720

interface FunnelPageMiniPreviewProps {
  srcDoc: string
  title: string
}

export function FunnelPageMiniPreview({ srcDoc, title }: FunnelPageMiniPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const liveThemeCss = useFunnelFullModeStore((s) => s.liveThemeCss)
  const liveThemeFontsUrl = useFunnelFullModeStore((s) => s.liveThemeFontsUrl)
  const liveThemeNonce = useFunnelFullModeStore((s) => s.liveThemeNonce)
  const [layout, setLayout] = useState<{ cw: number; ch: number; scale: number } | null>(null)

  const iframeSrcDoc = useMemo(() => {
    let doc = srcDoc
    let liveThemeInjected = false
    const themeBits: string[] = []
    if (liveThemeCss) {
      themeBits.push(`<style id="vibey-tweaks-live">${liveThemeCss}</style>`)
    }
    if (liveThemeFontsUrl) {
      themeBits.push(
        `<link id="vibey-tweaks-fonts" rel="stylesheet" href="${liveThemeFontsUrl}" />`,
      )
    }
    if (themeBits.length > 0) {
      liveThemeInjected = true
      const injection = themeBits.join('')
      if (doc.includes('</head>')) doc = doc.replace('</head>', `${injection}</head>`)
      else doc = `${injection}${doc}`
    }
    // #region agent log
    fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bd981c' },
      body: JSON.stringify({
        sessionId: 'bd981c',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'FunnelPageMiniPreview.tsx:iframeSrcDoc',
        message: 'thumbnail srcDoc built',
        data: {
          title,
          liveThemeInjected,
          cssLen: liveThemeCss?.length ?? null,
          liveThemeNonce,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    const paintScript = buildPresentationThemePaintScript()
    if (doc.includes('</body>')) return doc.replace('</body>', `${paintScript}</body>`)
    return `${doc}${paintScript}`
  }, [liveThemeCss, liveThemeFontsUrl, liveThemeNonce, srcDoc, title])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const cr = el.getBoundingClientRect()
      const cw = Math.max(0, cr.width)
      const ch = Math.max(0, cr.height)
      if (cw < 1 || ch < 1) return
      const scale = Math.min(cw / PAGE_W, ch / PAGE_H)
      setLayout({ cw, ch, scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cw = layout?.cw ?? 0
  const ch = layout?.ch ?? 0
  const scale = layout?.scale ?? 0
  const left = cw > 0 ? (cw - PAGE_W * scale) / 2 : 0
  const top = ch > 0 ? (ch - PAGE_H * scale) / 2 : 0

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full overflow-hidden">
      {layout ? (
        <iframe
          title={title}
          srcDoc={iframeSrcDoc}
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute border-0"
          style={{
            left,
            top,
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      ) : null}
    </div>
  )
}
