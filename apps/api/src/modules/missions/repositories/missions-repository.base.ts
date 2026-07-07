import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'

export abstract class MissionsRepositoryBase {
  async readUserPlatformRole(supabase: SupabaseClient, userId: string) {
    return supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  }

  protected applyOwnerScope(query: any, userId: string, orgId: string | null | undefined): any {
    return applyOwnerScope(query, { userId, orgId: orgId ?? null })
  }

  protected async syncCampaignActiveWork(
    supabase: SupabaseClient,
    campaignId: string | null | undefined,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    if (!campaignId) return

    const { data: inProgressRows, error: inProgressError } = await this.applyOwnerScope(
      supabase.from('missions').select('id').eq('campaign_id', campaignId),
      userId,
      orgId,
    )
      .eq('status', 'in_progress')
      .limit(1)
    if (inProgressError)
      throw new Error(`Failed mission active-work lookup: ${inProgressError.message}`)

    const hasActiveWork = Array.isArray(inProgressRows) && inProgressRows.length > 0
    const { error: campaignUpdateError } = await this.applyOwnerScope(
      supabase.from('campaigns').update({ has_active_work: hasActiveWork }).eq('id', campaignId),
      userId,
      orgId,
    )
    if (campaignUpdateError) {
      throw new Error(`Failed campaign active-work update: ${campaignUpdateError.message}`)
    }
  }
}
