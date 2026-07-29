'use client'

import { DocEditorProseStyles } from '@/components/spaces'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import { markdownToHtml } from '@/lib/content/markdown-to-html'
import {
  editorFontFamilyForStyle,
  editorFontSizePxForSize,
} from '@/lib/spaces/doc-editor-settings'

/** True when content is already HTML (mission agents often save HTML one-pagers). */
export function looksLikeDeliverableHtml(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  return /<(h[1-6]|p|ul|ol|li|table|blockquote|div|section|article|hr)\b/i.test(trimmed)
}

/** Resolve mission deliverable text into editor HTML for ROAS-doc-style preview. */
export function resolveDeliverablePreviewHtml(raw: string): string {
  const normalized = normalizeDeliverableContent(raw)
  if (!normalized) return ''
  if (looksLikeDeliverableHtml(normalized)) return normalized
  return markdownToHtml(normalized) ?? normalized
}

export function DeliverableHtmlPreview({ html }: { html: string }) {
  return (
    <div className="flex min-h-[min(70vh,40rem)] flex-1 flex-col">
      <DocEditorProseStyles
        editorFontSizePx={editorFontSizePxForSize('default')}
        editorFontFamily={editorFontFamilyForStyle('system')}
        docFullWidth={false}
      />
      <div className="doc-editor-surface min-h-0 flex-1 overflow-y-auto">
        <div className="ProseMirror p-spacing-4" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}
