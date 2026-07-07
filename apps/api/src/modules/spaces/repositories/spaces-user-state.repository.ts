import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

const USER_STATE_SELECT = 'space_id, is_favorite, is_hidden, updated_at'

@Injectable()
export class SpacesUserStateRepository {
  async listUserState(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('space_user_state')
      .select(USER_STATE_SELECT)
      .eq('user_id', userId)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async upsertUserState(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    patch: { is_favorite?: boolean; is_hidden?: boolean },
  ) {
    const cleaned: Record<string, unknown> = {
      user_id: userId,
      space_id: spaceId,
      updated_at: new Date().toISOString(),
    }
    if (typeof patch.is_favorite === 'boolean') cleaned.is_favorite = patch.is_favorite
    if (typeof patch.is_hidden === 'boolean') cleaned.is_hidden = patch.is_hidden
    const { data, error } = await supabase
      .from('space_user_state')
      .upsert(cleaned, { onConflict: 'user_id,space_id' })
      .select(USER_STATE_SELECT)
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }
}
