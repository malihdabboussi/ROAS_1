'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchSpaceMappingGroups, type SpaceMappingGroup } from './space-mapping'

export interface SpaceMappingIndexEntry {
  spaceTitle: string
  /** Full "Program · Campaign · Space" path. */
  pathLabel: string
}

/** Flattens cascade groups into a spaceId → display-label lookup. */
export function buildSpaceMappingIndex(
  groups: SpaceMappingGroup[],
): Map<string, SpaceMappingIndexEntry> {
  const index = new Map<string, SpaceMappingIndexEntry>()
  for (const group of groups) {
    for (const space of group.spaces) {
      index.set(space.id, {
        spaceTitle: space.title,
        pathLabel: `${group.label} · ${space.title}`,
      })
    }
  }
  return index
}

/**
 * Lazily loads a spaceId → mapping-label index once `enabled` first turns
 * true, so list rows can display where each item lives. `null` while loading.
 */
export function useSpaceMappingIndex(enabled: boolean): Map<string, SpaceMappingIndexEntry> | null {
  const [groups, setGroups] = useState<SpaceMappingGroup[] | null>(null)

  useEffect(() => {
    if (!enabled || groups !== null) return
    let cancelled = false
    void fetchSpaceMappingGroups().then((next) => {
      if (!cancelled) setGroups(next)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, groups])

  return useMemo(() => (groups ? buildSpaceMappingIndex(groups) : null), [groups])
}
