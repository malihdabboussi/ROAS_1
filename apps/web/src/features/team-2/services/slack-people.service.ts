import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type SlackRelationshipKind = 'internal' | 'external' | 'ignored'
export type SlackRelationshipSource = 'inferred' | 'manual'
export type SlackIdentityMatchMethod = 'none' | 'email' | 'suggested_name' | 'confirmed_name'
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
  suggested_vibey_user_id: string | null
  contact_id: string | null
  person_brain_id: string | null
  relationship_kind: SlackRelationshipKind
  relationship_source: SlackRelationshipSource
  identity_match_method: SlackIdentityMatchMethod
  identity_match_confidence: number
  delivery_mode: SlackDeliveryMode
  last_seen_at: string
  brain_id: string | null
  brain_name: string | null
  brain_kind: 'portal_user' | 'managed_person' | null
  slack_channels: string[]
}

export interface SlackPortalUser {
  user_id: string
  display_name: string
  email: string | null
  avatar_url: string | null
  role: string
}

export interface SlackPersonActivityMessage {
  ts: string
  text: string
  direction: 'inbound' | 'outbound'
  thread_ts: string | null
  is_thread_reply: boolean
  reply_count: number
}

export interface SlackPersonActivity {
  channel_id: string
  messages: SlackPersonActivityMessage[]
  actions: SlackShadowAction[]
}

export interface SlackChannelSummary {
  id: string
  name: string
  is_private: boolean
}

export interface SlackChannelActivityMessage {
  ts: string
  text: string
  sender_name: string
  direction: 'inbound' | 'outbound'
  thread_ts: string | null
  is_thread_reply: boolean
}

export interface SlackChannelActivity {
  channel: { id: string; name: string }
  messages: SlackChannelActivityMessage[]
}

export interface SlackChannelCoverageSummary {
  discovered: number
  joined: number
  observed: number
  excluded: number
  inaccessible: number
}

export interface SlackChannelCoverageRow {
  channel_id: string
  channel_name: string
  is_private: boolean
  is_member: boolean
  is_excluded: boolean
  join_status: 'discovered' | 'joined' | 'observed' | 'excluded' | 'inaccessible'
  join_error: string | null
  last_reconciled_at: string | null
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
  source_channel_id: string | null
  source_message_ts: string | null
  sent_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface SlackPersonBrainBackfillResult {
  provisioned_person_brains: number
  mapped_channels: number
  queued_jobs: number
  deduped_jobs: number
  lookback_days: number
}

export interface SlackAutomationHealth {
  window_hours: number
  ran: number
  skipped: Record<string, number>
  delivered: number
  held: Record<string, number>
  last_run_at: string | null
}

export function fetchSlackAutomationHealth() {
  return backendGet<SlackAutomationHealth>('/api/integrations/slack/intelligence/automation-health')
}

export function fetchSlackPeople() {
  return backendGet<{
    connected: boolean
    people: SlackDiscoveredPerson[]
    portal_users?: SlackPortalUser[]
  }>('/api/integrations/slack/people')
}

export function refreshSlackPeople() {
  return backendPost<{
    connected: boolean
    people: SlackDiscoveredPerson[]
    portal_users?: SlackPortalUser[]
  }>('/api/integrations/slack/people/refresh', {})
}

export function fetchSlackChannels() {
  return backendGet<{ connected: boolean; channels: SlackChannelSummary[] }>(
    '/api/integrations/slack/people/channels',
  )
}

export function fetchSlackChannelActivity(channelId: string) {
  return backendGet<SlackChannelActivity>(
    `/api/integrations/slack/people/channels/${encodeURIComponent(channelId)}/activity`,
  )
}

export function fetchSlackChannelCoverage() {
  return backendGet<{
    summary: SlackChannelCoverageSummary
    channels: SlackChannelCoverageRow[]
  }>('/api/integrations/slack/intelligence/channels/coverage')
}

export function patchSlackChannelExclusion(channelId: string, excluded: boolean) {
  return backendPatch<{
    summary: SlackChannelCoverageSummary
    channels: SlackChannelCoverageRow[]
  }>(`/api/integrations/slack/intelligence/channels/${encodeURIComponent(channelId)}/exclusion`, {
    excluded,
  })
}

export function patchSlackPersonIdentity(id: string, vibeyUserId: string) {
  return backendPatch<{ person: SlackDiscoveredPerson }>(
    `/api/integrations/slack/people/${id}/identity`,
    { vibey_user_id: vibeyUserId },
  )
}

export function createSlackPersonBrain(id: string) {
  return backendPost<{ person: SlackDiscoveredPerson }>(
    `/api/integrations/slack/people/${id}/person-brain`,
    {},
  )
}

export function backfillSlackPersonBrains(lookbackDays = 90) {
  return backendPost<SlackPersonBrainBackfillResult>(
    '/api/integrations/slack/brain-mappings/backfill-person-brains',
    { lookback_days: lookbackDays },
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

export function patchSlackPersonRelationshipKind(
  id: string,
  relationshipKind: SlackRelationshipKind,
) {
  return backendPatch<{ person: SlackDiscoveredPerson }>(
    `/api/integrations/slack/people/${id}/relationship-kind`,
    { relationship_kind: relationshipKind },
  )
}

export function confirmSlackPersonIdentity(id: string) {
  return backendPost<{ person: SlackDiscoveredPerson }>(
    `/api/integrations/slack/people/${id}/confirm-identity`,
    {},
  )
}

export function fetchSlackPersonActivity(id: string) {
  return backendGet<SlackPersonActivity>(`/api/integrations/slack/people/${id}/activity`)
}

export function createSlackTestProposal(personId: string) {
  return backendPost<{ action: SlackShadowAction }>(
    `/api/integrations/slack/people/${personId}/test-proposal`,
    {},
  )
}

export function createSlackProposal(personId: string, proposedContent: string) {
  return backendPost<{ action: SlackShadowAction }>(
    `/api/integrations/slack/people/${personId}/proposals`,
    { proposed_content: proposedContent },
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

export function trainSlackSignal(signalId: string, instruction: string, saveAsRule: boolean) {
  return backendPost<{
    actions: SlackShadowAction[]
    rule: { id: string } | null
    signal: SlackShadowAction
    diagnostics: {
      resolved: boolean
      unmatched_recipients: string[]
      unsupported_destinations: string[]
      explanation: string
    }
  }>(`/api/integrations/slack/intelligence/signals/${signalId}/train`, {
    instruction,
    save_as_rule: saveAsRule,
  })
}

export function refreshSlackSignal(signalId: string) {
  return backendPost<{
    action: SlackShadowAction
    resolution: {
      resolved: boolean
      reason: string
      checked_at: string
      reply_count: number
      reaction_count: number
    }
  }>(`/api/integrations/slack/intelligence/signals/${signalId}/refresh`, {})
}
