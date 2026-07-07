'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

/** Module-level cache so carousel remounts don't refetch/reconvert the same DOCX. */
const docxThumbHtmlCache = new Map<string, string>()

export function DocxThumbnail({ fileUrl, title }: { fileUrl: string; title: string }) {
  const [html, setHtml] = useState<string | null>(docxThumbHtmlCache.get(fileUrl) ?? null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (docxThumbHtmlCache.has(fileUrl)) {
      setHtml(docxThumbHtmlCache.get(fileUrl) ?? null)
      return
    }
    let cancelled = false
    setHtml(null)
    setFailed(false)

    void fetch('/api/preview-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { html?: string; error?: string }
        if (!response.ok || !payload.html) throw new Error(payload.error ?? 'No preview')
        return payload.html
      })
      .then((previewHtml) => {
        docxThumbHtmlCache.set(fileUrl, previewHtml)
        if (!cancelled) setHtml(previewHtml)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (failed) {
    return (
      <div className="gap-spacing-3 absolute inset-0 flex flex-col items-center justify-center">
        <div className="bg-secondary border-border rounded-spacing-3 p-spacing-4 border">
          <FileText className="icon-lg text-muted-foreground" />
        </div>
        <span className="typo-caption text-muted-foreground">Word document</span>
      </div>
    )
  }

  if (!html) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <FileText className="icon-md text-muted-foreground animate-pulse" />
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-white" title={title}>
      <div
        className="docx-thumb-prose absolute left-0 top-0 origin-top-left p-4 text-left"
        style={{ width: '400%', transform: 'scale(0.25)' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
