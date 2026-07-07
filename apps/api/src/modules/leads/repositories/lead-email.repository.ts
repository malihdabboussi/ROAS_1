import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LeadEmailSenderIdentity = {
  id: string
  domain_id: string | null
  from_email: string
  from_name: string
  reply_to_email: string | null
  reply_to_name: string | null
  address?: string | null
  address_2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  signature?: string | null
}

@Injectable()
export class LeadEmailRepository {
  async findVerifiedSenderIdentity(
    supabase: SupabaseClient,
    input: { userId: string; fromIdentityId?: string | null; orgId?: string | null },
  ): Promise<LeadEmailSenderIdentity | null> {
    let senderIdentityQuery = supabase
      .from('email_sender_identities')
      .select(
        'id, domain_id, from_email, from_name, reply_to_email, reply_to_name, address, address_2, city, state, zip, country, signature',
      )
      .eq('user_id', input.userId)
      .eq('is_verified', true)

    if (input.fromIdentityId) {
      senderIdentityQuery = senderIdentityQuery.eq('id', input.fromIdentityId)
    } else {
      senderIdentityQuery = senderIdentityQuery
        .order('is_default', { ascending: false })
        .limit(1)
    }
    if (input.orgId !== undefined) {
      senderIdentityQuery =
        input.orgId === null
          ? senderIdentityQuery.is('org_id', null)
          : senderIdentityQuery.eq('org_id', input.orgId)
    }
    const { data, error } = await senderIdentityQuery.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as LeadEmailSenderIdentity | null) ?? null
  }

  async findLeadIdByEmail(
    supabase: SupabaseClient,
    input: { userId: string; toEmail: string; orgId?: string | null },
  ): Promise<string | null> {
    let leadQuery = supabase
      .from('leads')
      .select('id')
      .eq('user_id', input.userId)
      .eq('email', input.toEmail)
      .order('created_at', { ascending: false })
      .limit(1)
    if (input.orgId !== undefined) {
      leadQuery = input.orgId === null ? leadQuery.is('org_id', null) : leadQuery.eq('org_id', input.orgId)
    }
    const { data: leadRow, error } = await leadQuery.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (leadRow as { id?: string } | null)?.id ?? null
  }

  async createSentEmailSend(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('email_sends').insert(row).select('*').single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as Record<string, unknown>
  }

  async createFailedEmailSend(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('email_sends').insert(row)
    if (error) throw error
  }
}
