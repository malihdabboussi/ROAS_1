import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SlackPendingOffersRepository {
  async create(supabase: SupabaseClient, input: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('slack_pending_offers').insert(input)
    if (error) throw new Error(`Failed to create Slack offer: ${error.message}`)
  }

  async expire(supabase: SupabaseClient, orgId: string, before: string): Promise<void> {
    const { error } = await supabase
      .from('slack_pending_offers')
      .update({ status: 'expired' })
      .eq('org_id', orgId)
      .eq('status', 'offered')
      .lt('created_at', before)
    if (error) throw new Error(`Failed to expire Slack offers: ${error.message}`)
  }

  async acceptByThread(
    supabase: SupabaseClient,
    input: { orgId: string; channelId: string; threadTs: string; via: 'reaction' | 'thread_reply' },
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('slack_pending_offers')
      .update({ status: 'accepted', accepted_via: input.via })
      .eq('org_id', input.orgId)
      .eq('thread_channel_id', input.channelId)
      .eq('thread_ts', input.threadTs)
      .eq('status', 'offered')
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Failed to accept Slack offer: ${error.message}`)
    return Boolean(data?.id)
  }
}
