import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

const USER_STATE_SELECT = 'program_id, is_favorite, updated_at'

@Injectable()
export class ProgramUserStateRepository {
  async list(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('program_user_state')
      .select(USER_STATE_SELECT)
      .eq('user_id', userId)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async upsert(supabase: SupabaseClient, userId: string, programId: string, isFavorite: boolean) {
    const { data, error } = await supabase
      .from('program_user_state')
      .upsert(
        {
          user_id: userId,
          program_id: programId,
          is_favorite: isFavorite,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,program_id' },
      )
      .select(USER_STATE_SELECT)
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }
}
