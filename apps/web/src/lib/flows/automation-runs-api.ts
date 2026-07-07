import { backendGet } from '@/lib/api/backend-client'

export interface AutomationRun {
  id: string
  space_id: string
  item_id: string
  automation_id: string
  trigger_event: Record<string, unknown>
  actions_executed: Record<string, unknown>[]
  status: 'success' | 'partial' | 'failed'
  linked_mission_id: string | null
  error: string | null
  created_at: string
}

export interface AutomationRunsScope {
  campaignId?: string | null
  spaceId?: string | null
}

export async function fetchAutomationRuns(
  scope: string | AutomationRunsScope,
): Promise<AutomationRun[]> {
  if (typeof scope === 'string') {
    return backendGet<AutomationRun[]>(`/api/spaces/${scope}/automations/runs`)
  }

  const params = new URLSearchParams()
  if (scope.campaignId) params.set('campaign_id', scope.campaignId)
  if (scope.spaceId) params.set('space_id', scope.spaceId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return backendGet<AutomationRun[]>(`/api/automations/runs${suffix}`)
}
