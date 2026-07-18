'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { spaceWorkTabKindFromViewType } from '@/components/shell/space-work-tabs'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { SpaceItem } from '@/features/spaces/types'

type UseSpaceWorkTabSyncArgs = {
  spaceId: string | null | undefined
  docEditorItem: SpaceItem | null
  selectedItem: SpaceItem | null
}

function itemTitle(item: SpaceItem): string {
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  return title || 'Untitled'
}

/**
 * Keeps shell Space-work tabs in sync with the open doc/task, and restores
 * the last active tab into `?item=` when Space work expands again.
 */
export function useSpaceWorkTabSync({
  spaceId,
  docEditorItem,
  selectedItem,
}: UseSpaceWorkTabSyncArgs) {
  const router = useRouter()
  const pathname = usePathname() ?? '/spaces'
  const searchParams = useSearchParams()
  const openSpaceWorkTab = useShellStore((s) => s.openSpaceWorkTab)
  const spaceWorkOpen = useShellStore((s) => s.spaceWorkOpen)
  const lastExpandedRestoreRef = useRef<string | null>(null)

  useEffect(() => {
    if (!spaceId || !docEditorItem) return
    openSpaceWorkTab({
      id: docEditorItem.id,
      kind: 'doc',
      title: itemTitle(docEditorItem),
      spaceId,
    })
  }, [docEditorItem, openSpaceWorkTab, spaceId])

  useEffect(() => {
    if (!spaceId || !selectedItem) return
    const viewType = (selectedItem.custom_data as Record<string, unknown> | undefined)?._view_type
    if (viewType === 'doc') return
    openSpaceWorkTab({
      id: selectedItem.id,
      kind: spaceWorkTabKindFromViewType(viewType),
      title: itemTitle(selectedItem),
      spaceId,
    })
  }, [openSpaceWorkTab, selectedItem, spaceId])

  useEffect(() => {
    if (!spaceId || !spaceWorkOpen) {
      lastExpandedRestoreRef.current = null
      return
    }
    const itemParam = searchParams.get('item')
    if (itemParam) return
    const activeTabId = useShellStore.getState().spaceWorkBySpaceId[spaceId]?.activeTabId ?? null
    if (!activeTabId) return
    const restoreKey = `${spaceId}:${activeTabId}`
    if (lastExpandedRestoreRef.current === restoreKey) return
    lastExpandedRestoreRef.current = restoreKey
    const params = new URLSearchParams(searchParams.toString())
    params.set('space', spaceId)
    params.set('item', activeTabId)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams, spaceId, spaceWorkOpen])
}
