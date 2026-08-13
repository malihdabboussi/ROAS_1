'use client'

import { useEffect, useState } from 'react'
import { fetchSpaceMappingGroups, type SpaceMappingGroup } from './space-mapping'

/**
 * Lazily loads the program · campaign → space cascade once `open` first turns
 * true (menus should not fetch until the user reaches for them). `null` means
 * still loading.
 */
export function useSpaceMappingGroups(
  open: boolean,
  excludeSpaceId?: string,
): SpaceMappingGroup[] | null {
  const [groups, setGroups] = useState<SpaceMappingGroup[] | null>(null)

  useEffect(() => {
    if (!open || groups !== null) return
    let cancelled = false
    void fetchSpaceMappingGroups(excludeSpaceId).then((next) => {
      if (!cancelled) setGroups(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, groups, excludeSpaceId])

  return groups
}
