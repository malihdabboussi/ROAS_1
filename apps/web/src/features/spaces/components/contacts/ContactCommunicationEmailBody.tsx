'use client'

import { useCallback, useEffect, useRef } from 'react'

/** Full HTML documents pass through; fragments get a minimal shell so UA doesn't paint a white canvas. */
function buildEmailIframeSrcDoc(html: string): string {
  const t = html.trim()
  if (/^<!DOCTYPE/i.test(t) || /<html[\s>]/i.test(t)) {
    return html
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0!important;padding:0!important;background:transparent!important;}</style></head><body>${html}</body></html>`
}

/** Neutralize srcdoc iframe UA "white page" after load, including full HTML bodies. */
function injectEmailIframePreviewBase(doc: Document) {
  const docEl = doc.documentElement
  let head = doc.head
  if (!head && docEl) {
    head = doc.createElement('head')
    docEl.insertBefore(head, docEl.firstChild)
  }
  if (!head) return

  let style = doc.getElementById('vibey-email-preview-base') as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = 'vibey-email-preview-base'
    head.appendChild(style)
  }

  const appDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  style.textContent = `
    html {
      color-scheme: ${appDark ? 'dark' : 'light'};
    }
    html, body {
      background: transparent !important;
      margin: 0;
    }
    hr {
      border: 0;
      border-top: 1px solid color-mix(in srgb, CanvasText 20%, transparent) !important;
    }
    blockquote {
      border-left: 3px solid color-mix(in srgb, CanvasText 22%, transparent) !important;
    }
    table {
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid color-mix(in srgb, CanvasText 18%, transparent) !important;
      padding: 0.35em 0.5em;
    }
  `
}

/** True when stored body is a full document (keep iframe for those). */
function isFullHtmlEmail(html: string): boolean {
  const t = html.trim()
  return /^<!DOCTYPE/i.test(t) || /<html[\s>]/i.test(t)
}

/** Fragment HTML: shadow root avoids iframe srcdoc's default white canvas; inherits host theme. */
function SentEmailHtmlShadow({ emailId, html }: { emailId: string; html: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = `
      :host { display: block; background: transparent; }
      hr {
        border: 0;
        border-top: 1px solid color-mix(in srgb, var(--foreground) 20%, transparent);
      }
      blockquote {
        border-left: 3px solid color-mix(in srgb, var(--foreground) 22%, transparent);
      }
      table {
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid color-mix(in srgb, var(--foreground) 18%, transparent);
        padding: 0.35em 0.5em;
      }
    `
    const mount = document.createElement('div')
    mount.innerHTML = html
    shadow.replaceChildren(style, mount)
  }, [emailId, html])

  return <div ref={hostRef} className="body-4 min-w-0 max-w-full text-foreground" />
}

function SentEmailHtmlFrame({ emailId, html }: { emailId: string; html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const teardown = useCallback(() => {
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  const onLoad = useCallback(() => {
    teardown()
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    const body = doc?.body
    const docEl = doc?.documentElement
    if (!iframe || !doc || !body) return

    injectEmailIframePreviewBase(doc)

    const sync = () => {
      const h = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        docEl?.scrollHeight ?? 0,
        docEl?.offsetHeight ?? 0,
      )
      iframe.style.height = `${Math.max(h, 24)}px`
    }
    sync()
    requestAnimationFrame(sync)
    const ro = new ResizeObserver(sync)
    ro.observe(body)
    observerRef.current = ro
  }, [teardown])

  useEffect(() => {
    return () => {
      teardown()
    }
  }, [emailId, html, teardown])

  return (
    <iframe
      key={emailId}
      ref={iframeRef}
      srcDoc={buildEmailIframeSrcDoc(html)}
      title="Email message"
      sandbox="allow-same-origin"
      onLoad={onLoad}
      className="block w-full max-w-full border-0 bg-transparent"
    />
  )
}

export function SentEmailHtmlHost({ emailId, html }: { emailId: string; html: string }) {
  if (!html.trim()) {
    return <p className="body-4 text-muted-foreground">No body</p>
  }
  if (isFullHtmlEmail(html)) {
    return <SentEmailHtmlFrame emailId={emailId} html={html} />
  }
  return <SentEmailHtmlShadow emailId={emailId} html={html} />
}
