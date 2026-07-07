export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Strip HTML tags, trim, limit length */
export function sanitize(v: unknown, maxLen = 500): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined
  return v
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen)
}
