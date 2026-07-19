import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type SlackRelationshipKind = 'team_member' | 'external' | 'unknown'
export type SlackDeliveryMode = 'off' | 'shadow' | 'active'

export interface SlackDiscoveredPerson {
  id: string
  platform_id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  title: string | null
  timezone: string | null
  email: string | null
  is_bot: boolean
  vibey_user_id: string | null
  contact_id: string | null
  relationship_kind: SlackRelationshipKind
  delivery_mode: SlackDeliveryMode
  last_seen_at: string
}

export interface SlackShadowAction {
  id: string
  agent_key: string
  target_member_id: string | null
  action_kind: 'message' | 'workflow'
  proposed_content: string
  rationale: string | null
  status: 'proposed' | 'approved' | 'dismissed' | 'sending' | 'sent' | 'failed'
  workflow_key: string | null
  created_at: string
}

export function fetchSlackPeople() {
  return backendGet<{ connected: boolean; people: SlackDiscoveredPerson[] }>(
    '/api/integrations/slack/people',
  )
}

export function fetchSlackShadowActions() {
  return backendGet<{ actions: SlackShadowAction[] }>(
    '/api/integrations/slack/people/shadow-actions',
  )
}

export function patchSlackPersonDeliveryMode(id: string, deliveryMode: SlackDeliveryMode) {
  return backendPatch<{ person: SlackDiscoveredPerson }>(
    `/api/integrations/slack/people/${id}/delivery-mode`,
    { delivery_mode: deliveryMode },
  )
}

export function createSlackTestProposal(personId: string) {
  return backendPost<{ action: SlackShadowAction }>(
    `/api/integrations/slack/people/${personId}/test-proposal`,
    {},
  )
}

export function reviewSlackShadowAction(
  actionId: string,
  status: Extract<SlackShadowAction['status'], 'approved' | 'dismissed'>,
) {
  return backendPatch<{ action: SlackShadowAction }>(
    `/api/integrations/slack/people/shadow-actions/${actionId}/review`,
    { status },
  )
}

export function sendSlackShadowAction(actionId: string) {
  return backendPost<{ action: SlackShadowAction }>(
    `/api/integrations/slack/people/shadow-actions/${actionId}/send`,
    {},
  )
}
