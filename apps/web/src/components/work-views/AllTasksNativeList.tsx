'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ListView } from '@/features/spaces/components/ListView'
import {
  deleteSpaceItem,
  pushItemToAgent,
  updateSpaceItem,
} from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { SpaceItem } from '@/features/spaces/types'
import {
  DEFAULT_SPACE_SCHEMA,
  type FieldDef,
  type ViewDef,
} from '@/features/spaces/types/space-schema'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import type { TaskRollupItem } from '@/lib/tasks'

const ROLLUP_FIELDS: FieldDef[] = [
  ...DEFAULT_SPACE_SCHEMA.fields,
  { id: 'campaign_name', name: 'Client Workspace', type: 'text' },
  { id: 'space_title', name: 'Campaign Space', type: 'text' },
]

const DEFAULT_ROLLUP_VIEW: ViewDef = {
  id: 'all-tasks-list',
  type: 'list',
  name: 'List',
  visible_fields: [
    'status',
    'title',
    'campaign_name',
    'space_title',
    'priority',
    'assignee',
    'due_date',
  ],
}

export function AllTasksNativeList({
  items,
  reload,
  onOpenItem,
  onAddItem,
  persistItem,
}: {
  items: TaskRollupItem[]
  reload: () => Promise<void>
  onOpenItem?: (item: TaskRollupItem) => void
  onAddItem?: (title: string) => Promise<void>
  persistItem?: (item: TaskRollupItem, payload: Partial<SpaceItem>) => Promise<void>
}) {
  const router = useRouter()
  const roster = useSpacesStore((state) => state.roster)
  const currentUserId = useSpacesStore((state) => state.currentUserId)
  const loadRoster = useSpacesStore((state) => state.loadRoster)
  const [activeView, setActiveView] = useState<ViewDef>(DEFAULT_ROLLUP_VIEW)

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  const spaceItems = useMemo(() => items.map(toSpaceItem), [items])
  const visibleFields = useMemo(() => {
    const visibleIds = new Set(activeView.visible_fields ?? [])
    return ROLLUP_FIELDS.filter((field) => visibleIds.has(field.id))
  }, [activeView.visible_fields])

  return (
    <ListView
      items={spaceItems}
      visibleFields={visibleFields}
      roster={roster}
      currentUserId={currentUserId}
      activeView={activeView}
      allFields={ROLLUP_FIELDS}
      onViewChange={async (patch) => setActiveView((current) => ({ ...current, ...patch }))}
      onOpenDetail={(item) => {
        if (onOpenItem) {
          const row = items.find((entry) => entry.id === item.id)
          if (row) onOpenItem(row)
          return
        }
        router.push(buildSpaceItemHref(item.space_id, item.id))
      }}
      onUpdateItem={async (itemId, payload) => {
        const item = spaceItems.find((row) => row.id === itemId)
        const source = items.find((row) => row.id === itemId)
        if (!item || !source) return
        if (persistItem) await persistItem(source, payload)
        else await updateSpaceItem(item.space_id, item.id, payload)
        await reload()
      }}
      onPushToAgent={async (itemId, options) => {
        const item = spaceItems.find((row) => row.id === itemId)
        if (!item) return
        await pushItemToAgent(item.space_id, item.id, options)
        await reload()
      }}
      onDeleteItem={async (itemId) => {
        const item = spaceItems.find((row) => row.id === itemId)
        if (!item) return
        await deleteSpaceItem(item.space_id, item.id)
        await reload()
      }}
      onAddItemInGroup={async (title) => {
        if (onAddItem) {
          await onAddItem(title)
          await reload()
          return
        }
        throw new Error('Choose a Campaign Space before adding a task.')
      }}
      quickAddOnSubmitItem={
        onAddItem
          ? async (title) => {
              await onAddItem(title)
              await reload()
            }
          : undefined
      }
      quickAddInactiveAction={
        onAddItem
          ? undefined
          : () => toast.info('Open a Campaign Space to add a task in the correct client context.')
      }
    />
  )
}

function toSpaceItem(item: TaskRollupItem): SpaceItem {
  return {
    id: item.id,
    space_id: item.space_id,
    org_id: item.org_id ?? '',
    user_id: item.user_id ?? '',
    title: item.title,
    status: item.status,
    priority: item.priority ?? null,
    assignee_type: item.assignee_type ?? 'unassigned',
    assignee_id: item.assignee_id ?? null,
    assignees: item.assignees,
    start_date: item.start_date ?? null,
    due_date: item.due_at,
    recurrence: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    description: item.description ?? null,
    notes: item.notes ?? null,
    doc_body: null,
    source: item.source ?? 'manual',
    linked_mission_id: item.linked_mission_id ?? null,
    form_id: null,
    task_execution_status: null,
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    sort_order: item.sort_order ?? 0,
    custom_data: {
      ...(item.custom_data ?? {}),
      campaign_name: item.campaign_name,
      space_title: item.space_title,
    },
    created_at: item.created_at,
    updated_at: item.updated_at ?? item.created_at,
  }
}
