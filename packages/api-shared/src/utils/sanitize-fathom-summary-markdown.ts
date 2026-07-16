/**
 * Fathom's `default_summary.markdown_formatted` wraps whole takeaway sentences in
 * timestamp links and often inserts newlines mid-URL. Task descriptions are shown
 * as plain text, so that raw markdown is unreadable. Normalize before storage/display.
 */

const FATHOM_HOST = /(?:^|\.)fathom\.video$/i

/** Join whitespace that Fathom (or transport) inserts inside markdown link URLs. */
export function repairBrokenMarkdownLinks(markdown: string): string {
  if (!markdown.includes('](')) return markdown
  return markdown.replace(/\[([^\]]*)\]\(([\s\S]*?)\)/g, (_full, label: string, urlBody: string) => {
    const url = urlBody.replace(/\s+/g, '')
    return `[${label}](${url})`
  })
}

function isFathomUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return FATHOM_HOST.test(host)
  } catch {
    return /fathom\.video/i.test(url)
  }
}

/**
 * Unwrap Fathom timestamp links whose label is prose (not a short timestamp chip).
 * `[Long takeaway…](https://fathom.video/…?timestamp=…)` → `Long takeaway…`
 * Keep short chips like `[3:20](url)` as-is for callers that render markdown later.
 */
export function unwrapFathomProseLinks(markdown: string): string {
  return markdown.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (full, label: string, url: string) => {
    if (!isFathomUrl(url)) return full
    const trimmed = label.trim()
    const looksLikeTimestampChip = /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(trimmed)
    if (looksLikeTimestampChip) return full
    if (trimmed.length >= 24 || /\s/.test(trimmed)) return trimmed
    return full
  })
}

/** Turn ATX headers into plain section titles (description UI is plain text). */
export function stripAtxHeaders(markdown: string): string {
  return markdown.replace(/^#{1,6}\s+(.+)$/gm, '$1')
}

/**
 * Strip emphasis markers that show as literal "stars" in plain-text description UI.
 * `**Professional Wins:**` → `Professional Wins:`
 */
export function stripMarkdownEmphasis(markdown: string): string {
  let next = markdown
  // Bold first (greedy pairs)
  next = next.replace(/\*\*([^*\n]+)\*\*/g, '$1')
  next = next.replace(/__([^_\n]+)__/g, '$1')
  // Italic — avoid matching list markers like "- item"
  next = next.replace(/(^|[^*\n])\*([^*\n]+)\*(?!\*)/gm, '$1$2')
  next = next.replace(/(^|[^_\n])_([^_\n]+)_(?!_)/gm, '$1$2')
  // Orphan emphasis markers left after partial wraps
  next = next.replace(/\*\*/g, '')
  next = next.replace(/__/g, '')
  return next
}

export function sanitizeFathomSummaryMarkdown(raw: string | null | undefined): string {
  const input = String(raw ?? '').trim()
  if (!input) return ''

  let next = repairBrokenMarkdownLinks(input)
  next = unwrapFathomProseLinks(next)
  next = stripAtxHeaders(next)
  next = stripMarkdownEmphasis(next)
  next = next.replace(/\n{3,}/g, '\n\n').trim()
  return next
}

/**
 * True when a description still looks like unsanitized meeting/Fathom markdown
 * that the plain-text description UI would render poorly.
 */
export function looksLikeFathomSummaryMarkdown(raw: string | null | undefined): boolean {
  const text = String(raw ?? '')
  if (!text) return false
  if (/fathom\.video/i.test(text) && (text.includes('](') || /^#{1,6}\s/m.test(text))) return true
  if (/^#{1,6}\s/m.test(text)) return true
  if (/\*\*[^*\n]+\*\*/.test(text)) return true
  if (/__[^_\n]+__/.test(text)) return true
  return false
}
