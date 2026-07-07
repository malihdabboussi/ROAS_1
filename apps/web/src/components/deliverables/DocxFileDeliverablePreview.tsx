'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { DocEditorProseStyles } from '@/components/spaces'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import {
  editorFontFamilyForStyle,
  editorFontSizePxForSize,
} from '@/lib/spaces'

export function DocxFileDeliverablePreview({ fileUrl }: { fileUrl: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setHtml(null)

    void fetch('/api/preview-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { html?: string; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? `${response.status}`)
        }
        if (!payload.html) {
          throw new Error('Empty DOCX preview')
        }
        return payload.html
      })
      .then((previewHtml) => {
        if (!cancelled) {
          setHtml(previewHtml)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (loading) {
    return (
      <div className="gap-spacing-4 py-spacing-16 flex min-h-[min(70vh,40rem)] flex-1 flex-col items-center justify-center">
        <VibeyChatOrb className="h-14 w-14" state="thinking" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gap-spacing-3 py-spacing-12 flex min-h-[min(70vh,40rem)] flex-1 flex-col items-center justify-center text-center">
        <FileText className="text-muted-foreground/30 h-12 w-12" />
        <p className="body-3 text-muted-foreground max-w-md">
          Preview unavailable for this document. You can download it instead.
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button-glass-accent mt-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          Download
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-[min(70vh,40rem)] flex-1 flex-col">
      <DocEditorProseStyles
        editorFontSizePx={editorFontSizePxForSize('default')}
        editorFontFamily={editorFontFamilyForStyle('system')}
        docFullWidth={false}
      />
      <div className="doc-editor-surface min-h-0 flex-1 overflow-y-auto">
        <div className="ProseMirror p-spacing-4" dangerouslySetInnerHTML={{ __html: html ?? '' }} />
      </div>
    </div>
  )
}
