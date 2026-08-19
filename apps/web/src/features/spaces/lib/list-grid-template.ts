/**
 * Shared `grid-template-columns` for list/table rows and their headers.
 * Fixed pixel tracks per column plus a flexible trailing gutter (hosts "add column").
 * Rows and headers live in different scroll containers, so tracks stay px-based; the
 * name column is widened up-front by the list (see `fillNameColumnWidth`) instead of
 * using `1fr`, which would size differently in each container.
 */
export const LIST_GRID_TRAILING_GUTTER = 'minmax(2rem, 1fr)'
/** Trailing gutter + row chrome (select handle, group indent) reserved when filling the name column. */
const NAME_FILL_RESERVE_PX = 56

export function buildListGridTemplate(
  columnIds: readonly string[],
  widthFor: (id: string) => number,
): string {
  return [...columnIds.map((id) => `${widthFor(id)}px`), LIST_GRID_TRAILING_GUTTER].join(' ')
}

/**
 * Width for the name column so the row fills `containerWidth`: leftover space goes to
 * the name column (never below its default). Users who resized the name column keep
 * their explicit width — pass `null` for `containerWidth` to skip filling.
 */
export function fillNameColumnWidth(
  columnIds: readonly string[],
  widthFor: (id: string) => number,
  nameColumnId: string,
  containerWidth: number | null,
): number {
  const base = widthFor(nameColumnId)
  if (!containerWidth || containerWidth <= 0) return base
  const others = columnIds
    .filter((id) => id !== nameColumnId)
    .reduce((sum, id) => sum + widthFor(id), 0)
  return Math.max(base, Math.floor(containerWidth - others - NAME_FILL_RESERVE_PX))
}
