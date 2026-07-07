import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SlackBrainMappingRecord = {
  id: string
  user_id: string
  org_id: string | null
  slack_team_id: string
  slack_channel_id: string
  slack_channel_name: string
  target_kind: 'user' | 'campaign' | 'agent' | 'customer'
  target_brain_id: string | null
  target_campaign_id: string | null
  cadence: string
}

@Injectable()
export class BrainImportJobsInputRepository {
  async findConnectedSlackBotToken(
    client: SupabaseClient,
    mappingUserId: string,
    teamId: string,
  ): Promise<string | null> {
    const { data: integration, error } = await client
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', mappingUserId)
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .eq('metadata->>team_id', teamId)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack integration: ${error.message}`)
    return (integration as { access_token?: string } | null)?.access_token ?? null
  }

  async loadSlackMapping(
    client: SupabaseClient,
    mappingId: string,
  ): Promise<SlackBrainMappingRecord> {
    const { data, error } = await client
      .from('slack_brain_mappings')
      .select('*')
      .eq('id', mappingId)
      .maybeSingle()
    if (error || !data)
      throw new Error(`Failed to load Slack mapping: ${error?.message ?? 'not found'}`)
    return data as SlackBrainMappingRecord
  }

  async resolveDefaultBrainId(client: SupabaseClient, userId: string): Promise<string | null> {
    const query = client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
    const { data, error } = await query
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve default brain: ${error.message}`)
    return data?.id ?? null
  }
}
