import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class TransferRepository {
  async getOrgRole(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
  ): Promise<string | null> {
    const { data } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single()
    return data?.role ?? null
  }

  async loadCampaign(supabase: SupabaseClient, campaignId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .single()
    if (error || !data) return null
    return data
  }

  async loadSpace(supabase: SupabaseClient, spaceId: string): Promise<any | null> {
    const { data, error } = await supabase.from('spaces').select('*').eq('id', spaceId).single()
    if (error || !data) return null
    return data
  }

  async countCampaignRows(
    supabase: SupabaseClient,
    table: string,
    campaignId: string,
  ): Promise<number> {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
    return count ?? 0
  }

  async countActiveCampaignMissions(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<number> {
    const { count } = await supabase
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'in_progress', 'executing'])
    return count ?? 0
  }

  async loadArtifactPreview(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
  ): Promise<any | null> {
    const { data, error } = await supabase
      .from(table)
      .select('id, campaign_id, org_id')
      .eq('id', artifactId)
      .single()
    if (error || !data) return null
    return data
  }

  async loadArtifact(supabase: SupabaseClient, table: string, artifactId: string): Promise<any | null> {
    const { data, error } = await supabase.from(table).select('*').eq('id', artifactId).single()
    if (error || !data) return null
    return data
  }

  async moveArtifact(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
    updatePayload: Record<string, any>,
  ) {
    return supabase.from(table).update(updatePayload).eq('id', artifactId)
  }

  async copyArtifact(
    supabase: SupabaseClient,
    table: string,
    artifact: any,
    targetOrgId: string | null,
    targetCampaignId?: string,
  ) {
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = artifact
    const copy: Record<string, any> = { ...rest, org_id: targetOrgId }
    if (targetCampaignId) copy.campaign_id = targetCampaignId
    return supabase.from(table).insert(copy)
  }

  async loadMediaAsset(supabase: SupabaseClient, mediaId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', mediaId)
      .single()
    if (error || !data) return null
    return data
  }

  async moveMediaAsset(
    supabase: SupabaseClient,
    mediaId: string,
    updatePayload: Record<string, any>,
  ) {
    return supabase.from('media_assets').update(updatePayload).eq('id', mediaId)
  }

  async copyMediaAsset(
    supabase: SupabaseClient,
    asset: any,
    targetOrgId: string | null,
    targetCampaignId?: string,
  ) {
    const { id: _id, created_at: _ca, updated_at: _ua, public_url: _pu, ...rest } = asset
    const copy: Record<string, any> = { ...rest, org_id: targetOrgId }
    if (targetCampaignId) copy.campaign_id = targetCampaignId
    return supabase.from('media_assets').insert(copy)
  }

  async pauseActiveCampaignMissions(supabase: SupabaseClient, campaignId: string) {
    return supabase
      .from('missions')
      .update({ status: 'paused' })
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'in_progress', 'executing'])
  }

  async moveCampaignRow(
    supabase: SupabaseClient,
    campaignId: string,
    targetOrgId: string | null,
  ) {
    return supabase.from('campaigns').update({ org_id: targetOrgId }).eq('id', campaignId)
  }

  async moveCampaignChildRows(
    supabase: SupabaseClient,
    table: string,
    campaignId: string,
    targetOrgId: string | null,
  ): Promise<{ count: number; error: { message: string } | null }> {
    const { error } = await supabase
      .from(table)
      .update({ org_id: targetOrgId } as any)
      .eq('campaign_id', campaignId)
    if (error) return { count: 0, error }

    const query = supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
    const withCtx = targetOrgId ? query.eq('org_id', targetOrgId) : query.is('org_id', null)
    const { count } = await withCtx
    return { count: count ?? 0, error: null }
  }

  async moveDomain(supabase: SupabaseClient, domainId: string, targetOrgId: string | null) {
    return supabase.from('domains').update({ org_id: targetOrgId }).eq('id', domainId)
  }

  async moveEmailDomain(
    supabase: SupabaseClient,
    emailDomainId: string,
    targetOrgId: string | null,
  ) {
    await supabase.from('email_domains').update({ org_id: targetOrgId }).eq('id', emailDomainId)
    await supabase
      .from('email_sender_identities')
      .update({ org_id: targetOrgId })
      .eq('domain_id', emailDomainId)
  }

  async listCampaignContactIds(supabase: SupabaseClient, campaignId: string): Promise<string[]> {
    const { data } = await supabase
      .from('contact_campaign_memberships')
      .select('contact_id')
      .eq('campaign_id', campaignId)
    return (data ?? []).map((membership: any) => String(membership.contact_id))
  }

  async moveContacts(
    supabase: SupabaseClient,
    contactIds: string[],
    targetOrgId: string | null,
  ) {
    return supabase.from('contacts').update({ org_id: targetOrgId }).in('id', contactIds)
  }

  async moveCampaignUsageEvents(
    supabase: SupabaseClient,
    campaignId: string,
    targetOrgId: string | null,
  ) {
    return supabase.from('ai_usage_events').update({ org_id: targetOrgId }).eq('campaign_id', campaignId)
  }

  async countSpaceRows(supabase: SupabaseClient, table: string, spaceId: string): Promise<number> {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId)
    return count ?? 0
  }

  async listSpaceItemsForView(
    supabase: SupabaseClient,
    spaceId: string,
    viewType: string,
  ): Promise<{ data: any[]; error: { message: string } | null }> {
    let query = supabase
      .from('space_items')
      .select('id, status, custom_data')
      .eq('space_id', spaceId)

    if (viewType === 'docs') query = query.eq('custom_data->>_view_type', 'doc')
    if (viewType === 'instagram_research') {
      query = query.eq('custom_data->>_view_type', 'instagram_research')
    }
    if (viewType === 'tiktok_research') {
      query = query.eq('custom_data->>_view_type', 'tiktok_research')
    }
    if (viewType === 'youtube_research') {
      query = query.eq('custom_data->>_view_type', 'youtube_research')
    }
    if (viewType === 'twitter_research') {
      query = query.eq('custom_data->>_view_type', 'twitter_research')
    }
    if (viewType === 'contacts') query = query.eq('custom_data->>_view_type', 'contact')

    const { data, error } = await query
    return { data: data ?? [], error }
  }

  async listArtifactRowsForView(
    supabase: SupabaseClient,
    table: string,
    campaignId: string,
    viewType: string,
  ): Promise<{ data: any[]; error: { message: string } | null }> {
    let query = supabase.from(table).select('*').eq('campaign_id', campaignId)
    if (viewType === 'funnels') query = query.neq('funnel_type', 'website')
    if (viewType === 'websites') query = query.eq('funnel_type', 'website')
    const { data, error } = await query
    return { data: data ?? [], error }
  }

  async findLinkedDomains(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<Array<{ id: string; domain: string }>> {
    const { data } = await supabase
      .from('funnels')
      .select('id, domain_id, domains(id, domain)')
      .eq('campaign_id', campaignId)
      .not('domain_id', 'is', null)

    return (data ?? [])
      .filter((f: any) => f.domains)
      .map((f: any) => ({ id: String(f.domains.id), domain: String(f.domains.domain) }))
  }

  async findLinkedEmailDomains(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
  ): Promise<Array<{ id: string; domain: string }>> {
    const { data: sequences } = await supabase
      .from('sequences')
      .select('id')
      .eq('campaign_id', campaignId)
    if (!sequences?.length) return []

    const { data: senders } = await supabase
      .from('email_sender_identities')
      .select('id, domain_id, email_domains(id, domain)')
      .eq('user_id', userId)
    if (!senders?.length) return []

    return senders
      .filter((s: any) => s.email_domains)
      .map((s: any) => ({ id: String(s.email_domains.id), domain: String(s.email_domains.domain) }))
  }

  async countLinkedContacts(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
  ): Promise<number> {
    const { data: memberships } = await supabase
      .from('contact_campaign_memberships')
      .select('contact_id')
      .eq('campaign_id', campaignId)
    if (!memberships?.length) return 0

    const { count } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in(
        'id',
        memberships.map((r: any) => r.contact_id),
      )
    return count ?? 0
  }

  async loadProjectPreview(supabase: SupabaseClient, projectId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('project_repos')
      .select('id, name, org_id')
      .eq('id', projectId)
      .single()
    if (error || !data) return null
    return data
  }

  async loadProject(supabase: SupabaseClient, projectId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('project_repos')
      .select('*')
      .eq('id', projectId)
      .single()
    if (error || !data) return null
    return data
  }

  async moveProject(supabase: SupabaseClient, projectId: string, orgId: string | null) {
    return supabase.from('project_repos').update({ org_id: orgId }).eq('id', projectId)
  }

  async copyProject(supabase: SupabaseClient, project: any, orgId: string | null): Promise<any> {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = project
    const { data, error } = await supabase
      .from('project_repos')
      .insert({ ...rest, org_id: orgId })
      .select('id')
      .single()
    return { data, error }
  }
}
