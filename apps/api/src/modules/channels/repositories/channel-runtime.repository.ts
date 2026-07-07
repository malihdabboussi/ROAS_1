import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChannelRow } from './channels.repository'

@Injectable()
export class ChannelRuntimeRepository {
  async findActiveCampaignById(
    serviceClient: SupabaseClient,
    campaignId: string,
  ): Promise<{ id: string } | null> {
    const { data } = await serviceClient
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .neq('status', 'archived')
      .maybeSingle()

    return (data as { id: string } | null) ?? null
  }

  async updateMessageMetadata(
    serviceClient: SupabaseClient,
    messageId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await serviceClient.from('channel_messages').update({ metadata }).eq('id', messageId)
  }

  async findBindableCampaign(
    supabase: SupabaseClient,
    channel: Pick<ChannelRow, 'org_id' | 'user_id'>,
    campaignId: string,
  ): Promise<{ id: string; name: string } | null> {
    let query = supabase
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .neq('status', 'archived')
    query = channel.org_id
      ? query.eq('org_id', channel.org_id)
      : query.is('org_id', null).eq('user_id', channel.user_id)
    const { data } = await query.maybeSingle()
    if (!data) return null
    return { id: data.id as string, name: (data.name as string) ?? 'campaign' }
  }
}
