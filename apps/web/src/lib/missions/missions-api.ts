import { backendGet, backendPost } from '@/lib/api/backend-client'
import type {
  CreateMissionInput,
  Mission,
  MissionDeliverable,
  MissionSubtask,
} from './mission-types'

export async function fetchMissions(opts?: {
  campaign_id?: string
  space_id?: string
  limit?: number
}): Promise<Mission[]> {
  const params = new URLSearchParams()
  params.set('limit', String(opts?.limit ?? 50))
  if (opts?.campaign_id) params.set('campaign_id', opts.campaign_id)
  if (opts?.space_id) params.set('space_id', opts.space_id)
  return backendGet<Mission[]>(`/api/missions?${params.toString()}`)
}

export async function fetchMissionById(
  missionId: string,
  opts?: { orgId?: string | null },
): Promise<Mission> {
  const requestOptions = opts ? { orgId: opts.orgId ?? null } : undefined
  try {
    return await backendGet<Mission>(`/api/missions/${missionId}`, requestOptions)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    if (!opts && message.toLowerCase().includes('mission not found')) {
      return backendGet<Mission>(`/api/missions/${missionId}`, { orgId: null })
    }
    throw error
  }
}

export async function createMission(input: CreateMissionInput): Promise<Mission> {
  return backendPost<Mission>('/api/missions', input)
}

export async function exportMissionDeliverablesGoogleDoc(missionId: string): Promise<{
  success: boolean
  tabCount: number
  file: { id: string; name?: string; webViewLink?: string }
}> {
  return backendPost(`/api/missions/${missionId}/deliverables/export-google-doc`, {})
}

export async function fetchDeliverablesForMissions(
  missionIds: string[],
): Promise<Record<string, MissionDeliverable[]>> {
  const out: Record<string, MissionDeliverable[]> = {}
  if (missionIds.length === 0) return out

  try {
    const all = await backendGet<MissionDeliverable[]>(
      `/api/missions/deliverables/batch?mission_ids=${missionIds.join(',')}`,
    )
    for (const deliverable of all) {
      const list = out[deliverable.mission_id]
      if (list) list.push(deliverable)
      else out[deliverable.mission_id] = [deliverable]
    }
  } catch {
    return out
  }

  return out
}

export async function fetchSubtasks(missionId: string): Promise<MissionSubtask[]> {
  return backendGet<MissionSubtask[]>(`/api/missions/${missionId}/subtasks`)
}

export async function completeHumanMissionSubtask(
  missionId: string,
  subtaskId: string,
  summary: string,
): Promise<{ ok: true; deliverable_id: string | null }> {
  return backendPost(`/api/missions/${missionId}/subtasks/${subtaskId}/complete-human`, {
    summary,
  })
}
