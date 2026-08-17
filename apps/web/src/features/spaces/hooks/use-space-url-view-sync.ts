'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useOrgStore } from '@/lib/org/org-context-store'
import { fetchSpaceById } from '../services/spaces.service'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'
import { cachedSpaces } from './use-cached-spaces'

function missingSpaceAttemptKey(spaceParam: string): string {
  const orgKey = useOrgStore.getState().activeOrgId ?? 'personal'
  return `${orgKey}\u0000${spaceParam}`
}

function mergeSpaceIntoList(spaces: Space[], space: Space): Space[] {
  if (spaces.some((row) => row.id === space.id)) return spaces
  return [...spaces, space]
}

/**
 * When `?space=` is absent from the warm list (wrong org, beyond first page,
 * or share-only), resolve it once — never reload on every `spaces` identity churn.
 */
export async function resolveMissingUrlSpace(spaceParam: string): Promise<Space | null> {
  await cachedSpaces.reload()
  await useSpacesStore.getState().loadSpaces()
  const afterReload = useSpacesStore.getState().spaces.find((space) => space.id === spaceParam)
  if (afterReload) return afterReload

  try {
    const space = await fetchSpaceById(spaceParam)
    if (!space?.id) return null
    cachedSpaces.mutate((prev) => mergeSpaceIntoList(prev ?? [], space))
    useSpacesStore.setState((state) => ({
      spaces: mergeSpaceIntoList(state.spaces, space),
    }))
    return space
  } catch {
    return null
  }
}

export function useSpaceUrlViewSync() {
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const setActiveView = useSpacesStore((s) => s.setActiveView)
  const searchParams = useSearchParams()
  const urlSpaceViewSyncKeyRef = useRef<string | null>(null)
  const missingSpaceAttemptRef = useRef<string | null>(null)

  useEffect(() => {
    if (spaces.length === 0) return
    const spaceParam = searchParams.get('space')
    if (!spaceParam || !spaces.some((s) => s.id === spaceParam)) return
    const vParam = searchParams.get('v')
    const urlKey = `${spaceParam}\u0000${vParam ?? ''}`
    const urlSearchChanged = urlSpaceViewSyncKeyRef.current !== urlKey
    if (urlSearchChanged) urlSpaceViewSyncKeyRef.current = urlKey
    if (activeSpaceId !== spaceParam) {
      setActiveSpace(spaceParam)
    }
    const targetSpace = spaces.find((s) => s.id === spaceParam)
    if (
      urlSearchChanged &&
      vParam &&
      targetSpace?.schema?.views?.some((v: { id: string }) => v.id === vParam)
    ) {
      setActiveView(vParam)
    }
  }, [spaces, searchParams, activeSpaceId, setActiveSpace, setActiveView])

  useEffect(() => {
    const spaceParam = searchParams.get('space')
    if (!spaceParam) {
      missingSpaceAttemptRef.current = null
      return
    }
    if (spaces.some((space) => space.id === spaceParam)) {
      missingSpaceAttemptRef.current = null
      return
    }

    const attemptKey = missingSpaceAttemptKey(spaceParam)
    if (missingSpaceAttemptRef.current === attemptKey) return
    missingSpaceAttemptRef.current = attemptKey

    let cancelled = false
    void (async () => {
      const resolved = await resolveMissingUrlSpace(spaceParam)
      if (cancelled || !resolved) return
      useSpacesStore.getState().setActiveSpace(resolved.id)
    })()

    return () => {
      cancelled = true
    }
    // Intentionally omit `spaces` identity — attempt key + presence check above
    // prevent the reload storm that caused React #185 on deep links.
  }, [searchParams, spaces])
}
