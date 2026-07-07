export function takenAtIsoDay(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0] ?? null
}

export function takenAtInResolvedRange(
  takenDay: string | null,
  start: string | undefined,
  end: string | undefined,
): boolean {
  if (!start && !end) return true
  if (!takenDay) return true
  const today = new Date().toISOString().split('T')[0]!
  const effectiveEnd = end ?? (start ? today : undefined)
  if (start && takenDay < start) return false
  if (effectiveEnd && takenDay > effectiveEnd) return false
  return true
}
