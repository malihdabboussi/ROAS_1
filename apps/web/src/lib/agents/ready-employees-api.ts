import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { MissionAgent } from './mission-agents-api'
import { invalidateMissionAgentsCache } from './mission-agents-api'
import type { ReadyEmployeeProfile } from './ready-employee-types'

export interface HireReadyEmployeeInput {
  role_key: string
  name?: string
  team_id?: string | null
}

export interface HireReadyEmployeeResponse {
  ok: boolean
  role_key: string
  agent: MissionAgent
}

export async function fetchReadyEmployeeLibrary(): Promise<ReadyEmployeeProfile[]> {
  return backendGet<ReadyEmployeeProfile[]>('/api/agents/ready-library')
}

export async function hireReadyEmployee(
  input: HireReadyEmployeeInput,
): Promise<HireReadyEmployeeResponse> {
  const res = await backendPost<HireReadyEmployeeResponse>('/api/agents/hire-ready', input)
  invalidateMissionAgentsCache()
  return res
}
