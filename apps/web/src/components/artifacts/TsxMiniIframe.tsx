'use client'

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createTsxRunnerScope } from '@/lib/tsx-runner/tsx-runner-scope'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'

/** Virtual funnel/slide stage - scale covers parent like object-fit: cover (no letterboxing). */
const CANVAS_W = 1280
const CANVAS_H = 800

const MINI_IFRAME_DOC = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=1280"/>
<script src="https://cdn.tailwindcss.com"><\/script>
<style id="vcss"></style>
<style>html,body,#vr{margin:0;padding:0;width:100%;min-height:100%;}body{overflow:hidden;}</style>
</head><body><div id="vr"></div></body></html>`

export function TsxMiniIframe({ code, css, title }: { code: string; css?: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rootRef = useRef<Root | null>(null)
  const [ready, setReady] = useState(false)
  const [layout, setLayout] = useState({ cw: 0, ch: 0, scale: 0.3125 })
  const scope = useMemo(() => createTsxRunnerScope(), [])
  const { element } = useEsbuildRunner({ code, scope })

  const handleLoad = useCallback(() => {
    const href = iframeRef.current?.contentWindow?.location?.href ?? ''
    if (href.startsWith('about:srcdoc')) setReady(true)
  }, [])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const cr = el.getBoundingClientRect()
      const cw = Math.max(0, cr.width)
      const ch = Math.max(0, cr.height)
      if (cw < 1 || ch < 1) return
      const scale = Math.max(cw / CANVAS_W, ch / CANVAS_H)
      setLayout({ cw, ch, scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!ready) return
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const styleEl = doc.getElementById('vcss')
    if (styleEl) styleEl.textContent = css ?? ''
    const mountEl = doc.getElementById('vr')
    if (!mountEl) return
    if (!rootRef.current) rootRef.current = createRoot(mountEl)
    rootRef.current.render(<Fragment>{element}</Fragment>)
  }, [css, element, ready])

  useEffect(() => {
    const holder = rootRef
    return () => {
      const root = holder.current
      holder.current = null
      if (!root) return
      queueMicrotask(() => {
        root.unmount()
      })
    }
  }, [])

  const { cw, ch, scale } = layout
  const left = cw > 0 ? (cw - CANVAS_W * scale) / 2 : 0
  const top = ch > 0 ? (ch - CANVAS_H * scale) / 2 : 0

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={MINI_IFRAME_DOC}
        onLoad={handleLoad}
        className="pointer-events-none absolute border-0"
        style={{
          left,
          top,
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}
