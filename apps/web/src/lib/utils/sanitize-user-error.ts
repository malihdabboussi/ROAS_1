/**
 * Extracts a user-displayable error message, stripping technical strings
 * that would expose internal API paths or framework error details.
 *
 * When the backend returns a 4xx/5xx, `backendPost` re-throws with the raw
 * NestJS message (e.g. "Cannot POST /api/spaces/ensure-personal"). This
 * utility detects those patterns and returns the caller-supplied fallback
 * instead, so users never see developer-facing text in toasts.
 */

const TECHNICAL_PATTERNS = [
  /^Cannot\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\//i,
  /^Backend error\s+\d+/i,
  /^\[PROXY\]/i,
  /^fetch failed/i,
  /^Network request failed/i,
  /^ECONNREFUSED/i,
  /^AbortError/i,
  /^TypeError:/i,
  /^SyntaxError:/i,
  /Internal server error/i,
  /^Invalid response$/i,
]

export function sanitizeUserError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  const msg = err.message?.trim()
  if (!msg) return fallback
  if (TECHNICAL_PATTERNS.some((re) => re.test(msg))) return fallback
  return msg
}
