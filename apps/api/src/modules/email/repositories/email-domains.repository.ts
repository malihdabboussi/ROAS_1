import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DnsRecord, DomainStatus, EmailDomain } from '../types/email.types'

@Injectable()
export class EmailDomainsRepository {
  private readonly logger = new Logger(EmailDomainsRepository.name)

  async create(
    supabase: SupabaseClient,
    data: {
      userId: string
      domain: string
      subdomain?: string
      sendgridDomainId: number
      dnsRecords: DnsRecord[]
      isDefault: boolean
      orgId?: string | null
    },
  ): Promise<EmailDomain> {
    const emailDomain = data.subdomain ? `${data.subdomain}.${data.domain}` : data.domain
    const { data: domain, error } = await supabase
      .from('email_domains')
      .insert({
        user_id: data.userId,
        domain: data.domain,
        subdomain: data.subdomain || null,
        sendgrid_domain_id: data.sendgridDomainId,
        dns_records: data.dnsRecords,
        is_default: data.isDefault,
        from_email: `noreply@${emailDomain}`,
        status: 'pending' as DomainStatus,
        org_id: data.orgId ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return domain as EmailDomain
  }

  async findById(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<EmailDomain | null> {
    let query = supabase.from('email_domains').select('*').eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domain, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Database error: ${error.message}`)
    }
    return domain as EmailDomain
  }

  async findByDomainName(
    supabase: SupabaseClient,
    userId: string,
    domainName: string,
    orgId?: string | null,
  ): Promise<EmailDomain | null> {
    let query = supabase
      .from('email_domains')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domainName)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domain, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Database error: ${error.message}`)
    }
    return domain as EmailDomain
  }

  async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<EmailDomain[]> {
    let query = supabase.from('email_domains').select('*').eq('user_id', userId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domains, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Database error: ${error.message}`)
    return (domains || []) as EmailDomain[]
  }

  async findDefaultVerified(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<EmailDomain | null> {
    let q1 = supabase
      .from('email_domains')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .eq('is_default', true)
    if (orgId !== undefined) {
      q1 = orgId ? q1.eq('org_id', orgId) : q1.is('org_id', null)
    }
    const { data: defaultDomain } = await q1.single()

    if (defaultDomain) return defaultDomain as EmailDomain

    let q2 = supabase
      .from('email_domains')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .order('created_at', { ascending: true })
      .limit(1)
    if (orgId !== undefined) {
      q2 = orgId ? q2.eq('org_id', orgId) : q2.is('org_id', null)
    }
    const { data: anyDomain } = await q2.single()

    return (anyDomain as EmailDomain) || null
  }

  async hasVerifiedDomain(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    let query = supabase
      .from('email_domains')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'verified')
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { count, error } = await query

    if (error) throw new Error(`Database error: ${error.message}`)
    return (count || 0) > 0
  }

  async updateStatus(
    supabase: SupabaseClient,
    domainId: string,
    status: DomainStatus,
    verifiedAt?: string,
    orgId?: string | null,
  ): Promise<EmailDomain> {
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (verifiedAt) updateData.verified_at = verifiedAt

    let query = supabase.from('email_domains').update(updateData).eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domain, error } = await query.select().single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return domain as EmailDomain
  }

  async updateDnsRecords(
    supabase: SupabaseClient,
    domainId: string,
    dnsRecords: DnsRecord[],
    orgId?: string | null,
  ): Promise<EmailDomain> {
    let query = supabase
      .from('email_domains')
      .update({ dns_records: dnsRecords, updated_at: new Date().toISOString() })
      .eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domain, error } = await query.select().single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return domain as EmailDomain
  }

  async setAsDefault(
    supabase: SupabaseClient,
    userId: string,
    domainId: string,
    orgId?: string | null,
  ): Promise<void> {
    let unsetQuery = supabase
      .from('email_domains')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .neq('id', domainId)
    if (orgId !== undefined) {
      unsetQuery = orgId ? unsetQuery.eq('org_id', orgId) : unsetQuery.is('org_id', null)
    }
    const { error: unsetError } = await unsetQuery

    if (unsetError) throw new Error(`Database error: ${unsetError.message}`)

    let setQuery = supabase
      .from('email_domains')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', domainId)
    if (orgId !== undefined) {
      setQuery = orgId ? setQuery.eq('org_id', orgId) : setQuery.is('org_id', null)
    }
    const { error: setError } = await setQuery

    if (setError) throw new Error(`Database error: ${setError.message}`)
  }

  async updateInboundParse(
    supabase: SupabaseClient,
    domainId: string,
    enabled: boolean,
    hostname: string | null,
    orgId?: string | null,
  ): Promise<EmailDomain> {
    let query = supabase
      .from('email_domains')
      .update({
        inbound_parse_enabled: enabled,
        inbound_parse_hostname: hostname,
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domain, error } = await query.select().single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return domain as EmailDomain
  }

  async updateMxVerificationStatus(
    supabase: SupabaseClient,
    domainId: string,
    verified: boolean,
    orgId?: string | null,
  ): Promise<EmailDomain> {
    const updateData: Record<string, unknown> = {
      mx_verified: verified,
      updated_at: new Date().toISOString(),
    }
    if (verified) updateData.mx_verified_at = new Date().toISOString()

    let query = supabase.from('email_domains').update(updateData).eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: domain, error } = await query.select().single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return domain as EmailDomain
  }

  async delete(supabase: SupabaseClient, domainId: string, orgId?: string | null): Promise<void> {
    let query = supabase.from('email_domains').delete().eq('id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`Database error: ${error.message}`)
  }
}
