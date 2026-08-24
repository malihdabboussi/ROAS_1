'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { orgService, type TeamRosterEntry } from '@/features/org/services/org.service'
import { SpaceStatusCascadeConfirmProvider } from '@/features/spaces/components/SpaceStatusCascadeConfirmProvider'
import { StatusEditorModal } from '@/features/spaces/components/StatusEditorModal'
import {
  captureHomeTaskStoreSnapshot,
  hydrateStoreForHomeTask,
  mergeHomeTaskSchema,
  openHomeTaskWithHistory,
  pickHomeTaskDetailView,
  restoreHomeTaskStoreSnapshot,
  TaskDetailModal,
  usePageGraderTaskSync,
  type HomeTaskStoreSnapshot,
} from '@/features/spaces/components/task-detail/TaskDetailModal'
import { YourTurnSubtaskDrawer } from '@/features/spaces/components/your-turn/YourTurnSubtaskDrawer'
import { useSpaceFieldOptionActions } from '@/features/spaces/hooks/use-space-field-option-actions'
import { useTaskDetailNavigation } from '@/features/spaces/hooks/use-task-detail-navigation'
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
  isSpaceFieldVisibleInUi,
  type SpaceSchema,
  type ViewDef,
} from '@/features/spaces/types/space-schema'
import { createClient } from '@/lib/supabase/client'

export function HomeTaskDetailHost({
  item,
  onClose,
  onUpdated,
  presentation = 'modal',
}: {
  item: YourTurnItem
  onClose: () => void
  onUpdated?: () => void
  presentation?: 'modal' | 'panel'
}) {
  if (item.kind === 'mission_subtask') {
    return (
      <YourTurnSubtaskDrawer
        item={item}
        presentation={presentation}
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
      presentation={presentation}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  )
}

function HomeSpaceTaskDetailHost({
  spaceId,
  itemId,
  presentation,
  onClose,
  onUpdated,
}: {
  spaceId: string
  itemId: string
  presentation: 'modal' | 'panel'
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
  const storeSnapshotRef = useRef<HomeTaskStoreSnapshot | null>(null)

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
    storeSnapshotRef.current = captureHomeTaskStoreSnapshot()
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

        const mergedSchema = mergeHomeTaskSchema(loadedSpace.schema)
        const view = pickHomeTaskDetailView(mergedSchema)
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
        hydrateStoreForHomeTask({ ...loadedSpace, schema: mergedSchema }, hydratedItems, view.id)

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
        openHomeTaskWithHistory(targetItem, hydratedItems, setSelectedItem, setTaskHistory)
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
        restoreHomeTaskStoreSnapshot(storeSnapshotRef.current)
        storeSnapshotRef.current = null
      }
    }
  }, [itemId, onClose, spaceId])

  const handleClose = useCallback(() => {
    if (storeSnapshotRef.current) {
      restoreHomeTaskStoreSnapshot(storeSnapshotRef.current)
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

  const { onUpdateItem, externalTaskMirror } = usePageGraderTaskSync({
    selectedItem,
    roster,
    refresh,
  })

  const {
    openConversationById: handleOpenConversationById,
    navigateToSpace: handleNavigateToSpace,
    navigateToView: handleNavigateToView,
  } = useTaskDetailNavigation({
    spaceId,
    activeViewId: activeView?.id ?? null,
    onClose: handleClose,
  })

  // Must stay above the loading early-return — conditional hooks crash the home shell.
  const statusField = useMemo(
    () => fieldsForUi.find((field) => field.id === 'status'),
    [fieldsForUi],
  )

  if (loading || !space || !schema || !activeView || !selectedItem) {
    return (
      <div
        className={
          presentation === 'panel'
            ? 'flex h-full min-h-0 w-full items-center justify-center'
            : 'bg-modal-overlay z-modal fixed inset-0 flex items-center justify-center'
        }
      >
        <VibeyLoadingOrb state="processing" size="md" />
      </div>
    )
  }

  return (
    <SpaceStatusCascadeConfirmProvider statusField={statusField} spaceId={spaceId}>
      <TaskDetailModal
        presentation={presentation}
        item={selectedItem}
        allFields={fieldsForUi}
        activeView={activeView}
        spaceSchema={schema}
        onViewPatch={handleViewPatch}
        roster={roster}
        currentUserId={currentUserId}
        campaignId={space.campaign_id ?? null}
        onNavigateToSpace={handleNavigateToSpace}
        onNavigateToView={handleNavigateToView}
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
        onUpdateItem={onUpdateItem}
        externalTaskMirror={externalTaskMirror}
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
