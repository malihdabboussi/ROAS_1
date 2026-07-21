import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  backendPut,
} from '@/lib/api/backend-client'
import type {
  AgentCapabilityKind,
  AgentOverride,
  AgentOverrideMode,
  AgentTeam,
  AgentTeamExternalMember,
  AgentTeamGrant,
  AgentTeamKind,
  AgentTeamMember,
  ResolvedAgentPolicyJson,
} from './agent-teams.types'

const BASE = '/api/agent-teams'

export async function listTeams(): Promise<AgentTeam[]> {
  return backendGet<AgentTeam[]>(BASE)
}

export async function createTeam(payload: {
  name: string
  color?: string
  icon?: string
  parent_team_id?: string | null
  team_kind?: AgentTeamKind
}): Promise<AgentTeam> {
  return backendPost<AgentTeam>(BASE, payload)
}

export async function updateTeam(
  teamId: string,
  patch: { name?: string; color?: string; icon?: string; parent_team_id?: string | null },
): Promise<AgentTeam> {
  return backendPatch<AgentTeam>(`${BASE}/${teamId}`, patch)
}

export async function deleteTeam(teamId: string): Promise<{
  deleted: true
  reassigned_to_team_id: string | null
}> {
  return backendDelete<{ deleted: true; reassigned_to_team_id: string | null }>(`${BASE}/${teamId}`)
}

export async function listMyTeamMemberships(): Promise<{ team_ids: string[] }> {
  return backendGet<{ team_ids: string[] }>(`${BASE}/memberships/me`)
}

export async function listTeamMembers(teamId: string): Promise<AgentTeamMember[]> {
  return backendGet<AgentTeamMember[]>(`${BASE}/${teamId}/members`)
}

export async function listTeamExternalMembers(teamId: string): Promise<AgentTeamExternalMember[]> {
  return backendGet<AgentTeamExternalMember[]>(`${BASE}/${teamId}/external-members`)
}

export async function addTeamExternalMember(
  teamId: string,
  personId: string,
): Promise<AgentTeamExternalMember> {
  return backendPut<AgentTeamExternalMember>(`${BASE}/${teamId}/external-members`, {
    person_id: personId,
  })
}

export async function removeTeamExternalMember(
  teamId: string,
  personId: string,
): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(`${BASE}/${teamId}/external-members/${personId}`)
}

export async function addTeamMember(teamId: string, userId: string): Promise<AgentTeamMember> {
  return backendPut<AgentTeamMember>(`${BASE}/${teamId}/members`, { user_id: userId })
}

export async function removeTeamMember(teamId: string, userId: string): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(`${BASE}/${teamId}/members/${userId}`)
}

export async function listTeamGrants(teamId: string): Promise<AgentTeamGrant[]> {
  return backendGet<AgentTeamGrant[]>(`${BASE}/${teamId}/grants`)
}

export interface TeamSpendingTotals {
  credits: number
  costUsd: number
  eventCount: number
}

export interface TeamSpendingDailyPoint {
  day: string
  credits: number
  costUsd: number
  eventCount: number
}

export interface TeamSpendingResponse {
  totals: TeamSpendingTotals
  previousTotals: TeamSpendingTotals
  daily: TeamSpendingDailyPoint[]
}

export async function getTeamSpending(
  teamId: string,
  startDate: string,
  endDate: string,
  campaignIds?: string[],
): Promise<TeamSpendingResponse> {
  const params = new URLSearchParams({ startDate, endDate })
  if (campaignIds && campaignIds.length > 0) {
    params.set('campaignIds', campaignIds.join(','))
  }
  return backendGet<TeamSpendingResponse>(`${BASE}/${teamId}/spending?${params.toString()}`)
}

export async function setTeamGrants(
  teamId: string,
  grants: Array<{ kind: AgentCapabilityKind; id: string }>,
): Promise<AgentTeamGrant[]> {
  return backendPut<AgentTeamGrant[]>(`${BASE}/${teamId}/grants`, { grants })
}

export async function getAgentPolicy(agentKey: string): Promise<ResolvedAgentPolicyJson> {
  return backendGet<ResolvedAgentPolicyJson>(`${BASE}/agents/${agentKey}/policy`)
}

export async function setAgentTeam(
  agentKey: string,
  teamId: string | null,
): Promise<{ agent_key: string; team_id: string | null }> {
  return backendPatch<{ agent_key: string; team_id: string | null }>(
    `${BASE}/agents/${agentKey}/team`,
    { team_id: teamId },
  )
}

export async function listAgentOverrides(agentKey: string): Promise<AgentOverride[]> {
  return backendGet<AgentOverride[]>(`${BASE}/agents/${agentKey}/overrides`)
}

export async function setAgentOverrides(
  agentKey: string,
  overrides: Array<{ kind: AgentCapabilityKind; id: string; mode: AgentOverrideMode }>,
): Promise<AgentOverride[]> {
  return backendPut<AgentOverride[]>(`${BASE}/agents/${agentKey}/overrides`, { overrides })
}
