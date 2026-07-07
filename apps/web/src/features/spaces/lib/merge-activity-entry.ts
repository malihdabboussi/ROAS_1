import type { SpaceItemActivity } from '../services/spaces.service'

function sortActivityRows(rows: SpaceItemActivity[]): SpaceItemActivity[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

/** Merge API/realtime activity rows — richer payloads (e.g. link previews) win over stale copies. */
export function mergeActivityEntry(
  prev: SpaceItemActivity[],
  entry: SpaceItemActivity,
): SpaceItemActivity[] {
  const idx = prev.findIndex((a) => a.id === entry.id)
  if (idx === -1) return sortActivityRows([...prev, entry])

  const existing = prev[idx]!
  const merged: SpaceItemActivity = {
    ...existing,
    ...entry,
    payload: {
      ...(existing.payload ?? {}),
      ...(entry.payload ?? {}),
    },
  }
  return sortActivityRows(prev.map((a, i) => (i === idx ? merged : a)))
}
