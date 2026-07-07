import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class EmailArtifactsRepository {
  async findSourceTask(supabase: SupabaseClient, sourceItemId: string, spaceId: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, space_id, custom_data')
      .eq('id', sourceItemId)
      .eq('space_id', spaceId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load source task: ${error.message}`)
    return data as Record<string, unknown> | null
  }

  async findSpaceCampaignId(supabase: SupabaseClient, spaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load space: ${error.message}`)
    return typeof data?.campaign_id === 'string' ? data.campaign_id : null
  }

  async findCampaignSpace(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load space: ${error.message}`)
    return data as { id: string; campaign_id: string | null } | null
  }

  async createEmail(supabase: SupabaseClient, row: Record<string, unknown>) {
    const { data, error } = await supabase.from('emails').insert(row).select().single()
    if (error) throw new Error(`Failed to create email artifact: ${error.message}`)
    return data
  }

  async listByCampaign(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    let query = supabase
      .from('emails')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list email artifacts: ${error.message}`)
    return data ?? []
  }

  async findById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('emails').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`Failed to load email artifact: ${error.message}`)
    return data as Record<string, unknown> | null
  }

  async update(supabase: SupabaseClient, id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update email artifact: ${error.message}`)
    return data
  }

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('emails').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete email artifact: ${error.message}`)
  }

  async findTaskCustomData(supabase: SupabaseClient, sourceItemId: string, spaceId: string) {
    const { data } = await supabase
      .from('space_items')
      .select('custom_data')
      .eq('id', sourceItemId)
      .eq('space_id', spaceId)
      .maybeSingle()
    return data as { custom_data?: unknown } | null
  }

  async updateTaskCustomData(
    supabase: SupabaseClient,
    taskId: string,
    spaceId: string,
    customData: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('space_items').update({ custom_data: customData }).eq('id', taskId).eq('space_id', spaceId)
  }
}
