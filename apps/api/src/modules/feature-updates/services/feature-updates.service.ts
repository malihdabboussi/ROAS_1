import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FeatureUpdatesRepository } from '../repositories/feature-updates.repository'

export interface FeatureUpdateRow {
  id: string
  title: string
  description: string
  video_url: string | null
  try_now_path: string | null
  learn_more_url: string | null
  category: string
  is_active: boolean
  sort_order: number
  created_at: string
}

@Injectable()
export class FeatureUpdatesService {
  constructor(private readonly featureUpdatesRepository: FeatureUpdatesRepository) {}

  async listActiveFeatureUpdates(supabase: SupabaseClient): Promise<FeatureUpdateRow[]> {
    return this.featureUpdatesRepository.listActiveFeatureUpdates(supabase)
  }
}
