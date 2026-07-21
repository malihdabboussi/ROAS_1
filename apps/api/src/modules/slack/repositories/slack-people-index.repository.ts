import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SlackPeopleIndexRepository {
  async listChannelNamesByMember(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string },
  ): Promise<Map<string, string[]>> {
    const { data, error } = await supabase
      .from('slack_observation_channel_members')
      .select('member_slack_user_id, channel_name')
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .order('channel_name', { ascending: true })
    if (error) throw new Error(`Failed to list stored Slack memberships: ${error.message}`)
    const names = new Map<string, string[]>()
    for (const row of data ?? []) {
      const memberId = String(row.member_slack_user_id)
      names.set(memberId, [...(names.get(memberId) ?? []), String(row.channel_name)])
    }
    return names
  }

  async replaceChannelMemberships(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channelNamesByMember: Map<string, string[]>
    },
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from('slack_observation_channel_members')
      .delete()
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
    if (deleteError)
      throw new Error(`Failed to refresh stored Slack memberships: ${deleteError.message}`)
    const rows = [...input.channelNamesByMember.entries()].flatMap(([memberId, channels]) =>
      channels.map((channelName) => ({
        org_id: input.orgId,
        slack_team_id: input.slackTeamId,
        member_slack_user_id: memberId,
        channel_name: channelName,
      })),
    )
    if (rows.length === 0) return
    const { error } = await supabase.from('slack_observation_channel_members').insert(rows)
    if (error) throw new Error(`Failed to store Slack memberships: ${error.message}`)
  }

  async listChannels(supabase: SupabaseClient, orgId: string) {
    const { data, error } = await supabase
      .from('slack_observation_channels')
      .select('channel_id, channel_name, is_private')
      .eq('org_id', orgId)
      .eq('is_member', true)
      .order('channel_name', { ascending: true })
    if (error) throw new Error(`Failed to list stored Slack channels: ${error.message}`)
    return data ?? []
  }

  async upsertChannels(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channels: Array<{
        id: string
        name: string
        is_private?: boolean
        is_member?: boolean
      }>
    },
  ): Promise<void> {
    if (input.channels.length === 0) return
    const { error } = await supabase.from('slack_observation_channels').upsert(
      input.channels.map((channel) => ({
        org_id: input.orgId,
        slack_team_id: input.slackTeamId,
        channel_id: channel.id,
        channel_name: channel.name,
        is_private: channel.is_private === true,
        is_member: channel.is_member !== false,
        last_discovered_at: new Date().toISOString(),
      })),
      { onConflict: 'org_id,slack_team_id,channel_id' },
    )
    if (error) throw new Error(`Failed to refresh stored Slack channels: ${error.message}`)
  }
}
