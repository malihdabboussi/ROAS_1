import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactAvatarsRepository {
  async listAvatars(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', input.userId)
      .eq('campaign_id', input.campaignId)
      .order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findAvatar(
    supabase: SupabaseClient,
    input: { avatarId: string; userId: string; select: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('avatars')
      .select(input.select)
      .eq('id', input.avatarId)
      .eq('user_id', input.userId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateAvatar(
    supabase: SupabaseClient,
    input: { avatarId: string; userId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('avatars')
      .update(input.updates)
      .eq('id', input.avatarId)
      .eq('user_id', input.userId)
      .select()
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createAvatar(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('avatars').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
