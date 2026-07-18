import { markdownToHtml } from '../../lib/markdown-to-html'
import type { SpaceItem } from '../../types'

export function resolveInitialDocBody(item: SpaceItem): string {
  const raw = item.doc_body ?? item.notes ?? ''
  if (!raw) return ''
  return markdownToHtml(raw) ?? raw
}
