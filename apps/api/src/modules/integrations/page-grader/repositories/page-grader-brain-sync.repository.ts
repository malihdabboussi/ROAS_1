import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class PageGraderBrainSyncRepository {
  async hasCampaignKnowledge(supabase: SupabaseClient, campaignId: string): Promise<boolean> {
    const { data: brain, error: brainError } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('scope', 'campaign')
      .limit(1)
      .maybeSingle()
    if (brainError) {
      throw new Error(`Could not verify Page Grader campaign brain: ${brainError.message}`)
    }
    if (!brain?.id) return false

    const { count: memoryCount, error: memoryError } = await supabase
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .eq('brain_id', brain.id)
      .like('source_type', 'page_grader_%')
    if (memoryError) {
      throw new Error(`Could not verify Page Grader campaign memories: ${memoryError.message}`)
    }
    if (!memoryCount) return false

    const { count: embeddedCount, error: embeddingError } = await supabase
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .eq('brain_id', brain.id)
      .like('source_type', 'page_grader_%')
      .not('embedding', 'is', null)
    if (embeddingError) {
      throw new Error(`Could not verify Page Grader campaign embeddings: ${embeddingError.message}`)
    }

    return embeddedCount === memoryCount
  }
}
