import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ContactChannel,
  ContactIdentifierKind,
  ContactOwner,
  ResolvedContact,
} from '../services/contact-identifier.service'

@Injectable()
export class ContactIdentifierRepository {
  async findIdentifierContactId(
    supabase: SupabaseClient,
    input: { ownerKey: string; kind: ContactIdentifierKind; value: string },
  ): Promise<string | null> {
    const { data: identifier, error } = await supabase
      .from('contact_identifiers')
      .select('contact_id')
      .eq('owner_key', input.ownerKey)
      .eq('kind', input.kind)
      .eq('value', input.value)
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    return (identifier as { contact_id?: string } | null)?.contact_id ?? null
  }

  async findScopedContact(
    supabase: SupabaseClient,
    contactId: string,
    owner: ContactOwner,
  ): Promise<ResolvedContact | null> {
    let query = supabase
      .from('contacts')
      .select('id, user_id, org_id, email, contact_type')
      .eq('id', contactId)
    query = owner.orgId ? query.eq('org_id', owner.orgId) : query.is('org_id', null)
    const { data: contact, error } = await query.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (contact as ResolvedContact | null) ?? null
  }

  async findContactByEmail(
    supabase: SupabaseClient,
    owner: ContactOwner,
    email: string,
  ): Promise<ResolvedContact | null> {
    let emailQuery = supabase
      .from('contacts')
      .select('id, user_id, org_id, email, contact_type')
      .eq('email', email)
    emailQuery = owner.orgId
      ? emailQuery.eq('org_id', owner.orgId)
      : emailQuery.eq('user_id', owner.userId).is('org_id', null)
    const { data, error } = await emailQuery.limit(1).maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as ResolvedContact | null) ?? null
  }

  async findContactOwner(
    supabase: SupabaseClient,
    contactId: string,
  ): Promise<{ user_id: string; org_id: string | null } | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('user_id, org_id')
      .eq('id', contactId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as { user_id: string; org_id: string | null } | null
  }

  async createUnknownContact(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      email: string | null
      firstName: string | null
      lastName: string | null
      channel: ContactChannel
      detail: string | null
    },
  ): Promise<ResolvedContact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: input.userId,
        org_id: input.orgId ?? null,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        source: 'manual',
        contact_source: input.channel,
        contact_source_detail: input.detail,
        contact_type: 'unknown',
        contact_type_source: 'integration',
        contact_type_confidence: 0.2,
        contact_type_set_at: new Date().toISOString(),
        tags: [],
      })
      .select('id, user_id, org_id, email, contact_type')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as ResolvedContact
  }

  async upsertIdentifier(
    supabase: SupabaseClient,
    input: {
      contactId: string
      ownerKey: string
      kind: ContactIdentifierKind
      value: string
      confidence: number
      source: string
    },
  ): Promise<void> {
    const { error } = await supabase.from('contact_identifiers').upsert(
      {
        contact_id: input.contactId,
        owner_key: input.ownerKey,
        kind: input.kind,
        value: input.value,
        confidence: input.confidence,
        source: input.source,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'owner_key,kind,value' },
    )
    if (error) throw new Error(`DB error: ${error.message}`)
  }
}
