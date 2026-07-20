import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackRelationshipKind,
  SlackShadowAction,
  SlackShadowActionDeliveryRecord,
  SlackShadowActionStatus,
} from '../types/slack.types'

const PERSON_SELECT =
  'id, platform_id, display_name, username, avatar_url, title, timezone, email, is_bot, vibey_user_id, suggested_vibey_user_id, contact_id, relationship_kind, relationship_source, identity_match_method, identity_match_confidence, delivery_mode, last_seen_at'

@Injectable()
export class SlackPeopleRepository {
  async findOrgSlackIntegration(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{
    user_id: string
    access_token: string
    metadata: Record<string, unknown>
  } | null> {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('user_id, access_token, metadata')
      .eq('org_id', orgId)
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load organization Slack integration: ${error.message}`)
    if (!data?.user_id || !data.access_token) return null
    return data as { user_id: string; access_token: string; metadata: Record<string, unknown> }
  }

  async listPeople(supabase: SupabaseClient, orgId: string): Promise<SlackDiscoveredPerson[]> {
    const { data, error } = await supabase
      .from('channel_members')
      .select(PERSON_SELECT)
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .eq('is_bot', false)
      .order('display_name', { ascending: true })
    if (error) throw new Error(`Failed to list Slack people: ${error.message}`)
    return (data ?? []) as SlackDiscoveredPerson[]
  }

  async updateDeliveryMode(
    supabase: SupabaseClient,
    input: {
      id: string
      orgId: string
      deliveryMode: SlackDeliveryMode
    },
  ): Promise<SlackDiscoveredPerson> {
    const { data, error } = await supabase
      .from('channel_members')
      .update({ delivery_mode: input.deliveryMode })
      .eq('id', input.id)
      .eq('org_id', input.orgId)
      .eq('platform', 'slack')
      .select(PERSON_SELECT)
      .single()
    if (error) throw new Error(`Failed to update Slack delivery mode: ${error.message}`)
    return data as SlackDiscoveredPerson
  }

  async updateRelationshipKind(
    supabase: SupabaseClient,
    input: { id: string; orgId: string; relationshipKind: SlackRelationshipKind },
  ): Promise<SlackDiscoveredPerson> {
    const { data, error } = await supabase
      .from('channel_members')
      .update({
        relationship_kind: input.relationshipKind,
        relationship_source: 'manual',
      })
      .eq('id', input.id)
      .eq('org_id', input.orgId)
      .eq('platform', 'slack')
      .select(PERSON_SELECT)
      .single()
    if (error) throw new Error(`Failed to classify Slack person: ${error.message}`)
    return data as SlackDiscoveredPerson
  }

  async confirmSuggestedIdentity(
    supabase: SupabaseClient,
    orgId: string,
    id: string,
  ): Promise<SlackDiscoveredPerson | null> {
    const { data: candidate, error: candidateError } = await supabase
      .from('channel_members')
      .select('suggested_vibey_user_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .maybeSingle()
    if (candidateError)
      throw new Error(`Failed to load identity suggestion: ${candidateError.message}`)
    if (!candidate?.suggested_vibey_user_id) return null
    const { data, error } = await supabase
      .from('channel_members')
      .update({
        vibey_user_id: candidate.suggested_vibey_user_id,
        suggested_vibey_user_id: null,
        identity_match_method: 'confirmed_name',
        identity_match_confidence: 1,
        relationship_kind: 'internal',
        relationship_source: 'manual',
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .eq('suggested_vibey_user_id', candidate.suggested_vibey_user_id)
      .select(PERSON_SELECT)
      .maybeSingle()
    if (error) throw new Error(`Failed to confirm identity suggestion: ${error.message}`)
    return (data as SlackDiscoveredPerson | null) ?? null
  }

  async listDefaultUserBrains(
    supabase: SupabaseClient,
    userIds: string[],
  ): Promise<Array<{ id: string; owner_id: string; name: string | null }>> {
    if (userIds.length === 0) return []
    const { data, error } = await supabase
      .from('ns_brains')
      .select('id, owner_id, name')
      .in('owner_id', userIds)
      .eq('scope', 'user')
      .eq('is_default', true)
      .is('org_id', null)
    if (error) throw new Error(`Failed to load linked User Brains: ${error.message}`)
    return data ?? []
  }

  async listShadowActions(
    supabase: SupabaseClient,
    orgId: string,
    limit = 100,
  ): Promise<SlackShadowAction[]> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select(
        'id, agent_key, target_member_id, action_kind, proposed_content, rationale, status, source_channel_id, source_message_ts, workflow_key, reviewed_by, reviewed_at, sent_at, metadata, created_at, updated_at',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(`Failed to list Slack Shadow actions: ${error.message}`)
    return (data ?? []) as SlackShadowAction[]
  }

  async findPerson(
    supabase: SupabaseClient,
    orgId: string,
    id: string,
  ): Promise<SlackDiscoveredPerson | null> {
    const { data, error } = await supabase
      .from('channel_members')
      .select(PERSON_SELECT)
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack person: ${error.message}`)
    return (data as SlackDiscoveredPerson | null) ?? null
  }

  async listPersonShadowActions(
    supabase: SupabaseClient,
    orgId: string,
    personId: string,
  ): Promise<SlackShadowAction[]> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select(
        'id, agent_key, target_member_id, action_kind, proposed_content, rationale, status, source_channel_id, source_message_ts, workflow_key, reviewed_by, reviewed_at, sent_at, metadata, created_at, updated_at',
      )
      .eq('org_id', orgId)
      .eq('target_member_id', personId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(`Failed to load person Shadow activity: ${error.message}`)
    return (data ?? []) as SlackShadowAction[]
  }

  async createShadowAction(
    supabase: SupabaseClient,
    input: {
      orgId: string
      userId: string
      agentKey: string
      targetMemberId: string
      actionKind: 'message' | 'workflow'
      proposedContent: string
      rationale: string
      metadata?: Record<string, unknown>
    },
  ): Promise<SlackShadowAction> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .insert({
        org_id: input.orgId,
        user_id: input.userId,
        agent_key: input.agentKey,
        target_member_id: input.targetMemberId,
        action_kind: input.actionKind,
        proposed_content: input.proposedContent,
        rationale: input.rationale,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create Slack Shadow action: ${error.message}`)
    return data as SlackShadowAction
  }

  async findShadowAction(
    supabase: SupabaseClient,
    orgId: string,
    actionId: string,
  ): Promise<SlackShadowActionDeliveryRecord | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select(
        '*, target:channel_members!slack_shadow_actions_target_member_id_fkey(platform_id, delivery_mode)',
      )
      .eq('id', actionId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack Shadow action: ${error.message}`)
    return (data as SlackShadowActionDeliveryRecord | null) ?? null
  }

  async reviewShadowAction(
    supabase: SupabaseClient,
    input: {
      actionId: string
      orgId: string
      reviewedBy: string
      status: Extract<SlackShadowActionStatus, 'approved' | 'dismissed'>
    },
  ): Promise<SlackShadowAction | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', input.actionId)
      .eq('org_id', input.orgId)
      .eq('status', 'proposed')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to review Slack Shadow action: ${error.message}`)
    return (data as SlackShadowAction | null) ?? null
  }

  async markShadowActionSent(
    supabase: SupabaseClient,
    input: {
      actionId: string
      orgId: string
      sentBy: string
      slackTs: string | null
      metadata: Record<string, unknown>
    },
  ): Promise<SlackShadowAction | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          ...input.metadata,
          slack_message_ts: input.slackTs,
          sent_by: input.sentBy,
        },
      })
      .eq('id', input.actionId)
      .eq('org_id', input.orgId)
      .eq('status', 'sending')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to mark Slack Shadow action sent: ${error.message}`)
    return (data as SlackShadowAction | null) ?? null
  }

  async claimShadowActionForSend(
    supabase: SupabaseClient,
    orgId: string,
    actionId: string,
  ): Promise<SlackShadowAction | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .update({ status: 'sending' })
      .eq('id', actionId)
      .eq('org_id', orgId)
      .eq('status', 'approved')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to claim Slack Shadow action: ${error.message}`)
    return (data as SlackShadowAction | null) ?? null
  }

  async markShadowActionFailed(
    supabase: SupabaseClient,
    orgId: string,
    actionId: string,
  ): Promise<SlackShadowAction | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .update({ status: 'failed' })
      .eq('id', actionId)
      .eq('org_id', orgId)
      .eq('status', 'sending')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to record Slack Shadow action failure: ${error.message}`)
    return (data as SlackShadowAction | null) ?? null
  }
}
