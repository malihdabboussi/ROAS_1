import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignArtifactOffersRepository {
  async listOffers(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    let query = supabase
      .from('offers')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query

    if (error) throw new Error(`Failed to list offers: ${error.message}`)
    return data ?? []
  }

  async getOffer(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('offers').select('*').eq('id', id).single()
    if (error || !data) return null
    return data
  }

  async updateOffer(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('offers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update offer: ${error.message}`)
    return data
  }

  async deleteOffer(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('offers').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete offer: ${error.message}`)
  }

  async createOffer(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('offers').insert(payload).select().single()
    if (error) throw new Error(`Failed to create offer: ${error.message}`)
    return data
  }

  async createSequence(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('sequences').insert(payload).select().single()
    if (error) throw new Error(`Failed to create sequence: ${error.message}`)
    return data
  }

  async createAvatar(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('avatars').insert(payload).select().single()
    if (error) throw new Error(`Failed to create avatar: ${error.message}`)
    return data
  }

  async getAvatarByOfferId(supabase: SupabaseClient, offerId: string) {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error || !data) return null
    return data
  }
}
