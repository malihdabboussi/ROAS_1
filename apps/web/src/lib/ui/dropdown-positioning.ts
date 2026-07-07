/**
 * Keeps a fixed-position dropdown from extending past the viewport's right edge.
 */
export function clampDropdownLeft(left: number, dropdownWidthPx: number, marginPx = 8): number {
  if (typeof window === 'undefined') return left
  const maxLeft = window.innerWidth - dropdownWidthPx - marginPx
  return Math.max(marginPx, Math.min(left, maxLeft))
}
