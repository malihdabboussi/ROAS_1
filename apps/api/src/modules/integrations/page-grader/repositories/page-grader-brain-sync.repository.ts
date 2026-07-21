import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class PageGraderBrainSyncRepository {
  async hasCampaignKnowledge(supabase: SupabaseClient, campaignId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('space_semantic_objects')
      .select('id')
      .eq('campaign_id', campaignId)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Could not verify Page Grader campaign knowledge: ${error.message}`)
    return Boolean(data?.id)
  }
}
