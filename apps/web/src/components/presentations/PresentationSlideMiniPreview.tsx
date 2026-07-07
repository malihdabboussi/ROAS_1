'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildPresentationThemePaintScript } from '@/lib/presentations/presentation-theme-paint-script.util'
import { usePresentationLiveThemeStore } from '@/lib/presentations/presentation-live-theme-store'

const DECK_W = 1280
const DECK_H = 720

interface PresentationSlideMiniPreviewProps {
  srcDoc: string
  title: string
}

export function PresentationSlideMiniPreview({ srcDoc, title }: PresentationSlideMiniPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const liveThemeCss = usePresentationLiveThemeStore((s) => s.liveThemeCss)
  const liveThemeFontsUrl = usePresentationLiveThemeStore((s) => s.liveThemeFontsUrl)
  const liveThemeNonce = usePresentationLiveThemeStore((s) => s.liveThemeNonce)
  const [layout, setLayout] = useState({ cw: 0, ch: 0, scale: 0.15 })

  const iframeSrcDoc = useMemo(() => {
    let doc = srcDoc
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
      const injection = themeBits.join('')
      if (doc.includes('</head>')) doc = doc.replace('</head>', `${injection}</head>`)
      else doc = `${injection}${doc}`
    }
    const paintScript = buildPresentationThemePaintScript()
    if (doc.includes('</body>')) return doc.replace('</body>', `${paintScript}</body>`)
    return `${doc}${paintScript}`
  }, [liveThemeCss, liveThemeFontsUrl, liveThemeNonce, srcDoc])

  // #region debug-log - H3: theme css the thumbnail srcDoc was built with
  useLayoutEffect(() => {
    fetch('http://127.0.0.1:7242/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesis: 'H3',
        location: 'PresentationSlideMiniPreview.tsx:srcDoc-build',
        message: 'thumbnail srcDoc rebuilt',
        data: {
          title,
          cssLen: liveThemeCss?.length ?? null,
          hasFontsUrl: Boolean(liveThemeFontsUrl),
          nonce: liveThemeNonce,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }, [liveThemeCss, liveThemeFontsUrl, liveThemeNonce, title])
  // #endregion

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const cr = el.getBoundingClientRect()
      const cw = Math.max(0, cr.width)
      const ch = Math.max(0, cr.height)
      if (cw < 1 || ch < 1) return
      const scale = Math.max(cw / DECK_W, ch / DECK_H)
      setLayout({ cw, ch, scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { cw, ch, scale } = layout
  const left = cw > 0 ? (cw - DECK_W * scale) / 2 : 0
  const top = ch > 0 ? (ch - DECK_H * scale) / 2 : 0

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full overflow-hidden">
      <iframe
        title={title}
        srcDoc={iframeSrcDoc}
        sandbox="allow-scripts allow-same-origin"
        className="pointer-events-none absolute border-0"
        style={{
          left,
          top,
          width: DECK_W,
          height: DECK_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}
