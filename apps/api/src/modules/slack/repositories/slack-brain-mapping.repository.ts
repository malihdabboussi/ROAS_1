import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SlackBrainCadence,
  SlackBrainMapping,
  SlackBrainTargetKind,
} from '../types/slack.types'

export interface CreateSlackBrainMappingInput {
  userId: string
  orgId?: string | null
  slackTeamId: string
  slackChannelId: string
  slackChannelName: string
  targetKind: SlackBrainTargetKind
  targetBrainId?: string | null
  targetCampaignId?: string | null
  cadence: SlackBrainCadence
}

@Injectable()
export class SlackBrainMappingRepository {
  async list(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<SlackBrainMapping[]> {
    let query = supabase
      .from('slack_brain_mappings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list Slack brain mappings: ${error.message}`)
    return (data ?? []) as SlackBrainMapping[]
  }

  async getById(
    supabase: SupabaseClient,
    id: string,
    userId?: string,
    orgId?: string | null,
  ): Promise<SlackBrainMapping | null> {
    let query = supabase.from('slack_brain_mappings').select('*').eq('id', id)
    if (userId) query = query.eq('user_id', userId)
    if (orgId !== undefined) query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to load Slack brain mapping: ${error.message}`)
    return (data as SlackBrainMapping | null) ?? null
  }

  async create(
    supabase: SupabaseClient,
    input: CreateSlackBrainMappingInput,
  ): Promise<SlackBrainMapping> {
    const { data, error } = await supabase
      .from('slack_brain_mappings')
      .insert({
        user_id: input.userId,
        org_id: input.orgId ?? null,
        slack_team_id: input.slackTeamId,
        slack_channel_id: input.slackChannelId,
        slack_channel_name: input.slackChannelName,
        target_kind: input.targetKind,
        target_brain_id: input.targetBrainId ?? null,
        target_campaign_id: input.targetCampaignId ?? null,
        cadence: input.cadence,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create Slack brain mapping: ${error.message}`)
    return data as SlackBrainMapping
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    userId: string,
    updates: { cadence?: SlackBrainCadence; enabled?: boolean },
    orgId?: string | null,
  ): Promise<SlackBrainMapping> {
    let query = supabase
      .from('slack_brain_mappings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to update Slack brain mapping: ${error.message}`)
    return data as SlackBrainMapping
  }

  async delete(
    supabase: SupabaseClient,
    id: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase.from('slack_brain_mappings').delete().eq('id', id).eq('user_id', userId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to delete Slack brain mapping: ${error.message}`)
  }

  async touchSyncCursor(
    supabase: SupabaseClient,
    id: string,
    lastMessageTs?: string | null,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      last_synced_at: new Date().toISOString(),
    }
    if (lastMessageTs) update.last_message_ts = lastMessageTs
    const { error } = await supabase.from('slack_brain_mappings').update(update).eq('id', id)
    if (error) throw new Error(`Failed to update Slack brain sync cursor: ${error.message}`)
  }

  async listDue(supabase: SupabaseClient, now = new Date()): Promise<SlackBrainMapping[]> {
    const { data, error } = await supabase
      .from('slack_brain_mappings')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) throw new Error(`Failed to list due Slack brain mappings: ${error.message}`)

    return ((data ?? []) as SlackBrainMapping[]).filter((mapping) => this.isDue(mapping, now))
  }

  private isDue(mapping: SlackBrainMapping, now: Date): boolean {
    if (!mapping.last_synced_at) return true
    const last = new Date(mapping.last_synced_at).getTime()
    if (!Number.isFinite(last)) return true
    const cadenceMs =
      mapping.cadence === 'monthly'
        ? 30 * 24 * 60 * 60 * 1000
        : mapping.cadence === 'weekly'
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000
    return now.getTime() - last >= cadenceMs
  }
}
