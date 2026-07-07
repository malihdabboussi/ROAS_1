'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchSpaceUserState,
  updateSpaceUserState,
  type SpaceUserState,
} from '../services/spaces.service'

export function useSpaceUserState() {
  const [userState, setUserState] = useState<SpaceUserState[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchSpaceUserState()
      .then((rows) => {
        if (!cancelled) setUserState(rows)
      })
      .catch(() => {
        if (!cancelled) setUserState([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const favoriteIds = useMemo(
    () => new Set(userState.filter((s) => s.is_favorite).map((s) => s.space_id)),
    [userState],
  )

  const hiddenIds = useMemo(
    () => new Set(userState.filter((s) => !!s.is_hidden).map((s) => s.space_id)),
    [userState],
  )

  const isFavorite = useCallback((spaceId: string) => favoriteIds.has(spaceId), [favoriteIds])
  const isHidden = useCallback((spaceId: string) => hiddenIds.has(spaceId), [hiddenIds])

  const patchState = useCallback(
    (spaceId: string, patch: { is_favorite?: boolean; is_hidden?: boolean }) => {
      setUserState((prev) => {
        const existing = prev.find((s) => s.space_id === spaceId)
        if (existing) {
          return prev.map((s) => (s.space_id === spaceId ? { ...s, ...patch } : s))
        }
        return [
          ...prev,
          {
            space_id: spaceId,
            is_favorite: patch.is_favorite ?? false,
            is_hidden: patch.is_hidden ?? false,
            updated_at: new Date().toISOString(),
          },
        ]
      })
    },
    [],
  )

  const toggleFavorite = useCallback(
    async (spaceId: string) => {
      const next = !favoriteIds.has(spaceId)
      patchState(spaceId, { is_favorite: next })
      try {
        await updateSpaceUserState(spaceId, { is_favorite: next })
      } catch {
        patchState(spaceId, { is_favorite: !next })
        toast.error('Failed to update favorite')
      }
    },
    [favoriteIds, patchState],
  )

  const toggleHidden = useCallback(
    async (spaceId: string, spaceTitle?: string) => {
      const next = !hiddenIds.has(spaceId)
      patchState(spaceId, { is_hidden: next })
      try {
        await updateSpaceUserState(spaceId, { is_hidden: next })
        if (next && spaceTitle) {
          toast.success(`Hidden "${spaceTitle}"`, {
            action: {
              label: 'Undo',
              onClick: () => {
                patchState(spaceId, { is_hidden: false })
                void updateSpaceUserState(spaceId, { is_hidden: false }).catch(() => {})
              },
            },
          })
        }
      } catch {
        patchState(spaceId, { is_hidden: !next })
        toast.error('Failed to hide space')
      }
    },
    [hiddenIds, patchState],
  )

  const unhide = useCallback(
    async (spaceId: string) => {
      if (!hiddenIds.has(spaceId)) return
      patchState(spaceId, { is_hidden: false })
      try {
        await updateSpaceUserState(spaceId, { is_hidden: false })
      } catch {
        patchState(spaceId, { is_hidden: true })
        toast.error('Failed to show space')
      }
    },
    [hiddenIds, patchState],
  )

  return {
    favoriteIds,
    hiddenIds,
    isFavorite,
    isHidden,
    toggleFavorite,
    toggleHidden,
    unhide,
  }
}

export function sortSpacesWithFavoritesFirst<T extends { id: string }>(
  spaces: T[],
  favoriteIds: Set<string>,
): T[] {
  return [...spaces].sort((a, b) => {
    const af = favoriteIds.has(a.id)
    const bf = favoriteIds.has(b.id)
    if (af !== bf) return af ? -1 : 1
    return 0
  })
}
