'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import type { MissionDeliverable } from '@/lib/missions'
import { createClient } from '@/lib/supabase/client'
import { collectTaskDeliverablesFromActivity } from '../lib/collect-task-deliverables'
import { mergeActivityEntry } from '../lib/merge-activity-entry'
import {
  fetchItemActivity,
  fetchSubtasks,
  type SpaceItemActivity,
} from '../services/spaces.service'
import type { SpaceItem } from '../types'

type SpaceItemRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

interface MissionLog {
  id: string
  mission_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

interface TaskDetailData {
  subtasks: SpaceItem[]
  /** Agent outputs + comment attachments from `space_item_activity` (not mission deliverables). */
  taskDeliverables: MissionDeliverable[]
  missionLogs: MissionLog[]
  loading: boolean
  reload: () => void
  setSubtasks: React.Dispatch<React.SetStateAction<SpaceItem[]>>
  appendActivityRow: (row: SpaceItemActivity) => void
}

function mergeRealtimeSubtask(
  prev: SpaceItem[],
  parentItemId: string,
  spaceId: string,
  row: Record<string, unknown> | null,
): SpaceItem[] {
  const itemId = typeof row?.id === 'string' ? row.id : null
  if (!itemId) return prev
  const isCurrentSubtask = row?.space_id === spaceId && row?.parent_item_id === parentItemId
  if (!isCurrentSubtask) return prev.filter((subtask) => subtask.id !== itemId)

  const next = row as unknown as SpaceItem
  const exists = prev.some((subtask) => subtask.id === itemId)
  return exists
    ? prev.map((subtask) => (subtask.id === itemId ? next : subtask))
    : [...prev, next]
}

function removeRealtimeSubtask(prev: SpaceItem[], row: Record<string, unknown> | null): SpaceItem[] {
  const itemId = typeof row?.id === 'string' ? row.id : null
  return itemId ? prev.filter((subtask) => subtask.id !== itemId) : prev
}

export function useTaskDetailData(item: SpaceItem | null): TaskDetailData {
  const [subtasks, setSubtasks] = useState<SpaceItem[]>([])
  const [activityRows, setActivityRows] = useState<SpaceItemActivity[]>([])
  const [missionLogs, setMissionLogs] = useState<MissionLog[]>([])
  const [loading, setLoading] = useState(false)

  const taskDeliverables = useMemo(
    () => collectTaskDeliverablesFromActivity(activityRows),
    [activityRows],
  )

  const load = useCallback(async () => {
    if (!item) return
    setLoading(true)
    try {
      const promises: Promise<void>[] = []

      promises.push(
        fetchSubtasks(item.space_id, item.id)
          .then(setSubtasks)
          .catch(() => setSubtasks([])),
      )

      promises.push(
        fetchItemActivity(item.space_id, item.id)
          .then(setActivityRows)
          .catch(() => setActivityRows([])),
      )

      if (item.linked_mission_id) {
        promises.push(
          backendGet<MissionLog[]>(`/api/missions/${item.linked_mission_id}/logs`)
            .then(setMissionLogs)
            .catch(() => setMissionLogs([])),
        )
      } else {
        setMissionLogs([])
      }

      await Promise.all(promises)
    } finally {
      setLoading(false)
    }
  }, [item?.id, item?.space_id, item?.linked_mission_id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!item?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`task-detail-activity-${item.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_item_activity',
          filter: `item_id=eq.${item.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const next = payload.new as SpaceItemActivity
            if (next?.id) {
              setActivityRows((prev) => mergeActivityEntry(prev, next))
            }
            return
          }

          if (payload.eventType === 'DELETE') {
            const previous = payload.old as { id?: string } | null
            if (previous?.id) {
              setActivityRows((prev) => prev.filter((row) => row.id !== previous.id))
            }
            return
          }

          void load()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_items',
          filter: `space_id=eq.${item.space_id}`,
        },
        (payload) => {
          const change = payload as SpaceItemRealtimePayload
          if (change.eventType === 'INSERT' || change.eventType === 'UPDATE') {
            setSubtasks((prev) =>
              mergeRealtimeSubtask(prev, item.id, item.space_id, change.new),
            )
            return
          }
          if (change.eventType === 'DELETE') {
            setSubtasks((prev) => removeRealtimeSubtask(prev, change.old))
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [item?.id, item?.space_id, load])

  const appendActivityRow = useCallback((row: SpaceItemActivity) => {
    setActivityRows((prev) => mergeActivityEntry(prev, row))
  }, [])

  return {
    subtasks,
    taskDeliverables,
    missionLogs,
    loading,
    reload: () => void load(),
    setSubtasks,
    appendActivityRow,
  }
}
