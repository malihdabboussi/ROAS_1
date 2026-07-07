/**
 * Extracts the text payload when the content column holds a JSON-serialized
 * object (e.g. `{"text":"..."}`) instead of a plain string.
 * Returns the original string unchanged if it is not a JSON wrapper.
 */
function unwrapJsonContent(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return raw

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const candidate =
        parsed.text ?? parsed.content ?? parsed.body ?? parsed.markdown ?? parsed.value
      if (typeof candidate === 'string' && candidate.length > 0) return candidate
    }
  } catch {
    /* not valid JSON — fall through */
  }
  return raw
}

/**
 * Normalizes deliverable content from agent output into clean markdown.
 *
 * Handles three common agent serialisation issues:
 *  1. Content stored as a JSON object with a `text` (or similar) key
 *  2. Literal `\n` / `\t` escape sequences instead of real whitespace
 *  3. Double-escaped quotes and excessive blank lines
 */
export function normalizeDeliverableContent(raw: string): string {
  let s = unwrapJsonContent(raw)

  // Literal escape sequences → real characters
  s = s.replace(/\\n/g, '\n')
  s = s.replace(/\\t/g, '\t')
  s = s.replace(/\\r/g, '')

  // Double-escaped quotes left over from JSON serialization
  s = s.replace(/\\"/g, '"')
  s = s.replace(/\\'/g, "'")

  // Strip wrapping quotes if the entire string is a quoted JSON value
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1)
  }

  // Collapse 3+ consecutive blank lines into 2 (preserves paragraph breaks)
  s = s.replace(/\n{3,}/g, '\n\n')

  s = s.trim()

  return s
}

/**
 * Returns a plain-text excerpt suitable for card thumbnails.
 * Strips markdown syntax so the preview reads as clean prose.
 */
export function excerptDeliverableContent(raw: string, maxLen = 200): string {
  let s = normalizeDeliverableContent(raw)

  // Strip markdown headings
  s = s.replace(/^#{1,6}\s+/gm, '')
  // Strip bold / italic markers
  s = s.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
  s = s.replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
  // Strip list bullets
  s = s.replace(/^[-*+]\s+/gm, '• ')
  // Strip link syntax [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()

  if (s.length <= maxLen) return s
  return s.slice(0, maxLen) + '…'
}
