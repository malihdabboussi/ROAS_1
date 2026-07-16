'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSpacesStore } from '../store/use-spaces-store'
import type { FieldDef } from '../types/space-schema'
import { useUpdateItemWithSubtaskCompleteConfirm } from '../hooks/use-update-item-with-subtask-complete-confirm'
import type { SpaceItemUpdateFn } from '../lib/complete-open-subtasks-on-status'

const SpaceItemUpdateContext = createContext<SpaceItemUpdateFn | null>(null)

/** Inject a wrapped `updateItem` for descendants (task menu, detail modal). */
export function SpaceItemUpdateProvider({
  value,
  children,
}: {
  value: SpaceItemUpdateFn
  children: ReactNode
}) {
  return <SpaceItemUpdateContext.Provider value={value}>{children}</SpaceItemUpdateContext.Provider>
}

/** Self-contained confirm + context (e.g. Home task detail host). */
export function SpaceStatusCascadeConfirmProvider({
  statusField,
  spaceId,
  children,
}: {
  statusField: FieldDef | undefined
  spaceId?: string | null
  children: ReactNode
}) {
  const storeUpdateItem = useSpacesStore((s) => s.updateItem)
  const updateItemsBatch = useSpacesStore((s) => s.updateItemsBatch)
  const items = useSpacesStore((s) => s.items)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const itemsLoadedForSpaceId = useSpacesStore((s) => s.itemsLoadedForSpaceId)

  const { updateItem, dialog } = useUpdateItemWithSubtaskCompleteConfirm({
    updateItem: storeUpdateItem,
    updateItemsBatch,
    items,
    statusField,
    spaceId: spaceId ?? activeSpaceId,
    itemsLoadedForSpaceId,
  })

  return (
    <SpaceItemUpdateProvider value={updateItem}>
      {children}
      {dialog}
    </SpaceItemUpdateProvider>
  )
}

/** Prefers the cascade-confirm wrapper when mounted; otherwise store `updateItem`. */
export function useSpaceItemUpdate(): SpaceItemUpdateFn {
  const fromContext = useContext(SpaceItemUpdateContext)
  const storeUpdateItem = useSpacesStore((s) => s.updateItem)
  return fromContext ?? storeUpdateItem
}
