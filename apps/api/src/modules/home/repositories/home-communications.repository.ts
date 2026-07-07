import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class HomeCommunicationsRepository {
  async listMemberChannelIds(supabase: SupabaseClient, userId: string) {
    return supabase
      .from('channel_memberships')
      .select('channel_id')
      .eq('member_type', 'user')
      .eq('user_id', userId)
  }

  async listChannelMessages(
    supabase: SupabaseClient,
    input: { orgId: string; channelIds: string[]; limit: number },
  ) {
    return supabase
      .from('channel_messages')
      .select(
        `
            id,
            channel_id,
            content,
            created_at,
            sender_id,
            sender_type,
            channels!inner (
              id,
              name,
              org_id,
              metadata
            )
          `,
      )
      .eq('channels.org_id', input.orgId)
      .in('channel_id', input.channelIds)
      .is('reply_to_id', null)
      .order('created_at', { ascending: false })
      .limit(input.limit)
  }

  async listDmMessages(supabase: SupabaseClient, input: { orgId: string; limit: number }) {
    return supabase
      .from('human_dm_messages')
      .select(
        `
            id,
            conversation_id,
            content,
            created_at,
            sender_id,
            human_dm_conversations!inner (
              id,
              org_id,
              user_low,
              user_high
            )
          `,
      )
      .eq('human_dm_conversations.org_id', input.orgId)
      .order('created_at', { ascending: false })
      .limit(input.limit)
  }

  async listProfiles(
    supabase: SupabaseClient,
    profileIds: string[],
  ): Promise<{
    data: Array<{ id: string; full_name: string | null; avatar_url: string | null }> | null
    error: { message: string } | null
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', profileIds)
    return {
      data:
        (data as Array<{
          id: string
          full_name: string | null
          avatar_url: string | null
        }> | null) ?? null,
      error: error ? { message: error.message } : null,
    }
  }
}
