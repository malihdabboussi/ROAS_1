/**
 * Timeline helpers for the YC demo seeder.
 *
 * Every row the seeder inserts uses these helpers to compute its
 * `created_at` / `updated_at` so the entire demo reads as 90 days of real
 * activity, not a single seed dump. Never use `new Date()` directly inside
 * content or phases — always route through here.
 *
 * The actual 13-week arc lives in `content/timeline.ts`.
 */

/** Reference "now" — the moment the seeder run started. Stable across the run. */
const NOW_MS = Date.now()

export function now(): Date {
  return new Date(NOW_MS)
}

/**
 * Returns a Date N days ago (UTC) at the given hour/minute/second.
 *
 *   dayOffset(45)            // 45 days ago, 00:00:00 UTC
 *   dayOffset(7, 14, 30)     // 7 days ago, 14:30:00 UTC
 */
export function dayOffset(daysAgo: number, hour = 0, minute = 0, second = 0): Date {
  const d = new Date(NOW_MS)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(hour, minute, second, 0)
  return d
}

/**
 * Returns the Date that is `daysAgo` days before the supplied anchor.
 */
export function before(anchor: Date, daysAgo: number, hour = 0, minute = 0): Date {
  const d = new Date(anchor.getTime())
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(hour, minute, 0, 0)
  return d
}

/**
 * Returns the Date that is `daysAfter` days after the supplied anchor.
 */
export function after(anchor: Date, daysAfter: number, hour = 0, minute = 0): Date {
  const d = new Date(anchor.getTime())
  d.setUTCDate(d.getUTCDate() + daysAfter)
  d.setUTCHours(hour, minute, 0, 0)
  return d
}

/**
 * Deterministic pseudo-random number in [0, 1). Same seed → same number.
 * Used to scatter events within a day or week without breaking idempotency.
 *
 * Fast xmur3 + mulberry32. Not crypto — only for picking timestamps/jitter.
 */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^= h >>> 16) >>> 0
}

export function seededRandom(seed: string): number {
  let a = hashSeed(seed) || 1
  a = (a + 0x6d2b79f5) | 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * Picks a deterministic random Date within [start, end] using `seed`.
 */
export function jitterWithin(start: Date, end: Date, seed: string): Date {
  const r = seededRandom(seed)
  const ms = start.getTime() + r * (end.getTime() - start.getTime())
  return new Date(ms)
}

/**
 * Returns an array of weekday Dates (Mon-Fri UTC) between `from` and `to`
 * inclusive. Used for cortex daily-dream backfill.
 */
export function weekdaysBetween(from: Date, to: Date): Date[] {
  const out: Date[] = []
  const cur = new Date(from.getTime())
  cur.setUTCHours(2, 0, 0, 0) // company_cortex_settings default local_time '02:00'
  while (cur.getTime() <= to.getTime()) {
    const day = cur.getUTCDay() // 0 = Sun, 6 = Sat
    if (day >= 1 && day <= 5) out.push(new Date(cur.getTime()))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

/** Convert a Date to the ISO 8601 string Supabase / Postgres expects. */
export function iso(d: Date): string {
  return d.toISOString()
}
