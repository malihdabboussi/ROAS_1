import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SlackObservationChannelSetting,
  SlackObservationCursor,
  SlackObservationEventInput,
  SlackObservationMessage,
} from '../types/slack-observation.types'

@Injectable()
export class SlackObservationRepository {
  async listChannelSettings(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string },
  ): Promise<SlackObservationChannelSetting[]> {
    const { data, error } = await supabase
      .from('slack_observation_channels')
      .select(
        'channel_id, channel_name, is_private, is_member, is_excluded, exclusion_reason, join_status, join_error, last_message_ts, last_reconciled_at',
      )
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .order('channel_name', { ascending: true })
    if (error) throw new Error(`Failed to list Slack channel settings: ${error.message}`)
    return (data ?? []) as SlackObservationChannelSetting[]
  }

  async findWorkspaceBySlackTeamId(
    supabase: SupabaseClient,
    slackTeamId: string,
  ): Promise<{ org_id: string } | null> {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('org_id')
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .eq('metadata->>team_id', slackTeamId)
      .not('org_id', 'is', null)
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Slack observation workspace: ${error.message}`)
    return data?.org_id ? { org_id: String(data.org_id) } : null
  }

  async listChannelCursors(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string },
  ): Promise<SlackObservationCursor[]> {
    const { data, error } = await supabase
      .from('slack_observation_channels')
      .select('channel_id, last_message_ts, last_reconciled_at')
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
    if (error) throw new Error(`Failed to list Slack observation cursors: ${error.message}`)
    return (data ?? []) as SlackObservationCursor[]
  }

  async upsertChannels(
    supabase: SupabaseClient,
    channels: Array<{
      orgId: string
      slackTeamId: string
      channelId: string
      channelName: string
      isPrivate: boolean
      isMember: boolean
    }>,
  ): Promise<void> {
    if (channels.length === 0) return
    const { error } = await supabase.from('slack_observation_channels').upsert(
      channels.map((channel) => ({
        org_id: channel.orgId,
        slack_team_id: channel.slackTeamId,
        channel_id: channel.channelId,
        channel_name: channel.channelName,
        is_private: channel.isPrivate,
        is_member: channel.isMember,
        last_discovered_at: new Date().toISOString(),
      })),
      { onConflict: 'org_id,slack_team_id,channel_id' },
    )
    if (error) throw new Error(`Failed to store Slack observation channels: ${error.message}`)
  }

  async upsertEvents(
    supabase: SupabaseClient,
    events: SlackObservationEventInput[],
  ): Promise<{ inserted: number; duplicates: number }> {
    if (events.length === 0) return { inserted: 0, duplicates: 0 }
    const { data, error } = await supabase
      .from('slack_observation_events')
      .upsert(
        events.map((event) => ({
          org_id: event.orgId,
          slack_team_id: event.slackTeamId,
          channel_id: event.channelId,
          channel_name: event.channelName,
          message_ts: event.messageTs,
          thread_ts: event.threadTs,
          sender_slack_user_id: event.senderSlackUserId,
          text: event.text,
          is_bot: event.isBot,
          source: event.source,
          metadata: event.metadata ?? {},
        })),
        {
          onConflict: 'org_id,slack_team_id,channel_id,message_ts',
          ignoreDuplicates: true,
        },
      )
      .select('id')
    if (error) throw new Error(`Failed to store Slack observation events: ${error.message}`)
    const inserted = data?.length ?? 0
    return { inserted, duplicates: Math.max(0, events.length - inserted) }
  }

  async advanceChannelCursor(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channelId: string
      lastMessageTs: string
    },
  ): Promise<void> {
    const { error } = await supabase.rpc('advance_slack_observation_cursor', {
      p_org_id: input.orgId,
      p_slack_team_id: input.slackTeamId,
      p_channel_id: input.channelId,
      p_last_message_ts: input.lastMessageTs,
    })
    if (error) throw new Error(`Failed to advance Slack observation cursor: ${error.message}`)
  }

  async markChannelReconciled(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string; channelId: string },
  ): Promise<void> {
    const { error } = await supabase
      .from('slack_observation_channels')
      .update({ last_reconciled_at: new Date().toISOString(), join_status: 'observed' })
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('channel_id', input.channelId)
    if (error) throw new Error(`Failed to mark Slack channel reconciled: ${error.message}`)
  }

  async updateChannelExclusion(
    supabase: SupabaseClient,
    input: { orgId: string; channelId: string; excluded: boolean; reason?: string | null },
  ): Promise<void> {
    const { error } = await supabase
      .from('slack_observation_channels')
      .update({
        is_excluded: input.excluded,
        exclusion_reason: input.excluded ? (input.reason ?? 'Excluded by an administrator') : null,
        join_status: input.excluded ? 'excluded' : 'discovered',
        join_error: null,
      })
      .eq('org_id', input.orgId)
      .eq('channel_id', input.channelId)
    if (error) throw new Error(`Failed to update Slack channel exclusion: ${error.message}`)
  }

  async recordChannelJoinOutcome(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channelId: string
      joined: boolean
      error?: string | null
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('slack_observation_channels')
      .update({
        is_member: input.joined,
        join_status: input.joined ? 'joined' : 'inaccessible',
        join_error: input.error ?? null,
        last_join_attempt_at: new Date().toISOString(),
      })
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('channel_id', input.channelId)
    if (error) throw new Error(`Failed to store Slack join outcome: ${error.message}`)
  }

  async listEventsSince(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      oldestTs: string
      channelIds?: string[]
      senderSlackUserIds?: string[]
      limit: number
    },
  ): Promise<SlackObservationMessage[]> {
    let query = supabase
      .from('slack_observation_events')
      .select(
        'channel_id, channel_name, message_ts, thread_ts, sender_slack_user_id, text, is_bot, observed_at',
      )
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .gt('message_ts', input.oldestTs)
      .order('message_ts', { ascending: true })
      .limit(input.limit)
    if (input.channelIds?.length) query = query.in('channel_id', input.channelIds)
    if (input.senderSlackUserIds?.length) {
      query = query.in('sender_slack_user_id', input.senderSlackUserIds)
    }
    const { data, error } = await query
    if (error) throw new Error(`Failed to load Slack observation events: ${error.message}`)
    return (data ?? []) as SlackObservationMessage[]
  }

  async listEventsBetween(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channelId: string
      periodStartTs: string
      periodEndTs: string
    },
  ): Promise<SlackObservationMessage[]> {
    const { data, error } = await supabase
      .from('slack_observation_events')
      .select(
        'channel_id, channel_name, message_ts, thread_ts, sender_slack_user_id, text, is_bot, observed_at',
      )
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('channel_id', input.channelId)
      .gte('message_ts', input.periodStartTs)
      .lte('message_ts', input.periodEndTs)
      .order('message_ts', { ascending: true })
    if (error) throw new Error(`Failed to load Slack observation period: ${error.message}`)
    return (data ?? []) as SlackObservationMessage[]
  }

  async getConsumerCursor(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string; consumerKey: string },
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('slack_observation_consumers')
      .select('last_message_ts')
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('consumer_key', input.consumerKey)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack consumer cursor: ${error.message}`)
    return data?.last_message_ts ? String(data.last_message_ts) : null
  }

  async advanceConsumerCursor(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string; consumerKey: string; lastMessageTs: string },
  ): Promise<void> {
    const { error } = await supabase.rpc('advance_slack_observation_consumer', {
      p_org_id: input.orgId,
      p_slack_team_id: input.slackTeamId,
      p_consumer_key: input.consumerKey,
      p_last_message_ts: input.lastMessageTs,
    })
    if (error) throw new Error(`Failed to advance Slack consumer cursor: ${error.message}`)
  }
}
