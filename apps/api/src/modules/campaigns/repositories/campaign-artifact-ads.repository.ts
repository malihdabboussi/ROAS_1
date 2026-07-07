import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignArtifactAdsRepository {
  async listAvatars(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    let query = supabase
      .from('avatars')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query

    if (error) throw new Error(`Failed to list avatars: ${error.message}`)
    return data ?? []
  }

  async getAvatar(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('avatars').select('*').eq('id', id).single()
    if (error || !data) return null
    return data
  }

  async updateAvatar(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('avatars')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update avatar: ${error.message}`)
    return data
  }

  async deleteAvatar(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('avatars').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete avatar: ${error.message}`)
  }

  async listAds(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    let query = supabase
      .from('ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query

    if (error) throw new Error(`Failed to list ads: ${error.message}`)
    return data ?? []
  }

  async getAd(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('ads').select('*').eq('id', id).single()
    if (error || !data) return null
    return data
  }

  async updateAd(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('ads')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update ad: ${error.message}`)
    return data
  }

  async deleteAd(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('ads').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete ad: ${error.message}`)
  }

  async listAdsByAdCampaign(supabase: SupabaseClient, adCampaignId: string) {
    const { data: adSets } = await supabase
      .from('ad_sets')
      .select('id')
      .eq('ad_campaign_id', adCampaignId)
    const adSetIds = (adSets ?? []).map((adSet) => adSet.id as string)
    if (adSetIds.length === 0) return []
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .in('ad_set_id', adSetIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list ads by ad campaign: ${error.message}`)
    return data ?? []
  }

  async listAdsByAdSet(supabase: SupabaseClient, adSetId: string) {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('ad_set_id', adSetId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list ads by ad set: ${error.message}`)
    return data ?? []
  }

  async listAdCampaigns(
    supabase: SupabaseClient,
    campaignId: string,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    const select = options?.summary ? '*, ad_sets(*)' : '*, ad_sets(*, ads(*))'
    let query = supabase
      .from('ad_campaigns')
      .select(select)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list ad campaigns: ${error.message}`)
    return data ?? []
  }

  async getAdCampaign(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*, ad_sets(*, ads(*))')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return data
  }

  async createAdCampaign(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
    errorPrefix = 'Failed to create ad campaign',
  ) {
    const { data, error } = await supabase.from('ad_campaigns').insert(payload).select().single()
    if (error) throw new Error(`${errorPrefix}: ${error.message}`)
    return data
  }

  async updateAdCampaign(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update ad campaign: ${error.message}`)
    return data
  }

  async deleteAdCampaign(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('ad_campaigns').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete ad campaign: ${error.message}`)
  }

  async listUngroupedAdIds(supabase: SupabaseClient, userId: string, campaignId: string) {
    const { data, error } = await supabase
      .from('ads')
      .select('id')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .is('ad_set_id', null)
    if (error) throw new Error(`Failed to fetch ungrouped ads: ${error.message}`)
    return (data ?? []).map((ad) => ad.id as string)
  }

  async deleteAdsByIds(supabase: SupabaseClient, ids: string[], message = 'Failed to delete ads') {
    if (ids.length === 0) return
    const { error } = await supabase.from('ads').delete().in('id', ids)
    if (error) throw new Error(`${message}: ${error.message}`)
  }

  async listAdSetsForDuplication(supabase: SupabaseClient, adCampaignId: string, userId: string) {
    const { data, error } = await supabase
      .from('ad_sets')
      .select('*')
      .eq('ad_campaign_id', adCampaignId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to load ad sets for duplication: ${error.message}`)
    return data ?? []
  }

  async listAdsForDuplication(supabase: SupabaseClient, adSetId: string, userId: string) {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('ad_set_id', adSetId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to load ads for duplication: ${error.message}`)
    return data ?? []
  }

  async getAdSet(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('ad_sets').select('*').eq('id', id).single()
    if (error || !data) return null
    return data
  }

  async createAdSet(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('ad_sets').insert(payload).select().single()
    if (error) throw new Error(`Failed to create ad set: ${error.message}`)
    return data
  }

  async updateAdSet(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('ad_sets')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update ad set: ${error.message}`)
    return data
  }

  async listAdIdsByAdSet(supabase: SupabaseClient, id: string, userId: string) {
    const { data, error } = await supabase
      .from('ads')
      .select('id')
      .eq('ad_set_id', id)
      .eq('user_id', userId)
    if (error) throw new Error(`Failed to fetch ad set ads: ${error.message}`)
    return (data ?? []).map((ad) => ad.id as string)
  }

  async ungroupAdsByAdSet(supabase: SupabaseClient, id: string, userId: string) {
    const { error } = await supabase
      .from('ads')
      .update({ ad_set_id: null })
      .eq('ad_set_id', id)
      .eq('user_id', userId)
    if (error) throw new Error(`Failed to ungroup ads: ${error.message}`)
  }

  async deleteAdSet(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('ad_sets').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete ad set: ${error.message}`)
  }

  async insertAdSet(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('ad_sets').insert(payload).select('*').single()
    if (error) throw new Error(`Failed to duplicate ad set: ${error.message}`)
    return data
  }

  async insertAd(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('ads').insert(payload).select('*').single()
    if (error) throw new Error(`Failed to duplicate ad: ${error.message}`)
    return data
  }
}
