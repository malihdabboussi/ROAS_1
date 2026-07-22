import { backendGet } from '@/lib/api/backend-client'

export type TaskRollupView = 'my' | 'all'

export type TaskRollupItem = {
  id: string
  title: string
  status: string
  due_at: string | null
  assignee_user_id: string | null
  assignees: Array<{ type: 'human' | 'agent'; id: string }>
  space_id: string
  space_title: string
  campaign_id: string | null
  campaign_name: string | null
  program_id: string | null
  program_name: string | null
  source_url: string
  created_at: string
  updated_at: string | null
}

export async function fetchTaskRollup(input?: {
  view?: TaskRollupView
  programId?: string | null
  campaignId?: string | null
  limit?: number
}): Promise<TaskRollupItem[]> {
  const params = new URLSearchParams()
  params.set('view', input?.view ?? 'my')
  if (input?.programId) params.set('program_id', input.programId)
  if (input?.campaignId) params.set('campaign_id', input.campaignId)
  if (input?.limit) params.set('limit', String(input.limit))
  return backendGet<TaskRollupItem[]>(`/api/tasks/rollup?${params.toString()}`)
}
