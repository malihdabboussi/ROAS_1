import {
  fetchMissionAgents as fetchMissionAgentsBase,
  fetchMissionAgentsSlim as fetchMissionAgentsSlimBase,
  invalidateMissionAgentsCache,
} from '@/lib/agents/mission-agents-api'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type {
  AwarenessPoint,
  Mission,
  MissionAccessRequest,
  MissionAgent,
  MissionAgentSidebar,
  MissionAgentSkill,
  MissionAgentSkillResource,
  MissionAgentWorkflow,
  MissionDeliverable,
  MissionLog,
  MissionPlan,
} from '../types'
import { invalidateAgentSkillsCache } from './agent-skills.service'

export { fetchReadyEmployeeLibrary, hireReadyEmployee } from '@/lib/agents/ready-employees-api'
export {
  createMission,
  fetchDeliverablesForMissions,
  fetchMissionById,
  fetchMissions,
  fetchSubtasks,
} from '@/lib/missions/missions-api'
export type { FireEmployeeHandoffInput } from '@/lib/agents/agent-fire-handoff'
export type {
  HireReadyEmployeeInput,
  HireReadyEmployeeResponse,
} from '@/lib/agents/ready-employees-api'
export {
  fireEmployee,
  fetchAgentUserState,
  fetchAgentSkillDenies,
  repairAgentSetup,
  renameAgent,
  setAgentSkillOverride,
  updateAgentActive,
  updateAgentCommunication,
  updateAgentUserState,
  updateAgentImage,
} from '@/lib/agents/mission-agents-api'
export type { AgentUserState, FireEmployeeResponse } from '@/lib/agents/mission-agents-api'

export async function fetchMissionLogs(missionId: string): Promise<MissionLog[]> {
  return backendGet<MissionLog[]>(`/api/missions/${missionId}/logs`)
}

export async function fetchMissionPlan(missionId: string): Promise<MissionPlan | null> {
  try {
    return await backendGet<MissionPlan>(`/api/missions/${missionId}/plan`)
  } catch {
    return null
  }
}

export async function fetchMissionDeliverables(missionId: string): Promise<MissionDeliverable[]> {
  try {
    return await backendGet<MissionDeliverable[]>(`/api/missions/${missionId}/deliverables`)
  } catch {
    return []
  }
}

/**
 * Fetches the agent roster with a 60s TTL + in-flight dedupe (`cachedFetch`).
 * Agent mutations in this service invalidate the key; pass `{ force: true }`
 * when reacting to an external change (e.g. a realtime `agents_registry` event).
 */
export async function fetchMissionAgents(opts?: { force?: boolean }): Promise<MissionAgent[]> {
  return fetchMissionAgentsBase(opts) as Promise<MissionAgent[]>
}

export async function fetchMissionAgentsSlim(): Promise<MissionAgentSidebar[]> {
  return fetchMissionAgentsSlimBase() as Promise<MissionAgentSidebar[]>
}

export async function backfillBrainScholar(): Promise<{
  ok: boolean
  created: boolean
  message?: string
}> {
  const res = await backendPost<{ ok: boolean; created: boolean; message?: string }>(
    '/api/agents/backfill-brain-scholar',
    {},
  )
  if (res.created) invalidateMissionAgentsCache()
  return res
}

export async function backfillMissingAvatars(): Promise<{ ok: boolean; triggered: number }> {
  return backendPost<{ ok: boolean; triggered: number }>('/api/agents/backfill-avatars', {})
}

export type MissionCommentAttachment = {
  filename: string
  mimeType: string
  sizeBytes: number
  fileUrl: string
  text?: string
  type: 'text' | 'image' | 'video'
}

export async function addMissionComment(
  missionId: string,
  message: string,
  attachments?: MissionCommentAttachment[],
): Promise<MissionLog> {
  return backendPost<MissionLog>(`/api/missions/${missionId}/comment`, {
    message,
    ...(attachments?.length ? { attachments } : {}),
  })
}

export async function approveMissionPlan(missionId: string): Promise<{
  ok: boolean
  hired: Array<{ role_key: string; agent_key: string }>
}> {
  return backendPost(`/api/missions/${missionId}/approve-plan`, {})
}

export async function rejectMissionPlan(missionId: string): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/${missionId}/reject-plan`, {})
}

export async function fetchMissionAccessRequests(
  missionId: string,
): Promise<MissionAccessRequest[]> {
  return backendGet<MissionAccessRequest[]>(`/api/missions/${missionId}/access-requests`)
}

export async function approveMissionAccessRequests(
  missionId: string,
  requestIds?: string[],
): Promise<{
  ok: boolean
  approved: MissionAccessRequest[]
  requeued_subtask_ids: string[]
}> {
  return backendPost(`/api/missions/${missionId}/access-requests/approve`, {
    ...(requestIds?.length ? { request_ids: requestIds } : {}),
  })
}

export async function denyMissionAccessRequests(
  missionId: string,
  requestIds?: string[],
): Promise<{ ok: boolean; denied: MissionAccessRequest[]; blocked_subtask_ids: string[] }> {
  return backendPost(
    `/api/missions/${missionId}/access-requests/deny`,
    requestIds?.length ? { request_ids: requestIds } : {},
  )
}

export async function retryMission(missionId: string): Promise<Mission> {
  return backendPost<Mission>(`/api/missions/${missionId}/retry`, {})
}

export async function updateMission(
  missionId: string,
  payload: Partial<Pick<Mission, 'title' | 'brief' | 'priority' | 'assigned_agent_key'>>,
): Promise<Mission> {
  return backendPatch<Mission>(`/api/missions/${missionId}`, payload)
}

export async function updateMissionStatus(
  missionId: string,
  payload: { status: Mission['status'] },
): Promise<Mission> {
  return backendPatch<Mission>(`/api/missions/${missionId}/status`, payload)
}

export async function trashMission(missionId: string): Promise<void> {
  return backendDelete(`/api/missions/${missionId}`)
}

// Cached agent-skills fetchers live in `agent-skills.service.ts` (this file
// is at the max-lines lint budget); re-exported here so existing import
// sites keep working. Skill/resource mutations below call
// `invalidateAgentSkillsCache` so those caches never serve stale data.
export {
  fetchAgentSkills,
  fetchAgentSkillsForAgents,
  invalidateAgentSkillsCache,
} from './agent-skills.service'

export async function fetchAgentWorkflows(agentKey: string): Promise<MissionAgentWorkflow[]> {
  return backendGet<MissionAgentWorkflow[]>(`/api/agents/${agentKey}/workflows`)
}

export async function createAgentSkill(
  agentKey: string,
  payload: {
    skill_key: string
    name: string
    description: string
    markdown_content: string
    is_enabled?: boolean
  },
): Promise<MissionAgentSkill> {
  const created = await backendPost<MissionAgentSkill>(`/api/agents/${agentKey}/skills`, payload)
  invalidateAgentSkillsCache(agentKey)
  return created
}

export async function updateAgentSkill(
  agentKey: string,
  skillId: string,
  payload: Partial<{
    skill_key: string
    name: string
    description: string
    markdown_content: string
    is_enabled: boolean
  }>,
): Promise<MissionAgentSkill> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  const updated = await backendPatch<MissionAgentSkill>(
    `/api/agents/${agentKey}/skills/${skillId}`,
    payload,
  )
  invalidateAgentSkillsCache(agentKey)
  return updated
}

export async function deleteAgentSkill(
  agentKey: string,
  skillId: string,
): Promise<{ deleted: boolean }> {
  const { backendDelete } = await import('@/lib/api/backend-client')
  await backendDelete(`/api/agents/${agentKey}/skills/${skillId}`)
  invalidateAgentSkillsCache(agentKey)
  return { deleted: true }
}

export async function createAgentSkillResource(
  agentKey: string,
  skillKey: string,
  payload: { file_path: string; content?: string; content_type?: string; storage_url?: string },
): Promise<MissionAgentSkillResource> {
  const created = await backendPost<MissionAgentSkillResource>(
    `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/resources`,
    payload,
  )
  invalidateAgentSkillsCache(agentKey)
  return created
}

export async function updateAgentSkillResource(
  agentKey: string,
  skillKey: string,
  resourceId: string,
  payload: { file_path: string },
): Promise<MissionAgentSkillResource> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  const updated = await backendPatch<MissionAgentSkillResource>(
    `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/resources/${encodeURIComponent(resourceId)}`,
    payload,
  )
  invalidateAgentSkillsCache(agentKey)
  return updated
}

export async function deleteAgentSkillResource(
  agentKey: string,
  skillKey: string,
  resourceId: string,
): Promise<{ deleted: boolean; tombstoned?: boolean }> {
  const { backendDelete } = await import('@/lib/api/backend-client')
  const result = await backendDelete<{ deleted: boolean; tombstoned?: boolean }>(
    `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/resources/${encodeURIComponent(resourceId)}`,
  )
  invalidateAgentSkillsCache(agentKey)
  return result
}

export async function uploadSkillAsset(
  agentKey: string,
  skillKey: string,
  file: File,
  description?: string,
): Promise<MissionAgentSkillResource & { url: string }> {
  const { backendUpload } = await import('@/lib/api/backend-client')
  const formData = new FormData()
  formData.append('file', file)
  const qs = description ? `?description=${encodeURIComponent(description)}` : ''
  const uploaded = await backendUpload<MissionAgentSkillResource & { url: string }>(
    `/api/agents/${agentKey}/skills/${encodeURIComponent(skillKey)}/assets${qs}`,
    formData,
  )
  invalidateAgentSkillsCache(agentKey)
  return uploaded
}

export async function reorderAgents(agentKeys: string[]): Promise<{ ok: boolean }> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  const res = await backendPatch<{ ok: boolean }>('/api/agents/reorder', {
    agent_keys: agentKeys,
  })
  invalidateMissionAgentsCache()
  return res
}

export async function updateSubtask(
  missionId: string,
  subtaskId: string,
  payload: { status?: string; assigned_agent_key?: string; feedback?: string | null },
): Promise<import('../types').MissionSubtask> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  return backendPatch<import('../types').MissionSubtask>(
    `/api/missions/${missionId}/subtasks/${subtaskId}`,
    payload,
  )
}

export async function markAgentOnboardingComplete(agentKey: string): Promise<{ config: unknown }> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  const res = await backendPatch<{ config: unknown }>(
    `/api/agents/${agentKey}/onboarding-complete`,
    {},
  )
  invalidateMissionAgentsCache()
  return res
}

export async function fetchAwarenessPoints(): Promise<AwarenessPoint[]> {
  return backendGet<AwarenessPoint[]>('/api/agents/awareness-points')
}

export async function markAwarenessPointsReadAll(): Promise<{ ok: boolean }> {
  return backendPost<{ ok: boolean }>('/api/agents/awareness-points/read-all', {})
}

export async function markAwarenessPointRead(pointId: string): Promise<{ ok: boolean }> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  return backendPatch<{ ok: boolean }>(`/api/agents/awareness-points/${pointId}/read`, {})
}

export async function deleteAwarenessPoint(pointId: string): Promise<{ ok: boolean }> {
  return backendDelete<{ ok: boolean }>(`/api/agents/awareness-points/${pointId}`)
}

export async function fetchNotifications(opts?: {
  limit?: number
  unreadOnly?: boolean
}): Promise<import('../types').UserNotification[]> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.unreadOnly) params.set('unread_only', 'true')
  return backendGet<import('../types').UserNotification[]>(
    `/api/missions/notifications?${params.toString()}`,
  )
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await backendGet<{ count: number }>('/api/missions/notifications/unread-count')
  return res.count
}

export async function markNotificationsReadAll(): Promise<{ ok: boolean }> {
  return backendPost<{ ok: boolean }>('/api/missions/notifications/read-all', {})
}

export async function markNotificationRead(notificationId: string): Promise<{ ok: boolean }> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  return backendPatch<{ ok: boolean }>(`/api/missions/notifications/${notificationId}/read`, {})
}

export async function deleteNotification(notificationId: string): Promise<{ ok: boolean }> {
  return backendDelete<{ ok: boolean }>(`/api/missions/notifications/${notificationId}`)
}

export async function retryBrainImportJobFromNotification(jobId: string): Promise<void> {
  await backendPost(`/api/brain/import-jobs/${jobId}/retry`, {})
}

export async function fetchProfileSettings(): Promise<{
  preferred_channel: string
  daily_digest_enabled: boolean
  daily_digest_time: string
  awareness_loop_enabled: boolean
  auto_approve_plans: boolean
}> {
  return backendGet('/api/missions/profile/settings')
}

export async function toggleAwareness(
  enabled: boolean,
): Promise<{ awareness_loop_enabled: boolean }> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  return backendPatch<{ awareness_loop_enabled: boolean }>('/api/missions/awareness-toggle', {
    enabled,
  })
}

export async function toggleAutoApprovePlans(
  enabled: boolean,
): Promise<{ auto_approve_plans: boolean }> {
  const { backendPatch } = await import('@/lib/api/backend-client')
  return backendPatch<{ auto_approve_plans: boolean }>('/api/missions/auto-approve-toggle', {
    enabled,
  })
}

export async function deleteReadNotifications(): Promise<{ deleted: number }> {
  return backendDelete<{ deleted: number }>('/api/missions/notifications/read')
}
