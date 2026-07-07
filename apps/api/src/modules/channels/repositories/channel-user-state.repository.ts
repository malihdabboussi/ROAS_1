import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ChannelUserStateRepository {
  async listFavoriteChannelIdsForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('channel_user_state')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('is_favorite', true)
    if (error) throw new Error(`DB error: ${error.message}`)

    return new Set((data ?? []).map((row) => String(row.channel_id)))
  }

  async listUserState(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('channel_user_state')
      .select('channel_id, is_favorite, updated_at')
      .eq('user_id', userId)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async upsertUserState(
    supabase: SupabaseClient,
    userId: string,
    channelId: string,
    patch: { is_favorite?: boolean },
  ) {
    const cleaned: Record<string, unknown> = {
      user_id: userId,
      channel_id: channelId,
      updated_at: new Date().toISOString(),
    }
    if (typeof patch.is_favorite === 'boolean') cleaned.is_favorite = patch.is_favorite
    const { data, error } = await supabase
      .from('channel_user_state')
      .upsert(cleaned, { onConflict: 'user_id,channel_id' })
      .select('channel_id, is_favorite, updated_at')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }
}
