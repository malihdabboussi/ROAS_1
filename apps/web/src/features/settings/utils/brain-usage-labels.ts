/**
 * User-facing labels for billing rows with feature `brain`.
 */

const BRAIN_ACTION_LABELS: Record<string, string> = {
  embedding: 'Embedding',
  gemini_llm: 'Text generation',
  document_ocr: 'Document text (OCR)',
  link_image_ocr: 'Image from link (OCR)',
  live_voice: 'Live voice',
}

function humanizeUnderscoreSlug(slug: string): string {
  const s = slug.trim()
  if (!s) return ''
  return s
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Friendly action phrase for a brain usage row (no "Brain ·" prefix). */
export function formatBrainActionLabel(action: string | undefined): string {
  const raw = action?.trim() ?? ''
  if (!raw) return ''
  const key = raw.toLowerCase()
  if (BRAIN_ACTION_LABELS[key]) return BRAIN_ACTION_LABELS[key]
  return humanizeUnderscoreSlug(raw)
}

/** Full activity title for settings usage lists. */
export function formatBrainUsageTitle(action: string | undefined): string {
  const detail = formatBrainActionLabel(action)
  return detail ? `Brain · ${detail}` : 'Brain'
}
