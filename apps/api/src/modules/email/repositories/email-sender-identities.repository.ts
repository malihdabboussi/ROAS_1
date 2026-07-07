import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailSenderIdentity } from '../types/email.types'

@Injectable()
export class EmailSenderIdentitiesRepository {
  private readonly logger = new Logger(EmailSenderIdentitiesRepository.name)

  async create(
    supabase: SupabaseClient,
    data: {
      userId: string
      domainId: string
      sendgridSenderId: number | null
      nickname: string
      fromEmail: string
      fromName: string
      replyToEmail: string
      replyToName?: string
      address: string
      address2?: string
      city: string
      state?: string
      zip?: string
      country: string
      isVerified?: boolean
      orgId?: string | null
    },
  ): Promise<EmailSenderIdentity> {
    const { data: identity, error } = await supabase
      .from('email_sender_identities')
      .insert({
        user_id: data.userId,
        domain_id: data.domainId,
        sendgrid_sender_id: data.sendgridSenderId,
        nickname: data.nickname,
        from_email: data.fromEmail,
        from_name: data.fromName,
        reply_to_email: data.replyToEmail,
        reply_to_name: data.replyToName || null,
        address: data.address,
        address_2: data.address2 || null,
        city: data.city,
        state: data.state || null,
        zip: data.zip || null,
        country: data.country,
        is_verified: data.isVerified || false,
        is_default: false,
        org_id: data.orgId ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return identity as EmailSenderIdentity
  }

  async findById(
    supabase: SupabaseClient,
    identityId: string,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity | null> {
    let query = supabase.from('email_sender_identities').select('*').eq('id', identityId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: identity, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Database error: ${error.message}`)
    }
    return identity as EmailSenderIdentity
  }

  async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity[]> {
    let query = supabase.from('email_sender_identities').select('*').eq('user_id', userId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: identities, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Database error: ${error.message}`)
    return (identities || []) as EmailSenderIdentity[]
  }

  async findByDomainId(
    supabase: SupabaseClient,
    domainId: string,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity[]> {
    let query = supabase.from('email_sender_identities').select('*').eq('domain_id', domainId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: identities, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Database error: ${error.message}`)
    return (identities || []) as EmailSenderIdentity[]
  }

  async update(
    supabase: SupabaseClient,
    identityId: string,
    data: Partial<{
      nickname: string
      from_name: string
      reply_to_email: string
      reply_to_name: string | null
      address: string
      address_2: string | null
      city: string
      state: string | null
      zip: string | null
      country: string
      signature: string | null
      is_verified: boolean
      is_default: boolean
      sendgrid_sender_id: number | null
    }>,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity> {
    let query = supabase
      .from('email_sender_identities')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', identityId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: identity, error } = await query.select().single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return identity as EmailSenderIdentity
  }

  async setAsDefault(
    supabase: SupabaseClient,
    userId: string,
    identityId: string,
    orgId?: string | null,
  ): Promise<void> {
    let unsetQuery = supabase
      .from('email_sender_identities')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .neq('id', identityId)
    if (orgId !== undefined) {
      unsetQuery = orgId ? unsetQuery.eq('org_id', orgId) : unsetQuery.is('org_id', null)
    }
    const { error: unsetError } = await unsetQuery

    if (unsetError) throw new Error(`Database error: ${unsetError.message}`)

    let setQuery = supabase
      .from('email_sender_identities')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', identityId)
    if (orgId !== undefined) {
      setQuery = orgId ? setQuery.eq('org_id', orgId) : setQuery.is('org_id', null)
    }
    const { error: setError } = await setQuery

    if (setError) throw new Error(`Database error: ${setError.message}`)
  }

  async delete(supabase: SupabaseClient, identityId: string, orgId?: string | null): Promise<void> {
    let query = supabase.from('email_sender_identities').delete().eq('id', identityId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`Database error: ${error.message}`)
  }
}
