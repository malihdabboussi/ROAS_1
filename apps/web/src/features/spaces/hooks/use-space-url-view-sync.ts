'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSpacesStore } from '../store/use-spaces-store'
import { cachedSpaces } from './use-cached-spaces'

export function useSpaceUrlViewSync() {
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const setActiveView = useSpacesStore((s) => s.setActiveView)
  const searchParams = useSearchParams()
  const urlSpaceViewSyncKeyRef = useRef<string | null>(null)

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
    if (!spaceParam || spaces.some((space) => space.id === spaceParam)) return

    let cancelled = false
    void (async () => {
      await cachedSpaces.reload()
      if (cancelled) return
      await useSpacesStore.getState().loadSpaces()
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, spaces])
}
