'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { artifactTypeToSpaceViewType } from '../lib/artifact-type-to-space-view-type'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceItem } from '../types'

type OpenSpaceItemArgs = {
  activeSpaceId: string | null
  items: SpaceItem[]
  itemsLoadedForSpaceId: string | null
  focusTaskCapableViewIfNeeded: (spaceId: string) => void
  openSpaceItemModal: (item: SpaceItem) => void
  setDocEditorItem: (item: SpaceItem | null) => void
  setSelectedItem: (item: SpaceItem | null) => void
}

function openSpaceItemFromDeepLink({
  item,
  spaceParam,
  focusTaskCapableViewIfNeeded,
  openSpaceItemModal,
  setDocEditorItem,
  setSelectedItem,
}: OpenSpaceItemArgs & { item: SpaceItem; spaceParam: string }) {
  const vt = (item.custom_data as Record<string, unknown> | undefined)?._view_type
  if (vt === 'doc') {
    setSelectedItem(null)
    setDocEditorItem(item)
  } else {
    setDocEditorItem(null)
    focusTaskCapableViewIfNeeded(spaceParam)
    openSpaceItemModal(item)
  }
}

export function useSpaceItemNavigationEvents({
  activeSpaceId,
  items,
  itemsLoadedForSpaceId,
  focusTaskCapableViewIfNeeded,
  openSpaceItemModal,
  setDocEditorItem,
  setSelectedItem,
}: OpenSpaceItemArgs) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const spaces = useSpacesStore((s) => s.spaces)
  const urlSpaceItemDeepLinkRef = useRef<string | null>(null)

  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null

  useEffect(() => {
    const spaceParam = searchParams.get('space')
    const itemParam = searchParams.get('item')
    if (!itemParam || !spaceParam || spaceParam !== activeSpaceId) {
      urlSpaceItemDeepLinkRef.current = null
      return
    }
    if (!activeSpace || activeSpace.id !== spaceParam) return
    if (itemsLoadedForSpaceId !== activeSpaceId) return

    const sig = `${spaceParam}:${itemParam}`
    if (urlSpaceItemDeepLinkRef.current === sig) return

    const item = items.find((i) => i.id === itemParam)
    if (!item) {
      urlSpaceItemDeepLinkRef.current = sig
      return
    }

    openSpaceItemFromDeepLink({
      item,
      spaceParam,
      activeSpaceId,
      items,
      itemsLoadedForSpaceId,
      focusTaskCapableViewIfNeeded,
      openSpaceItemModal,
      setDocEditorItem,
      setSelectedItem,
    })

    urlSpaceItemDeepLinkRef.current = sig
  }, [
    searchParams,
    activeSpaceId,
    activeSpace,
    itemsLoadedForSpaceId,
    items,
    focusTaskCapableViewIfNeeded,
    openSpaceItemModal,
    setDocEditorItem,
    setSelectedItem,
  ])

  useEffect(() => {
    const onOpenTask = (e: Event) => {
      const d = (e as CustomEvent<{ itemId?: unknown; spaceId?: unknown }>).detail
      if (typeof d?.itemId !== 'string') return
      const targetSpaceId =
        typeof d.spaceId === 'string' && d.spaceId.trim() ? d.spaceId.trim() : activeSpaceId
      if (!targetSpaceId) return
      if (targetSpaceId !== activeSpaceId) {
        setActiveSpace(targetSpaceId)
        urlSpaceItemDeepLinkRef.current = null
        const p = new URLSearchParams(searchParams.toString())
        p.set('space', targetSpaceId)
        p.set('item', d.itemId)
        const qs = p.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        return
      }
      const item = items.find((i) => i.id === d.itemId)
      if (item) {
        focusTaskCapableViewIfNeeded(targetSpaceId)
        openSpaceItemModal(item)
        return
      }
      urlSpaceItemDeepLinkRef.current = null
      const p = new URLSearchParams(searchParams.toString())
      p.set('space', targetSpaceId)
      p.set('item', d.itemId)
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
    window.addEventListener('space-vibey:open-task', onOpenTask as EventListener)
    return () => window.removeEventListener('space-vibey:open-task', onOpenTask as EventListener)
  }, [
    activeSpaceId,
    focusTaskCapableViewIfNeeded,
    items,
    openSpaceItemModal,
    pathname,
    router,
    searchParams,
    setActiveSpace,
  ])

  return { urlSpaceItemDeepLinkRef }
}

export function useSpaceSelectedItemSync(
  items: SpaceItem[],
  selectedItem: SpaceItem | null,
  setSelectedItem: (item: SpaceItem | null) => void,
) {
  useEffect(() => {
    if (!selectedItem) return
    const fresh = items.find((i) => i.id === selectedItem.id)
    if (fresh) setSelectedItem(fresh)
    else setSelectedItem(null)
  }, [items, selectedItem, setSelectedItem])
}
