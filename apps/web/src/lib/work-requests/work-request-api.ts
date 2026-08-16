export type WorkRequestState =
  | 'draft'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'finalized'
  | 'refresh_required'

export type WorkRequestPriority = 'low' | 'medium' | 'high' | 'urgent'
export type WorkRequestType =
  | 'design'
  | 'copy'
  | 'funnel'
  | 'ghl'
  | 'ad'
  | 'video'
  | 'other'
  | 'general'

export type WorkRequestAsset = { name: string; url: string; kind?: string }
export type WorkRequestDependency = { title: string; url?: string }

export type PublicWorkRequestDraft = {
  id: string
  client_workspace_id: string
  campaign_space_id: string | null
  request_type: WorkRequestType
  assignee_name: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: WorkRequestPriority
  structured_fields: Record<string, unknown>
  links: string[]
  required_fields: string[]
  missing_fields: string[]
  assets: WorkRequestAsset[]
  dependencies: WorkRequestDependency[]
  requester: { name: string | null }
  status: string
  expires_at: string
  final_task_id: string | null
  sync_status: string
  task_url: string | null
  clickup_url: string | null
}

export type WorkRequestOptions = {
  client_workspaces: Array<{ id: string; name: string }>
  campaign_spaces: Array<{ id: string; name: string; client_workspace_id: string }>
}

export type WorkRequestReviewResponse =
  | { state: 'draft'; draft: PublicWorkRequestDraft; options: WorkRequestOptions }
  | {
      state: Exclude<WorkRequestState, 'draft'>
      expires_at?: string
      final_task_id?: string | null
      sync_status?: string
      task_url?: string | null
      clickup_url?: string | null
      message?: string
    }

export type WorkRequestUpdate = Partial<{
  client_workspace_id: string
  campaign_space_id: string | null
  request_type: WorkRequestType
  assignee_name: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: WorkRequestPriority
  links: string[]
  assets: WorkRequestAsset[]
  dependencies: WorkRequestDependency[]
  structured_fields: Record<
    string,
    string | number | boolean | null | Array<string | number | boolean>
  >
}>

export class WorkRequestApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

async function requestReview(
  token: string,
  method: 'GET' | 'PATCH' | 'POST',
  suffix = '',
  body?: unknown,
): Promise<WorkRequestReviewResponse> {
  const response = await fetch(
    `/api/proxy/work-requests/review/${encodeURIComponent(token)}${suffix}`,
    {
      method,
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  )
  const payload = (await response.json().catch(() => ({}))) as WorkRequestReviewResponse & {
    message?: string
    error?: string
  }
  if (!response.ok) {
    throw new WorkRequestApiError(
      payload.message || payload.error || 'The Service Request could not be updated.',
      response.status,
    )
  }
  return payload
}

export function fetchWorkRequestReview(token: string) {
  return requestReview(token, 'GET')
}

export function updateWorkRequestReview(token: string, update: WorkRequestUpdate) {
  return requestReview(token, 'PATCH', '', update)
}

export function finalizeWorkRequestReview(token: string) {
  return requestReview(token, 'POST', '/finalize')
}

export function requestWorkRequestRefresh(token: string) {
  return requestReview(token, 'POST', '/refresh')
}
