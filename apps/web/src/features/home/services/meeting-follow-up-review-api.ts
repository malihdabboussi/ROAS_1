import type { ClientCampaignMapping } from '@/lib/agency-clients'
import { backendPost } from '@/lib/api/backend-client'
import type { FieldDef } from '@/lib/spaces/space-schema-types'

export type PublicMeetingFollowUpReview = {
  meeting: {
    id: string
    space_id: string
    title: string
    summary: string
    client_workspace: string
    client_campaign: ClientCampaignMapping | null
    attendee_ids: string[]
    attendees: string[]
    call_kind: string
    call_status: string
    fields: { call_kind: FieldDef; call_status: FieldDef; attendees: FieldDef }
    follow_ups: Array<{
      id: string
      title: string
      status: string
      owner: string
      due_date: string
    }>
    follow_up_message: string
    conversation_id: string
  }
  client_workspaces: Array<{
    id: string
    name: string
    campaign_id: string
    space_id: string | null
  }>
  expires_at: string
  review_started: boolean
}

async function request<T>(token: string, init?: RequestInit, suffix = ''): Promise<T> {
  const response = await fetch(
    `/api/proxy/meeting-follow-up-reviews/${encodeURIComponent(token)}${suffix}`,
    { cache: 'no-store', ...init },
  )
  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string
    error?: string
  }
  if (!response.ok)
    throw new Error(payload.message || payload.error || 'Meeting review unavailable')
  return payload
}

export function fetchMeetingFollowUpReview(token: string) {
  return request<PublicMeetingFollowUpReview>(token)
}

export function updateMeetingFollowUpReview(
  token: string,
  input: {
    summary: string
    client_campaign: ClientCampaignMapping | null
    attendee_ids: string[]
    call_kind: string
    call_status: string
    follow_up_message: string
    dismissed_follow_up_ids: string[]
    follow_ups: Array<{ id: string; title: string; owner: string; due_date: string }>
  },
) {
  return request<PublicMeetingFollowUpReview>(token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export type MeetingDelegationPreview = {
  delegation_id: string
  confirm_url: string
  tasks: unknown[]
  campaign_id: string | null
}

export function createMeetingDelegationPreview(token: string) {
  return request<MeetingDelegationPreview>(
    token,
    { method: 'POST', signal: AbortSignal.timeout(30_000) },
    '/delegation-preview',
  )
}

export function createAuthenticatedMeetingDelegationPreview(
  review: MeetingPostCallReviewInput & { space_id: string; meeting_item_id: string },
) {
  return backendPost<MeetingDelegationPreview>(
    '/api/meeting-follow-up-reviews/delegation-preview',
    review,
  )
}

export type MeetingPostCallReviewInput = {
  summary: string
  client_campaign: ClientCampaignMapping | null
  attendee_ids: string[]
  call_kind: string
  call_status: string
  follow_up_message: string
  dismissed_follow_up_ids: string[]
  follow_ups: Array<{ id: string; title: string; owner: string; due_date: string }>
}

export type PublicMeetingReviewChat = {
  conversation_id: string
  messages: Array<{
    id: string
    conversation_id: string
    role: string
    content: string | null
    metadata: unknown
    created_at: string
  }>
}

export function fetchMeetingFollowUpReviewChat(token: string) {
  return request<PublicMeetingReviewChat>(token, undefined, '/chat')
}

export async function sendMeetingFollowUpReviewChat(
  token: string,
  content: string,
  onEvent: (event: Record<string, unknown>) => void,
) {
  const response = await fetch(
    `/api/proxy/meeting-follow-up-reviews/${encodeURIComponent(token)}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ content }),
    },
  )
  if (!response.ok || !response.body) throw new Error('Meeting review chat request failed')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        onEvent(JSON.parse(data) as Record<string, unknown>)
      } catch {
        // Ignore malformed stream fragments.
      }
    }
  }
}
