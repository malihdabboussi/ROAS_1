import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SpaceViewOverridesRepository {
  async findViewOverrides(supabase: SupabaseClient, spaceId: string, userId: string) {
    const { data, error } = await supabase
      .from('space_view_overrides')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async upsertViewOverride(
    supabase: SupabaseClient,
    spaceId: string,
    userId: string,
    viewId: string,
    overrides: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('space_view_overrides')
      .upsert(
        { space_id: spaceId, user_id: userId, view_id: viewId, overrides },
        { onConflict: 'space_id,user_id,view_id' },
      )
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async deleteViewOverride(
    supabase: SupabaseClient,
    spaceId: string,
    userId: string,
    viewId: string,
  ) {
    const { error } = await supabase
      .from('space_view_overrides')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .eq('view_id', viewId)
    if (error) throw new BadRequestException(error.message)
    return { deleted: true }
  }
}
