/** Compact relative age for chat history rows (Cursor-style: 19m, 10h, 1d, 1mo). */
export function formatCompactRelativeTime(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Math.max(0, nowMs - then)
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d`
  const diffMo = Math.floor(diffD / 30)
  if (diffMo < 12) return `${diffMo}mo`
  return `${Math.floor(diffMo / 12)}y`
}
