import { LeadsRepositoryBase03 } from './leads-repository-03.base'
import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveConversationChannel } from '../lib/conversation-channel'

function contactActivityValueChanged(before: unknown, after: unknown): boolean {
  if (before === after) return false
  if (before == null && after == null) return false
  if (typeof before === 'object' || typeof after === 'object') {
    return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)
  }
  return true
}

/** Most-recent rows fetched per activity source (memberships, notes, field changes). */
const ACTIVITY_SOURCE_LIMIT = 200

/** Messages embedded per conversation for timeline previews. */
const CONVERSATION_PREVIEW_MESSAGE_LIMIT = 3

/** Max characters returned for the CRM list latest-note preview column. */
const NOTE_PREVIEW_MAX_LENGTH = 500

export abstract class LeadsRepositoryBase04 extends LeadsRepositoryBase03 {

  async linkConversationToContact(
    supabase: SupabaseClient,
    contactId: string,
    conversationId: string,
    orgId?: string | null,
  ) {
    const contact = await this.findContactById(supabase, contactId, orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const contactRow = contact as { user_id: string }

    let conversationQuery = supabase
      .from('conversations')
      .select('id, user_id, contact_id')
      .eq('id', conversationId)
    if (orgId !== undefined) {
      conversationQuery =
        orgId === null
          ? conversationQuery.is('org_id', null)
          : conversationQuery.eq('org_id', orgId)
    }
    const { data: existingConversation, error: existingErr } = await conversationQuery.maybeSingle()
    if (existingErr) throw new Error(`DB error: ${existingErr.message}`)
    if (!existingConversation) throw new NotFoundException('Conversation not found')
    if ((existingConversation as { user_id: string }).user_id !== contactRow.user_id) {
      throw new Error('Conversation owner mismatch')
    }

    let updateQuery = supabase
      .from('conversations')
      .update({
        contact_id: contactId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
    if (orgId !== undefined) {
      updateQuery =
        orgId === null ? updateQuery.is('org_id', null) : updateQuery.eq('org_id', orgId)
    }
    const { data, error } = await updateQuery.select('*').single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async updateContact(
    supabase: SupabaseClient,
    contactId: string,
    updates: Record<string, unknown>,
    orgId: string | null | undefined,
    actorUserId: string,
  ) {
    const previous = await this.findContactById(supabase, contactId, orgId)
    if (!previous) {
      throw new NotFoundException('Contact not found')
    }

    const patch = { ...updates } as Record<string, unknown>
    delete patch.updated_at

    let query = supabase
      .from('contacts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', contactId)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data, error } = await query.select().single()
    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        throw new NotFoundException('Contact not found')
      }
      throw new Error(`DB error: ${error.message}`)
    }

    const prev = previous as Record<string, unknown>
    const next = data as Record<string, unknown>
    const contactOrgId = (prev.org_id as string | null) ?? null

    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', actorUserId)
      .maybeSingle()
    const profile = prof as { full_name: string | null; avatar_url: string | null } | null
    const displayName =
      profile?.full_name && String(profile.full_name).trim().length > 0
        ? String(profile.full_name).trim()
        : 'Member'
    const avatarUrl = profile?.avatar_url ?? null

    const activityRows: Array<{
      contact_id: string
      user_id: string
      org_id: string | null
      event_type: string
      payload: Record<string, unknown>
    }> = []

    for (const key of Object.keys(patch)) {
      if (!contactActivityValueChanged(prev[key], next[key])) continue
      activityRows.push({
        contact_id: contactId,
        user_id: actorUserId,
        org_id: contactOrgId,
        event_type: 'field_change',
        payload: {
          field: key,
          from: prev[key] ?? null,
          to: next[key] ?? null,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      })
    }

    if (activityRows.length > 0) {
      const { error: actErr } = await supabase.from('contact_activity').insert(activityRows)
      if (actErr) throw new Error(`DB error: ${actErr.message}`)
    }

    return data
  }

  async findCustomerBrainIdsForContact(
    supabase: SupabaseClient,
    contactId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const contact = await this.findContactById(supabase, contactId, orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const row = contact as { user_id: string; org_id?: string | null }
    let query = supabase
      .from('ns_brains')
      .select('id')
      .eq('scope', 'customer')
      .eq('owner_id', row.user_id)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    } else if (row.org_id) {
      query = query.eq('org_id', row.org_id)
    }
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []).map((brain: { id: string }) => brain.id)
  }

  async countCustomerMemoriesForContact(
    supabase: SupabaseClient,
    contactId: string,
    brainIds: string[],
  ): Promise<number> {
    if (brainIds.length === 0) return 0
    const { count, error } = await supabase
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .in('brain_id', brainIds)
    if (error) throw new Error(`DB error: ${error.message}`)
    return count ?? 0
  }

  async deleteCustomerMemoriesForContact(
    supabase: SupabaseClient,
    contactId: string,
    brainIds: string[],
  ): Promise<number> {
    if (brainIds.length === 0) return 0
    const { count, error } = await supabase
      .from('ns_memories')
      .delete({ count: 'exact' })
      .eq('contact_id', contactId)
      .in('brain_id', brainIds)
    if (error) throw new Error(`DB error: ${error.message}`)
    return count ?? 0
  }

  async removeContactFromCustomerAvatars(
    supabase: SupabaseClient,
    contactId: string,
    brainIds: string[],
  ): Promise<number> {
    if (brainIds.length === 0) return 0
    const { data, error } = await supabase.rpc('remove_contact_from_customer_avatars', {
      p_contact_id: contactId,
      p_brain_ids: brainIds,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return Number(data ?? 0)
  }

  async createUserContact(
    supabase: SupabaseClient,
    userId: string,
    row: {
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      source: 'manual' | 'import'
      contact_source: string | null
      contact_source_detail?: string | null
    },
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        source: row.source,
        contact_source: row.contact_source,
        contact_source_detail: row.contact_source_detail ?? null,
        tags: [],
        org_id: orgId ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)

    const contact = data as { id: string }
    await this.insertContactIdentifierRows(supabase, orgId ?? userId, [
      {
        contact_id: contact.id,
        email: row.email,
        phone: row.phone,
        source: row.contact_source ?? row.source,
      },
    ])
    return data
  }

  protected async insertContactIdentifierRows(
    supabase: SupabaseClient,
    ownerKey: string,
    contacts: Array<{
      contact_id: string
      email: string | null
      phone: string | null
      source: string
    }>,
  ): Promise<void> {
    const rows: Array<Record<string, unknown>> = []
    for (const c of contacts) {
      const email = c.email?.trim().toLowerCase()
      if (email) {
        rows.push({
          contact_id: c.contact_id,
          owner_key: ownerKey,
          kind: 'email',
          value: email,
          confidence: 1,
          source: c.source,
          last_seen_at: new Date().toISOString(),
        })
      }
      const phone = c.phone?.replace(/[^\d+]/g, '')
      if (phone) {
        rows.push({
          contact_id: c.contact_id,
          owner_key: ownerKey,
          kind: 'phone',
          value: phone,
          confidence: 1,
          source: c.source,
          last_seen_at: new Date().toISOString(),
        })
      }
    }
    if (rows.length === 0) return
    const { error } = await supabase
      .from('contact_identifiers')
      .upsert(rows, { onConflict: 'owner_key,kind,value' })
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  /** Owner-scoped duplicate check: org-wide when an org is active, else personal. */
  async findContactEmailForOwner(
    supabase: SupabaseClient,
    userId: string,
    email: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('contacts').select('id').eq('email', email)
    query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }
}
