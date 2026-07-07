import type { TimeRange } from '../types'

export function getRangeUnix(range: TimeRange): { fromUnix?: number; toUnix: number } {
  const toUnix = Math.floor(Date.now() / 1000)
  if (range === 'all') return { toUnix }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return { fromUnix: toUnix - days * 24 * 60 * 60, toUnix }
}
