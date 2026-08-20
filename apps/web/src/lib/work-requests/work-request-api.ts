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
  resume_conversation_id: string | null
  task_url: string | null
  clickup_url: string | null
}

export type WorkRequestOptions = {
  client_workspaces: Array<{ id: string; name: string }>
  campaign_spaces: Array<{ id: string; name: string; client_workspace_id: string }>
  team_members?: Array<{
    id: string
    name: string
    email?: string | null
    source?: 'portal' | 'org'
  }>
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
      last_error?: string | null
      message?: string
    }

export type WorkRequestUpdate = Partial<{
  client_workspace_id: string
  campaign_space_id: string | null
  request_type: WorkRequestType
  assignee_name: string | null
  assignee_id: string | null
  assignee_email: string | null
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

export type WorkRequestReviewChatMessage = {
  id: string
  conversation_id: string
  role: string
  content: string | null
  metadata: unknown
  created_at: string
}

export type WorkRequestReviewChatResponse = {
  conversation_id: string
  messages: WorkRequestReviewChatMessage[]
}

export async function fetchWorkRequestReviewChat(
  token: string,
): Promise<WorkRequestReviewChatResponse> {
  const response = await fetch(
    `/api/proxy/work-requests/review/${encodeURIComponent(token)}/chat`,
    { method: 'GET', cache: 'no-store' },
  )
  const payload = (await response.json().catch(() => ({}))) as WorkRequestReviewChatResponse & {
    message?: string
    error?: string
  }
  if (!response.ok) {
    throw new WorkRequestApiError(
      payload.message || payload.error || 'The Service Request chat could not be loaded.',
      response.status,
    )
  }
  return {
    conversation_id: payload.conversation_id,
    messages: Array.isArray(payload.messages) ? payload.messages : [],
  }
}

function readWorkRequestReviewSseLine(
  line: string,
  onEvent: (event: Record<string, unknown>) => void,
) {
  if (!line.startsWith('data: ')) return
  const payload = line.slice(6)
  if (payload === '[DONE]') return
  try {
    onEvent(JSON.parse(payload) as Record<string, unknown>)
  } catch {
    // skip malformed lines
  }
}

export function flushWorkRequestReviewSseBuffer(
  buffer: string,
  onEvent: (event: Record<string, unknown>) => void,
): string {
  const lines = buffer.split('\n')
  const remaining = lines.pop() ?? ''
  for (const line of lines) readWorkRequestReviewSseLine(line, onEvent)
  return remaining
}

export function sendWorkRequestReviewChatStream(
  token: string,
  content: string,
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(
        `/api/proxy/work-requests/review/${encodeURIComponent(token)}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ content }),
          signal,
        },
      )
      if (!response.ok || !response.body) {
        reject(new WorkRequestApiError('Chat request failed.', response.status))
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = flushWorkRequestReviewSseBuffer(buffer, onEvent)
      }
      buffer += decoder.decode()
      if (buffer) flushWorkRequestReviewSseBuffer(`${buffer}\n`, onEvent)
      resolve()
    } catch (error) {
      if (signal?.aborted) resolve()
      else reject(error)
    }
  })
}
