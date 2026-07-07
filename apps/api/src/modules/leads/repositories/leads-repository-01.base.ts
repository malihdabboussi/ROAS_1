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

export abstract class LeadsRepositoryBase01 {
  // Abstract declarations for methods implemented by later base classes.
  abstract findCrmContacts(...args: any[]): any;
  abstract findContactById(...args: any[]): any;
  abstract findContactEmailTimeline(...args: any[]): any;
  abstract findContactEmailById(...args: any[]): any;
  abstract findContactConversations(...args: any[]): any;
  protected abstract loadAgentRegistryByKey(...args: any[]): any;
  protected abstract loadAgentNames(...args: any[]): any;
  abstract linkConversationToContact(...args: any[]): any;
  abstract updateContact(...args: any[]): any;
  abstract findCustomerBrainIdsForContact(...args: any[]): any;
  abstract countCustomerMemoriesForContact(...args: any[]): any;
  abstract deleteCustomerMemoriesForContact(...args: any[]): any;
  abstract removeContactFromCustomerAvatars(...args: any[]): any;
  abstract createUserContact(...args: any[]): any;
  protected abstract insertContactIdentifierRows(...args: any[]): any;
  abstract findContactEmailForOwner(...args: any[]): any;
  abstract importContactsBatch(...args: any[]): any;
  abstract importContactsToCampaign(...args: any[]): any;
  abstract findContactActivity(...args: any[]): any;
  abstract createContactNote(...args: any[]): any;
  abstract updateContactNote(...args: any[]): any;
  abstract createLeadSecure(...args: any[]): any;
  // End generated abstract declarations.




  async findByFunnelId(supabase: SupabaseClient, funnelId: string, orgId?: string | null) {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('funnel_id', funnelId)
      .eq('is_archived', false)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findByCampaignId(supabase: SupabaseClient, campaignId: string, orgId?: string | null) {
    const { data: memberships, error: membershipsError } = await supabase
      .from('contact_campaign_memberships')
      .select(
        'id, contact_id, campaign_id, source_funnel_id, first_seen_at, last_seen_at, last_source_domain, last_page_slug',
      )
      .eq('campaign_id', campaignId)
      .order('last_seen_at', { ascending: false })

    if (membershipsError) throw new Error(`DB error: ${membershipsError.message}`)

    const rows = (memberships ?? []) as any[]
    const contactIds = Array.from(new Set(rows.map((r) => r.contact_id).filter(Boolean)))
    if (contactIds.length === 0) return []

    let contactsQuery = supabase
      .from('contacts')
      .select('id, email, first_name, last_name, phone')
      .in('id', contactIds)
    if (orgId !== undefined) {
      contactsQuery =
        orgId === null ? contactsQuery.is('org_id', null) : contactsQuery.eq('org_id', orgId)
    }
    const { data: contacts, error: contactsError } = await contactsQuery

    if (contactsError) throw new Error(`DB error: ${contactsError.message}`)

    const contactById = new Map((contacts ?? []).map((c: any) => [c.id, c]))

    return rows
      .map((row) => {
        const c = contactById.get(row.contact_id)
        const first = (c?.first_name as string | null) ?? null
        const last = (c?.last_name as string | null) ?? null
        const fullName = [first, last].filter(Boolean).join(' ') || null

        return {
          id: row.id,
          email: c?.email ?? null,
          name: fullName,
          phone: c?.phone ?? null,
          funnel_id: row.source_funnel_id ?? null,
          campaign_id: row.campaign_id ?? null,
          contact_type: 'lead',
          source_domain: row.last_source_domain ?? null,
          page_slug: row.last_page_slug ?? null,
          created_at: row.first_seen_at ?? null,
        }
      })
      .filter((r) => r.email)
  }

  // ─── Contacts ───

  async findContacts(
    supabase: SupabaseClient,
    opts: {
      search?: string
      sort?: string
      limit?: number
      offset?: number
      orgId?: string | null
    },
  ) {
    let query = supabase.from('contacts').select('*', { count: 'exact' })

    if (opts.orgId !== undefined) {
      query = opts.orgId === null ? query.is('org_id', null) : query.eq('org_id', opts.orgId)
    }

    if (opts.search) {
      query = query.or(
        `email.ilike.%${opts.search}%,first_name.ilike.%${opts.search}%,last_name.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`,
      )
    }

    const [sortCol, sortDir] = (opts.sort ?? 'created_at.desc').split('.')
    query = query.order(sortCol ?? 'created_at', { ascending: sortDir === 'asc' })
    query = query.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return { data: data ?? [], total: count ?? 0 }
  }

  async findContactBasicsByIds(supabase: SupabaseClient, ids: string[], orgId?: string | null) {
    if (ids.length === 0) return []
    let query = supabase
      .from('contacts')
      .select('id, email, first_name, last_name, phone')
      .in('id', ids)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findCrmFunnels(supabase: SupabaseClient, orgId?: string | null) {
    let query = supabase.from('funnels').select('id, title')
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data, error } = await query.order('updated_at', { ascending: false })

    if (error) throw new Error(`DB error: ${error.message}`)
    return { funnels: (data ?? []) as Array<{ id: string; title: string | null }> }
  }
}
