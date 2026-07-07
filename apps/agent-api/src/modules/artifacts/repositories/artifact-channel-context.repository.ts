import { Injectable } from '@nestjs/common'

type QueryError = { message: string }

@Injectable()
export class ArtifactChannelContextRepository {
  async findChannel(
    supabase: { from: (table: string) => any },
    channelId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('channels')
      .select('id, org_id, user_id, metadata')
      .eq('id', channelId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findChannelMembership(
    supabase: { from: (table: string) => any },
    input: { channelId: unknown; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('channel_memberships')
      .select('id')
      .eq('channel_id', input.channelId)
      .eq('member_type', 'user')
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findOrgMember(
    supabase: { from: (table: string) => any },
    input: { orgId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', input.orgId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listCampaignRefs(
    supabase: { from: (table: string) => any },
    table: 'avatars' | 'offers',
    campaignIds: string[],
  ): Promise<{ data: Array<{ campaign_id?: string }> | null; error: QueryError | null }> {
    return (await supabase.from(table).select('campaign_id').in('campaign_id', campaignIds)) as {
      data: Array<{ campaign_id?: string }> | null
      error: QueryError | null
    }
  }
}
