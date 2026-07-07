const buckets = new Map<string, { count: number; resetAt: number }>()

/** Returns true if request is allowed; false if rate-limited. */
export function docsRagRateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(key, b)
  }
  const cur = b
  cur.count += 1
  return cur.count <= limit
}

export function clientIpFromHeaders(h: Headers): string {
  const xf = h.get('x-forwarded-for')
  if (xf) return (xf.split(',')[0]?.trim() ?? '') || 'unknown'
  const rip = h.get('x-real-ip')
  if (rip) return rip.trim()
  return 'unknown'
}
