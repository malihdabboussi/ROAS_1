import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactChannelMembersRepository {
  async findMemberForNotes(
    supabase: SupabaseClient,
    input: { userId: string; platformId: string; platform: 'slack' | 'telegram' },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('channel_members')
      .select('id, notes')
      .eq('user_id', input.userId)
      .eq('platform_id', input.platformId)
      .eq('platform', input.platform)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async updateMemberNotes(
    supabase: SupabaseClient,
    input: { memberId: string; notes: unknown[] },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('channel_members')
      .update({ notes: input.notes })
      .eq('id', input.memberId)) as { error: QueryError | null }
  }

  async findMemberProfile(
    supabase: SupabaseClient,
    input: { userId: string; platformId: string; platform: 'slack' | 'telegram' },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('channel_members')
      .select('display_name, username, title, timezone, notes, metadata')
      .eq('user_id', input.userId)
      .eq('platform_id', input.platformId)
      .eq('platform', input.platform)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }
}
