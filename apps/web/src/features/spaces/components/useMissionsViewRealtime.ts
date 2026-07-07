import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import type { Mission, MissionSubtask } from '@/lib/missions'
import { createClient } from '@/lib/supabase/client'

type RealtimeRecord = Record<string, unknown>

type MissionRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: RealtimeRecord | null
  old: RealtimeRecord | null
}

type MissionRealtimeChange =
  | { type: 'upsert'; mission: Mission }
  | { type: 'delete'; missionId: string }

function readStringField(row: RealtimeRecord | null | undefined, field: string): string | null {
  const value = row?.[field]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readMissionRealtimeChange(
  payload: MissionRealtimePayload,
  campaignId: string,
): MissionRealtimeChange | null {
  if (payload.eventType === 'DELETE') {
    const missionId = readStringField(payload.old, 'id')
    const deletedCampaignId = readStringField(payload.old, 'campaign_id')
    if (!missionId || (deletedCampaignId && deletedCampaignId !== campaignId)) return null
    return { type: 'delete', missionId }
  }

  const mission = payload.new as Mission | null
  if (!mission?.id || mission.campaign_id !== campaignId) return null
  return { type: 'upsert', mission }
}

function readSubtaskMissionId(
  payload: MissionRealtimePayload,
  cachedSubtasks: Record<string, MissionSubtask[]>,
): string | null {
  const missionId =
    readStringField(payload.new, 'mission_id') ?? readStringField(payload.old, 'mission_id')
  if (missionId) return missionId

  const subtaskId = readStringField(payload.new, 'id') ?? readStringField(payload.old, 'id')
  if (!subtaskId) return null

  for (const [cachedMissionId, subtasks] of Object.entries(cachedSubtasks)) {
    if (subtasks.some((subtask) => subtask.id === subtaskId)) return cachedMissionId
  }

  return null
}

interface UseMissionsViewRealtimeParams {
  campaignId: string
  subtasksCacheRef: MutableRefObject<Record<string, MissionSubtask[]>>
  missionsByIdRef: MutableRefObject<Map<string, Mission>>
  missionRefreshTimersRef: MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>
  upsertRealtimeMission: (mission: Mission) => void
  removeRealtimeMission: (missionId: string) => void
  refreshMissionFromSubtaskChange: (missionId: string) => void
}

export function useMissionsViewRealtime({
  campaignId,
  subtasksCacheRef,
  missionsByIdRef,
  missionRefreshTimersRef,
  upsertRealtimeMission,
  removeRealtimeMission,
  refreshMissionFromSubtaskChange,
}: UseMissionsViewRealtimeParams) {
  useEffect(() => {
    const supabase = createClient()

    const missionsCh = supabase
      .channel(`spaces-missions-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const change = readMissionRealtimeChange(payload as MissionRealtimePayload, campaignId)
          if (!change) return
          if (change.type === 'delete') {
            removeRealtimeMission(change.missionId)
            return
          }
          upsertRealtimeMission(change.mission)
        },
      )
      .subscribe()

    const subtasksCh = supabase
      .channel(`spaces-mission-subtasks-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_subtasks' },
        (payload) => {
          const missionId = readSubtaskMissionId(
            payload as MissionRealtimePayload,
            subtasksCacheRef.current,
          )
          if (!missionId || !missionsByIdRef.current.has(missionId)) return
          refreshMissionFromSubtaskChange(missionId)
        },
      )
      .subscribe()

    return () => {
      for (const timer of Object.values(missionRefreshTimersRef.current)) {
        clearTimeout(timer)
      }
      missionRefreshTimersRef.current = {}
      void supabase.removeChannel(missionsCh)
      void supabase.removeChannel(subtasksCh)
    }
  }, [
    campaignId,
    missionsByIdRef,
    missionRefreshTimersRef,
    refreshMissionFromSubtaskChange,
    removeRealtimeMission,
    subtasksCacheRef,
    upsertRealtimeMission,
  ])
}
