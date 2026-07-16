'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { orgService, type TeamRosterEntry } from '@/features/org/services/org.service'
import { SpaceStatusCascadeConfirmProvider } from '@/features/spaces/components/SpaceStatusCascadeConfirmProvider'
import { StatusEditorModal } from '@/features/spaces/components/StatusEditorModal'
import { TaskDetailModal } from '@/features/spaces/components/task-detail/TaskDetailModal'
import { YourTurnSubtaskDrawer } from '@/features/spaces/components/your-turn/YourTurnSubtaskDrawer'
import { useSpaceFieldOptionActions } from '@/features/spaces/hooks/use-space-field-option-actions'
import {
  fetchSpaceById,
  fetchSpaceItem,
  fetchSpaceItems,
  updateSpace,
} from '@/features/spaces/services/spaces.service'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space, SpaceItem } from '@/features/spaces/types'
import {
  DEFAULT_SPACE_SCHEMA,
  isSpaceFieldVisibleInUi,
  type SpaceSchema,
  type ViewDef,
} from '@/features/spaces/types/space-schema'
import { createClient } from '@/lib/supabase/client'

type StoreSnapshot = {
  activeSpaceId: string | null
  activeViewId: string | null
  items: SpaceItem[]
  spaces: Space[]
  itemsLoadedForSpaceId: string | null
}

const TASK_DETAIL_VIEW_TYPES = new Set<ViewDef['type']>(['list', 'table', 'kanban'])

function captureStoreSnapshot(): StoreSnapshot {
  const s = useSpacesStore.getState()
  return {
    activeSpaceId: s.activeSpaceId,
    activeViewId: s.activeViewId,
    items: s.items,
    spaces: s.spaces,
    itemsLoadedForSpaceId: s.itemsLoadedForSpaceId,
  }
}

function restoreStoreSnapshot(snapshot: StoreSnapshot) {
  useSpacesStore.setState({
    activeSpaceId: snapshot.activeSpaceId,
    activeViewId: snapshot.activeViewId,
    items: snapshot.items,
    spaces: snapshot.spaces,
    itemsLoadedForSpaceId: snapshot.itemsLoadedForSpaceId,
  })
}

function mergeSchema(raw: SpaceSchema): SpaceSchema {
  const existingIds = new Set(raw.fields.map((f) => f.id))
  const missingFields = DEFAULT_SPACE_SCHEMA.fields.filter((f) => !existingIds.has(f.id))
  if (missingFields.length === 0) return raw
  return { ...raw, fields: [...raw.fields, ...missingFields] }
}

function pickTaskDetailView(schema: SpaceSchema): ViewDef {
  const match = schema.views.find((view) => TASK_DETAIL_VIEW_TYPES.has(view.type))
  return match ?? schema.views[0]!
}

function hydrateStoreForSpaceTask(space: Space, items: SpaceItem[], viewId: string) {
  useSpacesStore.setState((s) => ({
    activeSpaceId: space.id,
    activeViewId: viewId,
    items,
    itemsLoadedForSpaceId: space.id,
    spaces: s.spaces.some((sp) => sp.id === space.id) ? s.spaces : [space, ...s.spaces],
  }))
}

function openSpaceItemWithHistory(
  item: SpaceItem,
  items: SpaceItem[],
  setSelectedItem: (item: SpaceItem | null) => void,
  setTaskHistory: (updater: (stack: SpaceItem[]) => SpaceItem[]) => void,
) {
  if (!item.parent_item_id) {
    setTaskHistory(() => [])
    setSelectedItem(item)
    return
  }
  const parent = items.find((i) => i.id === item.parent_item_id)
  if (parent) {
    setTaskHistory(() => [parent])
    setSelectedItem(item)
  } else {
    setTaskHistory(() => [])
    setSelectedItem(item)
  }
}

export function HomeTaskDetailHost({
  item,
  onClose,
  onUpdated,
}: {
  item: YourTurnItem
  onClose: () => void
  onUpdated?: () => void
}) {
  if (item.kind === 'mission_subtask') {
    return (
      <YourTurnSubtaskDrawer
        item={item}
        onClose={onClose}
        onActionCompleted={() => {
          onUpdated?.()
          onClose()
        }}
      />
    )
  }

  if (item.kind !== 'space_item' || !item.space_id) {
    return null
  }

  return (
    <HomeSpaceTaskDetailHost
      spaceId={item.space_id}
      itemId={item.id}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  )
}

function HomeSpaceTaskDetailHost({
  spaceId,
  itemId,
  onClose,
  onUpdated,
}: {
  spaceId: string
  itemId: string
  onClose: () => void
  onUpdated?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [space, setSpace] = useState<Space | null>(null)
  const [schema, setSchema] = useState<SpaceSchema | null>(null)
  const [activeView, setActiveView] = useState<ViewDef | null>(null)
  const [selectedItem, setSelectedItem] = useState<SpaceItem | null>(null)
  const [taskHistory, setTaskHistory] = useState<SpaceItem[]>([])
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [statusEditorOpen, setStatusEditorOpen] = useState(false)
  const storeSnapshotRef = useRef<StoreSnapshot | null>(null)
  const router = useRouter()

  const fieldsForUi = useMemo(
    () => (schema?.fields ?? []).filter(isSpaceFieldVisibleInUi),
    [schema?.fields],
  )

  const patchSchema = useCallback(
    (next: Partial<SpaceSchema> | SpaceSchema) => {
      setSchema((prev) => {
        if (!prev) return prev
        const merged = { ...prev, ...next } as SpaceSchema
        setSpace((sp) => (sp ? { ...sp, schema: merged } : sp))
        useSpacesStore.setState((s) => ({
          spaces: s.spaces.map((sp) => (sp.id === spaceId ? { ...sp, schema: merged } : sp)),
        }))
        return merged
      })
    },
    [spaceId],
  )

  const refresh = useCallback(async () => {
    const items = await fetchSpaceItems(spaceId)
    useSpacesStore.setState({ items, itemsLoadedForSpaceId: spaceId })
    setSelectedItem((prev) => {
      if (!prev) return prev
      const fresh = items.find((i) => i.id === prev.id)
      return fresh ?? prev
    })
    onUpdated?.()
  }, [onUpdated, spaceId])

  const {
    handleCreateFieldOption,
    handleUpdateFieldOption,
    handleDeleteFieldOption,
    handleTagCustomSwatchesChange,
  } = useSpaceFieldOptionActions({
    activeSchema: schema ?? undefined,
    activeSpace: space,
    patchActiveSpaceSchema: patchSchema,
    refresh,
  })

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    let cancelled = false
    storeSnapshotRef.current = captureStoreSnapshot()
    setLoading(true)

    void (async () => {
      try {
        const [loadedSpace, items] = await Promise.all([
          fetchSpaceById(spaceId),
          fetchSpaceItems(spaceId),
        ])
        if (cancelled) {
          return
        }

        const mergedSchema = mergeSchema(loadedSpace.schema)
        const view = pickTaskDetailView(mergedSchema)
        let targetItem = items.find((i) => i.id === itemId) ?? null
        if (!targetItem) {
          try {
            targetItem = await fetchSpaceItem(spaceId, itemId)
          } catch {
            targetItem = null
          }
        }
        if (!targetItem) {
          toast.error('Task not found')
          onClose()
          return
        }

        const hydratedItems = items.some((i) => i.id === targetItem!.id)
          ? items
          : [targetItem, ...items]
        hydrateStoreForSpaceTask(
          { ...loadedSpace, schema: mergedSchema },
          hydratedItems,
          view.id,
        )

        // Always load roster (personal = self + agents; org = team members).
        // Skipping personal spaces left Assignee Empty even when assignee_id was set.
        try {
          const rows = await orgService.listRoster({ kind: 'all' })
          if (!cancelled) setRoster(rows)
        } catch {
          if (!cancelled) setRoster([])
        }

        setSpace({ ...loadedSpace, schema: mergedSchema })
        setSchema(mergedSchema)
        setActiveView(view)
        openSpaceItemWithHistory(targetItem, hydratedItems, setSelectedItem, setTaskHistory)
      } catch (err) {
        if (!cancelled) {
          toast.error('Failed to open task')
          onClose()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (storeSnapshotRef.current) {
        restoreStoreSnapshot(storeSnapshotRef.current)
        storeSnapshotRef.current = null
      }
    }
  }, [itemId, onClose, spaceId])

  const handleClose = useCallback(() => {
    if (storeSnapshotRef.current) {
      restoreStoreSnapshot(storeSnapshotRef.current)
      storeSnapshotRef.current = null
    }
    onClose()
  }, [onClose])

  const pushTaskAndOpen = useCallback((next: SpaceItem) => {
    setSelectedItem((prev) => {
      if (prev && prev.id !== next.id) {
        setTaskHistory((stack) => [...stack, prev])
      }
      return next
    })
  }, [])

  const popTask = useCallback(() => {
    let popped = false
    setTaskHistory((stack) => {
      if (stack.length === 0) return stack
      const next = [...stack]
      const last = next.pop()!
      setSelectedItem(last)
      popped = true
      return next
    })
    return popped
  }, [])

  const handleViewPatch = useCallback(async (_patch: Partial<ViewDef>) => {}, [])

  const handleOpenConversationById = useCallback(
    (conversationId: string) => {
      if (!space) return
      useSpacesStore.getState().openConversationInSpaceChat(conversationId)
      useSpacesStore.getState().setChatCollapsed(false)
      useSpacesStore.getState().setActiveSpace(space.id)
      router.push(`/spaces?space=${space.id}`)
      onClose()
    },
    [onClose, router, space],
  )

  if (loading || !space || !schema || !activeView || !selectedItem) {
    return (
      <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/40">
        <VibeyLoadingOrb state="processing" size="md" />
      </div>
    )
  }

  const statusField = useMemo(
    () => fieldsForUi.find((field) => field.id === 'status'),
    [fieldsForUi],
  )

  return (
    <SpaceStatusCascadeConfirmProvider statusField={statusField} spaceId={spaceId}>
      <TaskDetailModal
        item={selectedItem}
        allFields={fieldsForUi}
        activeView={activeView}
        spaceSchema={schema}
        onViewPatch={handleViewPatch}
        roster={roster}
        currentUserId={currentUserId}
        campaignId={space.campaign_id ?? null}
        breadcrumbParentCrumb={
          taskHistory.length > 0 && taskHistory[taskHistory.length - 1]
            ? {
                committedTitle:
                  (taskHistory[taskHistory.length - 1]!.title ?? '').trim() || 'Parent task',
                onNavigate: () => {
                  popTask()
                },
              }
            : null
        }
        canGoBack={taskHistory.length > 0}
        onBack={() => popTask()}
        onOpenTaskByItem={pushTaskAndOpen}
        onOpenConversationById={handleOpenConversationById}
        onClose={handleClose}
        onUpdated={() => void refresh()}
        onEditStatuses={() => setStatusEditorOpen(true)}
        onCreateOption={handleCreateFieldOption}
        onUpdateOption={handleUpdateFieldOption}
        onDeleteOption={handleDeleteFieldOption}
        onTagCustomSwatchesChange={handleTagCustomSwatchesChange}
      />

      <StatusEditorModal
        open={statusEditorOpen}
        schema={schema}
        onClose={() => setStatusEditorOpen(false)}
        onSchemaChange={async (nextSchema: SpaceSchema) => {
          const updated = await updateSpace(space.id, { schema: nextSchema })
          patchSchema(updated.schema as SpaceSchema)
          await refresh()
        }}
      />
    </SpaceStatusCascadeConfirmProvider>
  )
}
