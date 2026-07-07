import { marked } from 'marked'

/**
 * Server mirror of apps/web/src/features/spaces/lib/markdown-to-html.ts —
 * space_items.doc_body is editor HTML, so markdown written by agents must be
 * converted with the exact same rules the Docs UI uses, or the two surfaces
 * render the same doc differently.
 */
export function markdownToHtml(text: string | null | undefined): string | null {
  if (!text) return null
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return marked.parse(text, { async: false, breaks: true }) as string
}
