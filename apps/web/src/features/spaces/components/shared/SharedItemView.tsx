'use client'

import { useEffect, useMemo, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { markdownToHtml } from '../../lib/markdown-to-html'
import { fetchSharedItem, type SharedItemResponse } from '../../services/spaces.service'
import { DocEditorProseStyles } from '../docs/editor/DocEditorProseStyles'
import {
  editorFontFamilyForStyle,
  editorFontSizePxForSize,
  getDocCustomDataRecord,
  parseDocEditorUiFromCustomData,
} from '../docs/lib/doc-editor-settings'

function isDocLike(item: SharedItemResponse['item']): boolean {
  const customData = (item.custom_data ?? {}) as Record<string, unknown>
  if (Object.keys(customData).some((key) => key.startsWith('_doc_'))) return true
  return typeof item.doc_body === 'string' && item.doc_body.trim().length > 0
}

function resolveSharedDocHtml(item: SharedItemResponse['item'] | undefined): string {
  const raw = item?.doc_body ?? item?.notes ?? ''
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return markdownToHtml(raw) ?? raw
}

export function SharedItemView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<SharedItemResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSharedItem(token)
        if (!cancelled) setPayload(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invalid or expired link')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const title = payload?.item?.title ?? 'Shared item'
  const isDoc = useMemo(() => (payload ? isDocLike(payload.item) : false), [payload])
  const docCustomData = useMemo(
    () => getDocCustomDataRecord(payload?.item?.custom_data),
    [payload?.item?.custom_data],
  )
  const { docFontStyle, docFontSize, docFullWidth } = useMemo(
    () => parseDocEditorUiFromCustomData(docCustomData),
    [docCustomData],
  )
  const html = isDoc
    ? resolveSharedDocHtml(payload?.item)
    : typeof payload?.item?.notes === 'string'
      ? payload.item.notes
      : ''

  return (
    <main className="px-spacing-6 py-spacing-8 mx-auto w-full max-w-4xl">
      {loading ? (
        <div className="py-spacing-12 flex flex-col items-center justify-center">
          <VibeyLoadingOrb text="Loading shared item…" state="processing" size="lg" />
        </div>
      ) : error || !payload ? (
        <div className="p-spacing-4 rounded-spacing-2 border-border border">
          <h1 className="text-lg font-semibold uppercase tracking-wide">Link unavailable</h1>
          <p className="body-3 mt-spacing-2 text-muted-foreground">
            This link is invalid or has expired.
          </p>
        </div>
      ) : (
        <article className="p-spacing-4 space-y-spacing-4 rounded-spacing-2 border-border border">
          <div className="space-y-spacing-1">
            <p className="body-4 text-muted-foreground uppercase tracking-wide">
              Shared from {payload.space.title}
            </p>
            <h1 className="text-2xl font-semibold uppercase">{title}</h1>
            <p className="body-4 text-muted-foreground">
              Access: {payload.access_level} · Share: {payload.share_type}
            </p>
          </div>

          {isDoc ? (
            <div className="doc-editor-surface p-spacing-4 rounded-spacing-2 border-border bg-background min-h-0 border">
              <DocEditorProseStyles
                editorFontSizePx={editorFontSizePxForSize(docFontSize)}
                editorFontFamily={editorFontFamilyForStyle(docFontStyle)}
                docFullWidth={docFullWidth}
              />
              <div
                className="ProseMirror"
                dangerouslySetInnerHTML={{ __html: html || '<p>No content.</p>' }}
              />
            </div>
          ) : (
            <div className="space-y-spacing-3">
              <div className="gap-spacing-2 body-3 grid grid-cols-2">
                <div className="px-spacing-3 py-spacing-2 rounded-spacing-2 border-border border">
                  <span className="body-4 text-muted-foreground">Status</span>
                  <p>{payload.item.status}</p>
                </div>
                <div className="px-spacing-3 py-spacing-2 rounded-spacing-2 border-border border">
                  <span className="body-4 text-muted-foreground">Due date</span>
                  <p>{payload.item.due_date || '—'}</p>
                </div>
              </div>
              <div className="p-spacing-3 body-3 rounded-spacing-2 border-border border">
                <p className="body-4 mb-spacing-1 text-muted-foreground">Notes</p>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: html || '<p>No notes.</p>' }}
                />
              </div>
            </div>
          )}
        </article>
      )}
    </main>
  )
}
