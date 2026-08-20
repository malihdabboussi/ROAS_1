'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchSpaceMappingGroups, type SpaceMappingGroup } from './space-mapping'

export interface SpaceMappingIndexEntry {
  spaceTitle: string
  campaignName: string
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
        campaignName: group.campaignName,
        pathLabel: `${group.label} · ${space.title}`,
      })
    }
  }
  return index
}

let cachedGroups: SpaceMappingGroup[] | null = null
let inflight: Promise<SpaceMappingGroup[]> | null = null

function loadSpaceMappingGroups(): Promise<SpaceMappingGroup[]> {
  if (cachedGroups) return Promise.resolve(cachedGroups)
  inflight ??= fetchSpaceMappingGroups().then((next) => {
    cachedGroups = next
    inflight = null
    return next
  })
  return inflight
}

/**
 * Lazily loads a spaceId → mapping-label index once `enabled` first turns
 * true, so list rows can display where each item lives. `null` while loading.
 */
export function useSpaceMappingIndex(enabled: boolean): Map<string, SpaceMappingIndexEntry> | null {
  const [groups, setGroups] = useState<SpaceMappingGroup[] | null>(cachedGroups)

  useEffect(() => {
    if (!enabled || groups !== null) return
    let cancelled = false
    void loadSpaceMappingGroups().then((next) => {
      if (!cancelled) setGroups(next)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, groups])

  return useMemo(() => (groups ? buildSpaceMappingIndex(groups) : null), [groups])
}
