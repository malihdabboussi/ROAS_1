import type { SpaceItem } from '../types'
import { wouldNestIntoDescendant } from './space-list-dnd-apply'

/** Matches `MAX_DOC_NESTING_LEVEL` in apps/api spaces.service */
export const MAX_DOC_TREE_TIER = 5

export type DocsTreeDndZone = 'before' | 'after' | 'into'

function bySortOrder(a: SpaceItem, b: SpaceItem): number {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0)
}

function isDescendantOf(items: SpaceItem[], nodeId: string, ancestorId: string): boolean {
  const node = items.find((i) => i.id === nodeId)
  if (!node) return false
  if (node.id === ancestorId) return true
  if (!node.parent_item_id) return false
  if (node.parent_item_id === ancestorId) return true
  return isDescendantOf(items, node.parent_item_id, ancestorId)
}

function isInSubtreeOf(items: SpaceItem[], nodeId: string, ancestorId: string): boolean {
  if (nodeId === ancestorId) return true
  return isDescendantOf(items, nodeId, ancestorId)
}

function buildParentToChildIds(items: SpaceItem[]): Map<string | null, string[]> {
  const m = new Map<string | null, string[]>()
  for (const it of items) {
    const p = it.parent_item_id ?? null
    if (!m.has(p)) m.set(p, [])
    m.get(p)!.push(it.id)
  }
  for (const ids of m.values()) {
    ids.sort((a, b) => {
      const ia = items.find((i) => i.id === a)!
      const ib = items.find((i) => i.id === b)!
      return bySortOrder(ia, ib)
    })
  }
  return m
}

function removeActiveFromMap(
  map: Map<string | null, string[]>,
  activeId: string,
  fromParent: string | null,
) {
  const list = (map.get(fromParent) ?? []).filter((id) => id !== activeId)
  map.set(fromParent, list)
}

function renumberChildLists(
  m: Map<string | null, string[]>,
  touchedParents: Set<string | null>,
): { id: string; parent_item_id: string | null; sort_order: number }[] {
  const out: { id: string; parent_item_id: string | null; sort_order: number }[] = []
  for (const p of touchedParents) {
    const ids = m.get(p) ?? []
    ids.forEach((id, j) => {
      out.push({ id, parent_item_id: p, sort_order: j })
    })
  }
  return out
}

function diffUpdates(
  before: SpaceItem[],
  afterRows: { id: string; parent_item_id: string | null; sort_order: number }[],
): { id: string; parent_item_id: string | null; sort_order: number }[] {
  const byId = new Map(before.map((i) => [i.id, i] as const))
  return afterRows.filter((r) => {
    const o = byId.get(r.id)
    if (!o) return true
    const p = o.parent_item_id ?? null
    return p !== (r.parent_item_id ?? null) || (o.sort_order ?? 0) !== r.sort_order
  })
}

function tierUnderMerged(merged: Map<string, SpaceItem>, id: string): number {
  let n = 0
  let cur: string | undefined = id
  while (cur) {
    n++
    const item = merged.get(cur)
    if (!item) break
    const p = item.parent_item_id ?? null
    if (!p) break
    cur = p
  }
  return n
}

function validateMaxDocTreeTier(
  items: SpaceItem[],
  updates: { id: string; parent_item_id: string | null; sort_order: number }[],
): boolean {
  const merged = new Map<string, SpaceItem>()
  for (const i of items) {
    merged.set(i.id, { ...i })
  }
  for (const u of updates) {
    const prev = merged.get(u.id)
    if (prev) {
      merged.set(u.id, {
        ...prev,
        parent_item_id: u.parent_item_id,
        sort_order: u.sort_order,
      })
    }
  }
  for (const id of merged.keys()) {
    if (tierUnderMerged(merged, id) > MAX_DOC_TREE_TIER) return false
  }
  return true
}

/**
 * Doc sidebar tree: reorder siblings (before/after) or nest under a page (into).
 * Uses the same parent/sort map mechanics as list DnD without task-only constraints.
 */
export function buildDocsTreeReorder(
  items: SpaceItem[],
  activeId: string,
  overId: string,
  zone: DocsTreeDndZone,
):
  | { ok: true; updates: { id: string; parent_item_id: string | null; sort_order: number }[] }
  | { ok: false; reason: string } {
  if (activeId === overId) return { ok: false, reason: 'same' }
  const active = items.find((i) => i.id === activeId)
  const over = items.find((i) => i.id === overId)
  if (!active || !over) return { ok: false, reason: 'not-found' }

  const m = buildParentToChildIds(items)
  const fromParent = active.parent_item_id ?? null

  if (zone === 'into') {
    if (wouldNestIntoDescendant(items, activeId, overId)) {
      return { ok: false, reason: 'into-descendant' }
    }
    const next = new Map(m)
    removeActiveFromMap(next, activeId, fromParent)
    const ch = [...(next.get(overId) ?? [])]
    if (ch.includes(activeId)) return { ok: false, reason: 'already-child' }
    ch.push(activeId)
    next.set(overId, ch)
    const touched = new Set<string | null>([fromParent, overId])
    const flat = renumberChildLists(next, touched)
    const updates = diffUpdates(items, flat)
    if (!validateMaxDocTreeTier(items, updates)) return { ok: false, reason: 'max-depth' }
    return { ok: true, updates }
  }

  const toParent: string | null = over.parent_item_id ?? null
  if (toParent != null && isInSubtreeOf(items, toParent, activeId)) {
    return { ok: false, reason: 'before-after-under-self' }
  }

  const next = new Map(m)
  removeActiveFromMap(next, activeId, fromParent)
  const list = [...(next.get(toParent) ?? [])]
  const oi = list.indexOf(overId)
  if (oi < 0) return { ok: false, reason: 'over-not-in-list' }
  const insertAt = zone === 'before' ? oi : oi + 1
  list.splice(insertAt, 0, activeId)
  next.set(toParent, list)
  const touched = new Set<string | null>([fromParent, toParent])
  const flat = renumberChildLists(next, touched)
  const updates = diffUpdates(items, flat)
  if (!validateMaxDocTreeTier(items, updates)) return { ok: false, reason: 'max-depth' }
  return { ok: true, updates }
}
