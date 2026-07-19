import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackShadowAction,
  SlackShadowActionDeliveryRecord,
  SlackShadowActionStatus,
} from '../types/slack.types'

@Injectable()
export class SlackPeopleRepository {
  async findOrgSlackIntegration(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{ user_id: string; access_token: string } | null> {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('user_id, access_token')
      .eq('org_id', orgId)
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load organization Slack integration: ${error.message}`)
    if (!data?.user_id || !data.access_token) return null
    return data as { user_id: string; access_token: string }
  }

  async listPeople(supabase: SupabaseClient, orgId: string): Promise<SlackDiscoveredPerson[]> {
    const { data, error } = await supabase
      .from('channel_members')
      .select(
        'id, platform_id, display_name, username, avatar_url, title, timezone, email, is_bot, vibey_user_id, contact_id, relationship_kind, delivery_mode, last_seen_at',
      )
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
      .select(
        'id, platform_id, display_name, username, avatar_url, title, timezone, email, is_bot, vibey_user_id, contact_id, relationship_kind, delivery_mode, last_seen_at',
      )
      .single()
    if (error) throw new Error(`Failed to update Slack delivery mode: ${error.message}`)
    return data as SlackDiscoveredPerson
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
      .select(
        'id, platform_id, display_name, username, avatar_url, title, timezone, email, is_bot, vibey_user_id, contact_id, relationship_kind, delivery_mode, last_seen_at',
      )
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack person: ${error.message}`)
    return (data as SlackDiscoveredPerson | null) ?? null
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
