/** Drop on the gap below the ungrouped column header → same as "before" the first top-level row. */
export const LIST_TOP_DROP_ID = 'dnd:drop:__list_top__' as const

/** Drop on the gap below a grouped section header → same as "before" that group’s first row. */
export function groupTopDropId(firstItemId: string) {
  return `dnd:drop:__g_top__:${firstItemId}` as const
}

const GROUP_TOP_RE = /^dnd:drop:__g_top__:(.+)$/

export function tryParseGroupTopDropId(overId: string): string | null {
  const m = overId.match(GROUP_TOP_RE)
  return m?.[1] ?? null
}

/** Drop zone when a grouped section has no rows — move item to that bucket and root list. */
export function emptyGroupDropId(groupKey: string) {
  return `dnd:drop:__empty_g__:${groupKey}` as const
}

const EMPTY_G_RE = /^dnd:drop:__empty_g__:(.+)$/

export function tryParseEmptyGroupDropId(overId: string): string | null {
  const m = overId.match(EMPTY_G_RE)
  return m?.[1] ?? null
}
