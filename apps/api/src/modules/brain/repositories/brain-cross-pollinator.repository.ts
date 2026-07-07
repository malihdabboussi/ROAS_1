import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class BrainCrossPollinatorRepository {
  private adminClient: SupabaseClient | null = null

  async listCampaignBrainCandidates(userId: string, limit: number) {
    const { data, error } = await this.getAdminClient()
      .from('ns_brains')
      .select('id, campaign_id, name')
      .eq('owner_id', userId)
      .not('campaign_id', 'is', null)
      .eq('cortex_max', true)
      .limit(limit)
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async listCampaignTitles(campaignIds: string[]) {
    const { data } = await this.getAdminClient()
      .from('campaigns')
      .select('id, title')
      .in('id', campaignIds)
    return data ?? []
  }

  async listNarrativePages(brainIds: string[]) {
    const { data } = await this.getAdminClient()
      .from('ns_narrative_pages')
      .select('brain_id, slug, title, page_type, summary, content_md')
      .in('brain_id', brainIds)
      .eq('status', 'active')
    return data ?? []
  }

  async insertSuggestion(record: Record<string, unknown>) {
    return this.getAdminClient()
      .from('brain_cross_suggestions')
      .insert(record)
      .select('id')
      .maybeSingle()
  }

  async insertNotification(record: Record<string, unknown>) {
    return this.getAdminClient().from('user_notifications').insert(record)
  }

  private getAdminClient(): SupabaseClient {
    if (this.adminClient) return this.adminClient
    const url = process.env.SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    this.adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    return this.adminClient
  }
}
