'use client'

import { useEffect, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchDriveFileContent,
  toDrivePreviewUrl,
  type DriveFileContent,
} from '@/lib/services/drive-content-api'

const DRIVE_EMBED_UI_TRIM_PX = 52

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'

/** Primary **Open in Drive** URL when item **custom_data** has no **`_drive_web_view_link`**. */
export function driveFallbackOpenHref(
  driveFileId: string,
  webViewLink: string | null | undefined,
  mimeType: string | null | undefined,
): string {
  if (webViewLink) return webViewLink
  if (mimeType === DRIVE_FOLDER_MIME) return `https://drive.google.com/drive/folders/${driveFileId}`
  return `https://drive.google.com/file/d/${driveFileId}/view`
}

function sanitizePreviewHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc
    .querySelectorAll('script, style, iframe, object, embed, form')
    .forEach((node) => node.remove())
  doc.querySelectorAll<HTMLElement>('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

function parseCsvRows(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

function DriveDocViewerContent({
  content,
  driveFileId,
  fallbackWebViewLink,
}: {
  content: DriveFileContent
  driveFileId: string
  fallbackWebViewLink?: string | null
}) {
  if (content.kind === 'html') {
    const sanitized = sanitizePreviewHtml(content.content ?? '')
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="h-full min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-background p-4">
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: sanitized || '<p>No content available.</p>' }}
          />
        </div>
      </div>
    )
  }

  if (content.kind === 'csv') {
    const rows = parseCsvRows(content.content ?? '')
    if (rows.length === 0) {
      return (
        <div className="flex h-full items-center justify-center rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">No CSV rows found.</p>
        </div>
      )
    }
    const [header, ...body] = rows
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="h-full min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-0 table-fixed border-collapse text-xs">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {header?.map((cell, index) => (
                  <th
                    key={`h-${index}`}
                    className="border-b border-border px-2 py-1.5 text-left"
                  >
                    {cell || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={`r-${rowIndex}`} className="border-border/50 border-b">
                  {row.map((cell, colIndex) => (
                    <td key={`c-${rowIndex}-${colIndex}`} className="px-2 py-1.5 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (content.kind === 'embed' && content.mime_type === DRIVE_FOLDER_MIME) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-border px-6 py-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Google does not allow Drive folder UIs inside embedded previews, so you may see a 403
          there. Your link and sync are still valid — use{' '}
          <strong className="text-foreground">Open in Drive</strong> in the title bar
          above.
        </p>
      </div>
    )
  }

  const previewUrl =
    content.kind === 'pdf'
      ? `https://drive.google.com/file/d/${driveFileId}/preview`
      : toDrivePreviewUrl(content.web_view_link ?? fallbackWebViewLink ?? null)

  if (!previewUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border">
        <p className="text-sm text-muted-foreground">
          Preview unavailable for this Drive file.
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
      <iframe
        src={previewUrl}
        title="Drive preview"
        className="pointer-events-auto absolute inset-x-0 top-0 w-full border-0 bg-background"
        style={{ height: `calc(100% + ${DRIVE_EMBED_UI_TRIM_PX}px)` }}
      />
    </div>
  )
}

type DriveDocViewerProps = {
  driveFileId: string
  modifiedTime?: string | null
  webViewLink?: string | null
}

export function DriveDocViewer({ driveFileId, modifiedTime, webViewLink }: DriveDocViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<DriveFileContent | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const next = await fetchDriveFileContent(driveFileId, modifiedTime)
        if (!mounted) return
        setContent(next)
      } catch (cause) {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Failed to load Drive preview')
        setContent(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [driveFileId, modifiedTime])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {loading ? (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center rounded-xl border border-border">
          <VibeyLoadingOrb size="md" state="processing" text="Loading document…" />
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center rounded-xl border border-border">
          <p className="px-4 text-center text-sm text-destructive">{error}</p>
        </div>
      ) : content ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DriveDocViewerContent
            content={content}
            driveFileId={driveFileId}
            fallbackWebViewLink={webViewLink}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">No preview available.</p>
        </div>
      )}
    </div>
  )
}
