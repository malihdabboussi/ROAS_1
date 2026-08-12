export function resolveObservedHeight(current: number, measured: number): number | null {
  if (!Number.isFinite(measured)) return null

  const normalized = Math.max(0, Math.round(measured))
  return normalized === current ? null : normalized
}
