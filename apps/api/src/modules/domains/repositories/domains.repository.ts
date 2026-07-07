import { Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { CustomDomain, DnsRecord, DomainStatus } from '../types/domains.types'

@Injectable()
export class DomainsRepository {
  private readonly logger = new Logger(DomainsRepository.name)

  async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ data: CustomDomain[] | null; error: any }> {
    let query = supabase.from('domains').select('*')
    if (orgId) {
      // Org context: show all domains shared in this org, not only creator-owned rows.
      query = query.eq('org_id', orgId)
    } else if (orgId === null) {
      // Personal context: keep creator-owned rows in personal scope only.
      query = query.eq('user_id', userId).is('org_id', null)
    } else {
      // Backward compatibility for callers that do not pass explicit scope.
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    return { data: data as CustomDomain[] | null, error }
  }

  async findById(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<{ data: CustomDomain | null; error: any }> {
    let query = supabase.from('domains').select('*').eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.single()
    return { data: data as CustomDomain | null, error }
  }

  async findByDomainName(
    supabase: SupabaseClient,
    domainName: string,
    orgId?: string | null,
  ): Promise<{ data: CustomDomain | null; error: any }> {
    let query = supabase.from('domains').select('*').eq('domain_name', domainName)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.single()
    return { data: data as CustomDomain | null, error }
  }

  async existsByDomainName(
    supabase: SupabaseClient,
    domainName: string,
    orgId?: string | null,
  ): Promise<{ data: { id: string } | null; error: any }> {
    let query = supabase.from('domains').select('id').eq('domain_name', domainName)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.single()
    return { data, error }
  }

  async findGeneratedDomain(
    supabase: SupabaseClient,
    userId: string,
    environment?: 'production' | 'staging',
    orgId?: string | null,
  ): Promise<{ data: CustomDomain | null; error: any }> {
    let query = supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .eq('domain_type', 'generated')
      .eq('status', 'verified')

    if (environment) {
      query = query.eq('environment', environment)
    }
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }

    const { data, error } = await query.single()
    return { data: data as CustomDomain | null, error }
  }

  async create(
    supabase: SupabaseClient,
    domainData: {
      domain_name: string
      user_id: string
      vercel_project_id: string
      vercel_domain_response?: any
      status: DomainStatus
      verification_records?: DnsRecord[] | null
      last_verification_check?: string
      domain_type?: 'generated' | 'custom'
      environment?: 'production' | 'staging'
    },
    orgId?: string | null,
  ): Promise<{ data: CustomDomain | null; error: any }> {
    const { data, error } = await supabase
      .from('domains')
      .insert({
        ...domainData,
        domain: domainData.domain_name, // populate the legacy 'domain' column too
        org_id: orgId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    return { data: data as CustomDomain | null, error }
  }

  async update(
    supabase: SupabaseClient,
    domainId: string,
    updateData: Partial<{
      landing_page_id: string | null
      funnel_id: string | null
      status: DomainStatus
      verification_records: DnsRecord[] | null
      last_verification_check: string
      error_message: string | null
      vercel_domain_response: any
    }>,
    orgId?: string | null,
  ): Promise<{ data: CustomDomain | null; error: any }> {
    let query = supabase
      .from('domains')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.select().single()
    return { data: data as CustomDomain | null, error }
  }

  async updateStatus(
    supabase: SupabaseClient,
    domainId: string,
    status: DomainStatus,
    verificationRecords?: DnsRecord[] | null,
    orgId?: string | null,
  ): Promise<{ data: CustomDomain | null; error: any }> {
    const updateData: Record<string, unknown> = {
      status,
      last_verification_check: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (verificationRecords !== undefined) {
      updateData.verification_records = verificationRecords
    }
    let query = supabase.from('domains').update(updateData).eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.select().single()
    return { data: data as CustomDomain | null, error }
  }

  async delete(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<{ error: any }> {
    let query = supabase.from('domains').delete().eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query
    return { error }
  }

  async getLandingPage(
    supabase: SupabaseClient,
    landingPageId: string,
  ): Promise<{ data: { id: string; slug: string } | null; error: any }> {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('id, slug')
      .eq('id', landingPageId)
      .single()
    return { data, error }
  }

  async getFunnelForDomainConnection(
    supabase: SupabaseClient,
    funnelId: string,
  ): Promise<{
    data: {
      id: string
      name: string
      title: string | null
      slug: string | null
      status: string
    } | null
    error: any
  }> {
    const { data, error } = await supabase
      .from('funnels')
      .select('id, name, title, slug, status')
      .eq('id', funnelId)
      .single()
    return { data, error }
  }

  async updateFunnelDomainConnection(
    supabase: SupabaseClient,
    funnelId: string,
    updateData: { domain_id: string | null; published_url?: string | null },
  ): Promise<{ error: any }> {
    const { error } = await supabase
      .from('funnels')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', funnelId)
    return { error }
  }

  async getPresentationForDomainConnection(
    supabase: SupabaseClient,
    presentationId: string,
  ): Promise<{
    data: { id: string; name: string | null; slug: string | null; status: string } | null
    error: any
  }> {
    const { data, error } = await supabase
      .from('presentations')
      .select('id, name, slug, status')
      .eq('id', presentationId)
      .single()
    return { data, error }
  }

  async updatePresentationDomainConnection(
    supabase: SupabaseClient,
    presentationId: string,
    updateData: { domain_id: string | null; published_url?: string | null },
  ): Promise<{ error: any }> {
    const { error } = await supabase
      .from('presentations')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', presentationId)
    return { error }
  }

  async getProjectForDomainConnection(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<{
    data: {
      id: string
      name: string
      slug: string | null
      is_published: boolean
      vercel_project_id: string | null
    } | null
    error: any
  }> {
    const { data, error } = await supabase
      .from('project_repos')
      .select('id, name, slug, is_published, vercel_project_id')
      .eq('id', projectId)
      .single()
    return { data, error }
  }

  async getProjectDomainId(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<{ data: { domain_id: string | null } | null; error: any }> {
    const { data, error } = await supabase
      .from('project_repos')
      .select('domain_id')
      .eq('id', projectId)
      .single()
    return { data, error }
  }

  async updateProjectDomainConnection(
    supabase: SupabaseClient,
    projectId: string,
    updateData: { domain_id: string | null; published_url?: string | null },
  ): Promise<{ error: any }> {
    const { error } = await supabase
      .from('project_repos')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', projectId)
    return { error }
  }
}
