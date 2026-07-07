import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeatureUpdateRow } from '../services/feature-updates.service'

@Injectable()
export class FeatureUpdatesRepository {
  async listActiveFeatureUpdates(supabase: SupabaseClient): Promise<FeatureUpdateRow[]> {
    const { data, error } = await supabase
      .from('feature_updates')
      .select(
        'id,title,description,video_url,try_now_path,learn_more_url,category,is_active,sort_order,created_at',
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as FeatureUpdateRow[]
  }
}
