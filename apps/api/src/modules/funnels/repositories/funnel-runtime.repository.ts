import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class FunnelRuntimeRepository {
  createServiceClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async createSignedUrl(
    supabase: SupabaseClient,
    bucketName: string,
    filePath: string,
    expiresInSeconds: number,
  ): Promise<string | null> {
    const { data } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresInSeconds)
    return data?.signedUrl ?? null
  }

  async findCampaignOrgId(supabase: SupabaseClient, campaignId: string): Promise<string | null> {
    const { data } = await supabase
      .from('campaigns')
      .select('org_id')
      .eq('id', campaignId)
      .maybeSingle()
    return (data?.org_id as string) ?? null
  }

  async listConversionPoints(supabase: SupabaseClient, funnelId: string, orgId?: string | null) {
    let q = supabase
      .from('funnel_conversion_points')
      .select('id, user_id, funnel_id, funnel_page_id, kind, config, created_at, updated_at')
      .eq('funnel_id', funnelId)
    if (orgId !== undefined) {
      q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null)
    }
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async upsertEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    row: {
      user_id: string
      funnel_id: string
      funnel_page_id: string
      kind: 'email_capture'
      config: Record<string, unknown>
      org_id: string | null
      updated_at: string
    },
  ) {
    const { data, error } = await supabase
      .from('funnel_conversion_points')
      .upsert(row, { onConflict: 'funnel_page_id,kind' })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async deleteEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    funnelPageId: string,
    orgId?: string | null,
  ): Promise<void> {
    let del = supabase
      .from('funnel_conversion_points')
      .delete()
      .eq('funnel_page_id', funnelPageId)
      .eq('kind', 'email_capture')
    if (orgId !== undefined) {
      del = del.eq('org_id', orgId)
    }
    const { error } = await del
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async findFunnelSlugConflict(serviceClient: SupabaseClient, slug: string, excludeId: string) {
    const { data } = await serviceClient
      .from('funnels')
      .select('id')
      .eq('slug', slug)
      .neq('id', excludeId)
      .single()
    return data as { id: string } | null
  }

  async findDomainName(supabase: SupabaseClient, domainId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('domains')
      .select('domain_name')
      .eq('id', domainId)
      .single()
    if (error || !data?.domain_name) return null
    return data.domain_name as string
  }

  async findGeneratedDomain(serviceClient: SupabaseClient, userId: string) {
    const { data } = await serviceClient
      .from('domains')
      .select('domain_name')
      .eq('user_id', userId)
      .eq('domain_type', 'generated')
      .eq('status', 'verified')
      .limit(1)
      .single()
    return data as { domain_name: string } | null
  }

  async findDomainConflict(serviceClient: SupabaseClient, subdomain: string) {
    const { data } = await serviceClient
      .from('domains')
      .select('id')
      .eq('domain_name', subdomain)
      .limit(1)
      .single()
    return data as { id: string } | null
  }

  async insertGeneratedDomain(
    serviceClient: SupabaseClient,
    row: {
      domain: string
      domain_name: string
      user_id: string
      domain_type: 'generated'
      status: 'verified'
      vercel_project_id: string
      org_id: string | null
    },
  ): Promise<void> {
    await serviceClient.from('domains').insert(row)
  }

  async findPublishTheme(serviceClient: SupabaseClient, themeId: string) {
    const { data, error } = await serviceClient
      .from('branding_themes')
      .select('colors, font_heading, font_body')
      .eq('id', themeId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve funnel theme: ${error.message}`)
    return data as Record<string, unknown> | null
  }
}
