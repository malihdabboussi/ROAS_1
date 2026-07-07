'use client'

import { forwardRef, useCallback, useEffect, useRef } from 'react'
import { marked } from 'marked'
import type { Previewer as PreviewerClass } from 'pagedjs'
import { reportClientError } from '@/lib/log-client-error'
import { cn } from '@/lib/utils/cn'

const PAGED_SCOPE = 'deliverable-a4-paged'

function pagedScopeCss(): Record<string, string> {
  const css = `
@page { size: A4 portrait; margin: 16mm 14mm; }

.${PAGED_SCOPE} {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 10.5pt;
  line-height: 1.45;
  color: #0a0a0a;
}
.${PAGED_SCOPE} h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5em; page-break-after: avoid; }
.${PAGED_SCOPE} h2 { font-size: 1.2rem; font-weight: 600; margin: 0.8em 0 0.4em; page-break-after: avoid; }
.${PAGED_SCOPE} h3 { font-size: 1.05rem; font-weight: 600; margin: 0.7em 0 0.35em; page-break-after: avoid; }
.${PAGED_SCOPE} h4 { font-size: 0.95rem; font-weight: 600; margin: 0.6em 0 0.3em; page-break-after: avoid; }
.${PAGED_SCOPE} p { margin: 0.35em 0; }
.${PAGED_SCOPE} ul, .${PAGED_SCOPE} ol { margin: 0.4em 0; padding-left: 1.4em; }
.${PAGED_SCOPE} li { margin: 0.2em 0; }
.${PAGED_SCOPE} blockquote { border-left: 3px solid #d4d4d8; margin: 0.6em 0; padding-left: 0.75em; color: #3f3f46; }
.${PAGED_SCOPE} pre {
  background: #f4f4f5;
  border-radius: 6px;
  padding: 0.6em 0.75em;
  overflow-x: auto;
  font-size: 0.88em;
  page-break-inside: avoid;
}
.${PAGED_SCOPE} code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.${PAGED_SCOPE} :not(pre) > code { background: #f4f4f5; padding: 0.12em 0.35em; border-radius: 3px; font-size: 0.9em; }
.${PAGED_SCOPE} table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
.${PAGED_SCOPE} th, .${PAGED_SCOPE} td { border: 1px solid #d4d4d8; padding: 0.35em 0.5em; text-align: left; vertical-align: top; }
.${PAGED_SCOPE} thead { display: table-header-group; }
.${PAGED_SCOPE} tr { page-break-inside: avoid; }
.${PAGED_SCOPE} img { max-width: 100%; height: auto; page-break-inside: avoid; }
.${PAGED_SCOPE} hr { border: 0; border-top: 1px solid #e4e4e7; margin: 0.8em 0; }
.${PAGED_SCOPE} a { color: var(--color-primary, #10b981); }

.pagedjs_pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: var(--secondary, #e5e7eb);
  padding: 0.75rem 0.5rem 1.5rem;
  box-sizing: border-box;
}
.pagedjs_page { background: #fff; box-sizing: border-box; flex-shrink: 0; }
`
  return { 'deliverable-a4-paged-inline': css }
}

type Props = { markdown: string; className?: string }

export const DeliverableA4PagedPreview = forwardRef<HTMLDivElement, Props>(
  function DeliverableA4PagedPreview({ markdown, className }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null)
    /** New instance per render pass; reusing Previewer leaves chunker pages on detached DOM (Strict Mode / remounts) and breaks pagination. */
    const previewerInstanceRef = useRef<PreviewerClass | null>(null)
    const genRef = useRef(0)

    const setHostRef = useCallback(
      (el: HTMLDivElement | null) => {
        hostRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      },
      [ref],
    )

    useEffect(() => {
      let alive = true
      const gen = ++genRef.current
      const run = async () => {
        try {
          const { Previewer: P } = await import('pagedjs')
          if (!alive || gen !== genRef.current) return
          const host = hostRef.current
          if (!host) return

          previewerInstanceRef.current?.polisher.destroy()
          previewerInstanceRef.current = null
          host.innerHTML = ''

          const html = marked.parse(markdown, { async: false }) as string
          const wrapped = `<div class="${PAGED_SCOPE}">${html}</div>`
          if (!alive || gen !== genRef.current) return

          const previewer = new P()
          previewerInstanceRef.current = previewer
          await previewer.preview(wrapped, [pagedScopeCss()], host)
        } catch (err) {
          void reportClientError({
            feature: 'ui/deliverable_a4_preview',
            error_code: 'pagedjs_render_failed',
            message: err instanceof Error ? err.message : String(err),
          })
        }
      }
      void run()
      return () => {
        alive = false
        previewerInstanceRef.current?.polisher.destroy()
        previewerInstanceRef.current = null
        if (hostRef.current) hostRef.current.innerHTML = ''
      }
    }, [markdown])

    return (
      <div
        ref={setHostRef}
        className={cn('min-h-[200px] min-h-full w-full overflow-x-auto', className)}
      />
    )
  },
)
