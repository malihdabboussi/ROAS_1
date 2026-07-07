import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type EdgeRow = {
  id: string
  user_id: string
  campaign_id: string
  workflow_id: string
  from_type: string
  from_id: string
  to_type: string
  to_id: string
  edge_type: string
  config: unknown
  status: string
  validation_errors: unknown
  created_at: string
  updated_at: string
}

@Injectable()
export class WorkflowsRepository {
  async findAccessibleCampaign(supabase: SupabaseClient, userId: string, campaignId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()
    if (error || !data?.id) return null
    return data
  }

  async findWorkflowByCampaignId(supabase: SupabaseClient, userId: string, campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_workflows')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async createWorkflow(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    name = 'Main',
  ) {
    const { data, error } = await supabase
      .from('campaign_workflows')
      .insert({ user_id: userId, campaign_id: campaignId, name })
      .select('*')
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async getLayout(supabase: SupabaseClient, workflowId: string) {
    const { data, error } = await supabase
      .from('campaign_workflow_layouts')
      .select('layout')
      .eq('workflow_id', workflowId)
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    return (data?.layout ?? {}) as Record<string, unknown>
  }

  async upsertLayout(
    supabase: SupabaseClient,
    input: { workflow_id: string; user_id: string; campaign_id: string; layout: unknown },
  ) {
    const { data, error } = await supabase
      .from('campaign_workflow_layouts')
      .upsert(
        {
          workflow_id: input.workflow_id,
          user_id: input.user_id,
          campaign_id: input.campaign_id,
          layout: input.layout,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workflow_id' },
      )
      .select('layout')
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return (data?.layout ?? {}) as Record<string, unknown>
  }

  async listEdges(supabase: SupabaseClient, workflowId: string): Promise<EdgeRow[]> {
    const { data, error } = await supabase
      .from('campaign_workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as EdgeRow[]
  }

  async createEdge(
    supabase: SupabaseClient,
    input: Omit<EdgeRow, 'id' | 'created_at' | 'updated_at'> & {
      updated_at: string
      created_at: string
    },
  ) {
    const { data, error } = await supabase
      .from('campaign_workflow_edges')
      .insert(input)
      .select('*')
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data as EdgeRow
  }

  async updateEdge(
    supabase: SupabaseClient,
    edgeId: string,
    fields: Partial<Pick<EdgeRow, 'config' | 'status' | 'validation_errors' | 'updated_at'>>,
  ) {
    const { data, error } = await supabase
      .from('campaign_workflow_edges')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', edgeId)
      .select('*')
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data as EdgeRow
  }

  async getEdgeById(supabase: SupabaseClient, edgeId: string): Promise<EdgeRow | null> {
    const { data, error } = await supabase
      .from('campaign_workflow_edges')
      .select('*')
      .eq('id', edgeId)
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? null) as EdgeRow | null
  }

  async deleteEdgeById(supabase: SupabaseClient, edgeId: string): Promise<void> {
    const { error } = await supabase.from('campaign_workflow_edges').delete().eq('id', edgeId)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async listFunnels(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('funnels')
      .select('id, name, campaign_id, status, funnel_pages!funnel_pages_funnel_id_fkey(id)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as {
      id: string
      name: string | null
      campaign_id: string | null
      status: string | null
      funnel_pages: { id: string }[]
    }[]
  }

  async listSequences(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('sequences')
      .select('id, name, campaign_id, sequence_emails(id)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as {
      id: string
      name: string | null
      campaign_id: string | null
      sequence_emails: { id: string }[]
    }[]
  }

  async listPresentations(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('presentations')
      .select('id, name, campaign_id, status')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as {
      id: string
      name: string | null
      campaign_id: string | null
      status: string | null
    }[]
  }

  async listOffers(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('offers')
      .select('id, name, campaign_id')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as { id: string; name: string | null; campaign_id: string | null }[]
  }

  async listFunnelsWithOfferId(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('funnels')
      .select('id, offer_id')
      .eq('campaign_id', campaignId)
      .not('offer_id', 'is', null)
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as { id: string; offer_id: string }[]
  }

  async listPresentationsWithOfferId(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('presentations')
      .select('id, offer_id')
      .eq('campaign_id', campaignId)
      .not('offer_id', 'is', null)
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as { id: string; offer_id: string }[]
  }

  async listAdCampaigns(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('id, name, campaign_id')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as { id: string; name: string; campaign_id: string | null }[]
  }

  async listAvatars(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('avatars')
      .select('id, name, offer_id, offers!inner(campaign_id)')
      .eq('offers.campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as { id: string; name: string | null; offer_id: string | null }[]
  }

  async listSocialPosts(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('social_posts')
      .select('id, caption, headline, platform, campaign_id')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as {
      id: string
      caption: string | null
      headline: string | null
      platform: string | null
      campaign_id: string | null
    }[]
  }

  async hasEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    funnelId: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('funnel_conversion_points')
      .select('id')
      .eq('funnel_id', funnelId)
      .eq('kind', 'email_capture')
      .limit(1)

    if (error) throw new Error(`DB error: ${error.message}`)
    return Array.isArray(data) && data.length > 0
  }

  async findFunnelInCampaign(supabase: SupabaseClient, funnelId: string, campaignId: string) {
    const { data, error } = await supabase
      .from('funnels')
      .select('id, campaign_id')
      .eq('id', funnelId)
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (error) return null
    return data
  }

  async findSequenceInCampaign(supabase: SupabaseClient, sequenceId: string, campaignId: string) {
    const { data, error } = await supabase
      .from('sequences')
      .select('id, campaign_id')
      .eq('id', sequenceId)
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (error) return null
    return data
  }

  async findVerifiedSenderIdentity(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('email_sender_identities')
      .select('id, domain_id')
      .eq('user_id', userId)
      .eq('is_verified', true)
      .not('domain_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (error) {
      throw new Error(`Failed to resolve sender identity for workflow validation: ${error.message}`)
    }
    return data
  }

  async findPresentationInCampaign(
    supabase: SupabaseClient,
    presentationId: string,
    campaignId: string,
  ) {
    const { data, error } = await supabase
      .from('presentations')
      .select('id')
      .eq('id', presentationId)
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (error) return null
    return data
  }

  async listConversionPointsByCampaign(supabase: SupabaseClient, campaignId: string) {
    // Join via funnels to ensure campaign scoping without requiring a campaign_id column.
    const { data, error } = await supabase
      .from('funnel_conversion_points')
      .select('id, funnel_id, funnel_page_id, kind, config, funnels!inner(id, campaign_id)')
      .eq('funnels.campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }
}
