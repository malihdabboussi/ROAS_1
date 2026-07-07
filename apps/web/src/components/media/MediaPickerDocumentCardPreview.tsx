'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'text/csv',
  'text/markdown',
  'text/plain',
  'text/tab-separated-values',
  'text/xml',
  'text/x-yaml',
  'text/yaml',
])

export function MediaPickerDocumentCardPreview({
  url,
  mimeType,
  filename,
}: {
  url: string
  mimeType: string
  filename: string
}) {
  const normalizedMimeType = mimeType.toLowerCase()
  const isPdf = normalizedMimeType === 'application/pdf'
  const isText =
    TEXT_MIME_TYPES.has(normalizedMimeType) || /\.(txt|md|csv|tsv|json|xml|ya?ml)$/i.test(filename)
  const [textContent, setTextContent] = useState<string | null>(null)

  useEffect(() => {
    if (!isText || !url) return
    let cancelled = false
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setTextContent(text)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isText, url])

  if (isPdf) {
    return (
      <div className="bg-[var(--color-muted)]/20 relative h-full w-full overflow-hidden">
        <iframe
          src={`${url}#toolbar=0&navpanes=0&view=FitH`}
          className="pointer-events-none h-full w-full"
          title={filename}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-1.5 py-1">
          <span className="text-[10px] font-medium text-white/80">PDF</span>
        </div>
      </div>
    )
  }

  if (isText && textContent) {
    return (
      <div className="bg-[var(--color-muted)]/20 h-full w-full overflow-hidden p-1.5">
        <p className="text-muted-foreground h-full overflow-hidden font-mono text-[6px] leading-[8px]">
          {textContent.slice(0, 500)}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-muted)]/30 flex h-full w-full flex-col items-center justify-center gap-1.5">
      <FileText className="text-muted-foreground/50 h-8 w-8" />
      <span className="body-4 text-muted-foreground max-w-[90%] truncate px-1 text-center text-[10px]">
        {filename}
      </span>
    </div>
  )
}
