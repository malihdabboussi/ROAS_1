import { backendGet, backendPost } from '@/lib/api/backend-client'

export interface BrainCrossSuggestion {
  id: string
  user_id: string
  org_id: string | null
  source_job_id: string
  source_job_type: string
  source_title: string
  target_campaign_id: string
  target_campaign_name: string
  reason: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  result_job_id: string | null
  created_at: string
  decided_at: string | null
}

export async function listCrossSuggestions(status?: string): Promise<BrainCrossSuggestion[]> {
  const params = status ? `?status=${status}` : ''
  return backendGet<BrainCrossSuggestion[]>(`/brain/cross-suggestions${params}`)
}

export async function acceptCrossSuggestion(
  id: string,
): Promise<{ accepted: boolean; jobId: string }> {
  return backendPost<{ accepted: boolean; jobId: string }>(
    `/brain/cross-suggestions/${id}/accept`,
    {},
  )
}

export async function rejectCrossSuggestion(id: string): Promise<{ rejected: boolean }> {
  return backendPost<{ rejected: boolean }>(`/brain/cross-suggestions/${id}/reject`, {})
}
