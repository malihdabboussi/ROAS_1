'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
import { ALL_MEETINGS_LIST_FIELD_IDS } from '@/lib/spaces/all-meetings-list-columns'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'

const MEETING_FIELDS: FieldDef[] = [
  ...DEFAULT_SPACE_SCHEMA.fields,
  {
    id: 'call_kind',
    name: 'Call Kind',
    type: 'select',
    options: [
      { id: 'private', label: 'Personal', color: 'emerald' },
      { id: 'team', label: 'Team', color: 'violet' },
      { id: 'executive', label: 'Executive', color: 'amber' },
      { id: 'client', label: 'Client', color: 'cyan' },
      { id: 'partner', label: 'Partner', color: 'blue' },
      { id: 'sales', label: 'Sales', color: 'orange' },
    ],
  },
  { id: 'client_campaign', name: 'Client / Campaign', type: 'text' },
  { id: 'campaign_name', name: 'Client Workspace', type: 'text' },
  { id: 'space_title', name: 'Campaign Space', type: 'text' },
  { id: 'host', name: 'Host', type: 'text' },
  {
    id: 'call_status',
    name: 'Call status',
    type: 'select',
    options: [
      { id: 'live', label: 'Live', color: 'emerald' },
      { id: 'completed', label: 'Completed', color: 'blue' },
      { id: 'no_show', label: 'No Show', color: 'red' },
      { id: 'rescheduled', label: 'Rescheduled', color: 'amber' },
    ],
  },
  { id: 'recording_url', name: 'Recording', type: 'url' },
  { id: 'call_date', name: 'Call Date', type: 'date' },
]

const DEFAULT_MEETINGS_VIEW: ViewDef = {
  id: 'all-meetings',
  type: 'list',
  name: 'List',
  visible_fields: [...ALL_MEETINGS_LIST_FIELD_IDS],
  column_widths: {
    title: 360,
    call_kind: 110,
    campaign_name: 180,
    space_title: 180,
    host: 160,
    call_date: 170,
    call_status: 140,
    recording_url: 220,
  },
  date_display_formats: { call_date: 'date_time' },
}

export function AllMeetingsNativeList({
  items,
  reload,
  onOpenItem,
  persistItem,
}: {
  items: SpaceItem[]
  reload: () => Promise<void>
  onOpenItem?: (item: SpaceItem) => void
  persistItem?: (item: SpaceItem, payload: Partial<SpaceItem>) => Promise<unknown>
}) {
  const router = useRouter()
  const roster = useSpacesStore((state) => state.roster)
  const currentUserId = useSpacesStore((state) => state.currentUserId)
  const loadRoster = useSpacesStore((state) => state.loadRoster)
  const [activeView, setActiveView] = useState<ViewDef>(DEFAULT_MEETINGS_VIEW)

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  const visibleFields = useMemo(() => {
    const byId = new Map(MEETING_FIELDS.map((field) => [field.id, field]))
    return (activeView.visible_fields ?? [])
      .map((id) => byId.get(id))
      .filter((field): field is FieldDef => Boolean(field))
  }, [activeView.visible_fields])

  return (
    <ListView
      items={items}
      visibleFields={visibleFields}
      roster={roster}
      currentUserId={currentUserId}
      activeView={activeView}
      allFields={MEETING_FIELDS}
      onViewChange={async (patch) => setActiveView((current) => ({ ...current, ...patch }))}
      onOpenDetail={(item) => {
        if (onOpenItem) {
          onOpenItem(item)
          return
        }
        router.push(buildSpaceItemHref(item.space_id, item.id))
      }}
      onUpdateItem={async (itemId, payload) => {
        const item = items.find((row) => row.id === itemId)
        if (!item) return
        if (persistItem) await persistItem(item, payload)
        else await updateSpaceItem(item.space_id, item.id, payload)
        await reload()
      }}
      onPushToAgent={async (itemId, options) => {
        const item = items.find((row) => row.id === itemId)
        if (!item) return
        await pushItemToAgent(item.space_id, item.id, options)
        await reload()
      }}
      onDeleteItem={async (itemId) => {
        const item = items.find((row) => row.id === itemId)
        if (!item) return
        await deleteSpaceItem(item.space_id, item.id)
        await reload()
      }}
      onAddItemInGroup={async () => undefined}
    />
  )
}
