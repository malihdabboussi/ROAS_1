import { backendGet, backendPatch } from '@/lib/api/backend-client'

export interface BrainHealthData {
  total_memories?: number
  [key: string]: unknown
}

export async function fetchBrainHealth(
  agentId?: string,
  brainId?: string,
): Promise<BrainHealthData> {
  const params = new URLSearchParams()
  if (brainId?.trim()) params.set('brain_id', brainId.trim())
  else if (agentId?.trim()) params.set('agent_id', agentId.trim())
  const query = params.toString() ? `?${params.toString()}` : ''
  return backendGet<BrainHealthData>(`/api/brain/health${query}`)
}

export type CortexMaxToggleResponse =
  | { success: true; cortex_max: boolean; initial_sync_triggered: boolean }
  | { success: false; error?: string }

export async function toggleCortexMax(
  brainId: string,
  enabled: boolean,
): Promise<CortexMaxToggleResponse> {
  return backendPatch<CortexMaxToggleResponse>(
    `/api/brain/${encodeURIComponent(brainId)}/cortex-max`,
    { enabled },
  )
}

export async function setCustomerBrainEnabled(enabled: boolean): Promise<{
  success: boolean
  brain_id: string | null
  enabled: boolean
}> {
  return backendPatch<{ success: boolean; brain_id: string | null; enabled: boolean }>(
    '/api/brain/customer/enabled',
    { enabled },
  )
}

export type CompanyCortexSchedule = 'daily' | 'weekdays' | 'manual_only'

export type CompanyCortexSettings = {
  org_id: string
  brain_id: string
  enabled: boolean
  schedule: CompanyCortexSchedule
  local_time: string
  timezone: string
  lookback_hours: number
  include_sources: string[]
  min_activity_threshold: number
  last_successful_dream_at: string | null
}

export async function updateCompanyCortexSettings(input: {
  enabled?: boolean
  schedule?: CompanyCortexSchedule
  localTime?: string
  timezone?: string
  lookbackHours?: number
  minActivityThreshold?: number
}): Promise<{
  success: boolean
  brain_id: string
  enabled: boolean
  settings: CompanyCortexSettings
}> {
  return backendPatch<{
    success: boolean
    brain_id: string
    enabled: boolean
    settings: CompanyCortexSettings
  }>('/api/brain/company/settings', input)
}
