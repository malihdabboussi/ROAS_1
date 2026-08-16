import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveConversationChannel } from '../lib/conversation-channel'
import { LeadsRepositoryBase01 } from './leads-repository-01.base'

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

export abstract class LeadsRepositoryBase02 extends LeadsRepositoryBase01 {
  async findCrmContacts(
    supabase: SupabaseClient,
    opts: {
      search?: string
      sort?: string
      limit?: number
      offset?: number
      filters?: Record<string, unknown>
      includeArchived?: boolean
      contactType?: string
      campaignId?: string
      segmentFunnelIds?: string[]
      segmentDateFrom?: string
      segmentDateTo?: string
      orgId?: string | null
    },
  ) {
    type FilterField = {
      operator: 'is' | 'is_not' | 'is_empty' | 'is_not_empty'
      value: string | string[] | null
      multiSelectLogic?: 'any' | 'all'
    }

    const limit = opts.limit ?? 50
    const offset = opts.offset ?? 0

    // Campaign / segment-funnel scoping uses `!inner` embeds (SQL inner joins)
    // instead of prefetching every membership contact_id into app memory —
    // one round-trip, no unbounded ID lists inlined into the query.
    const selectColumns = [
      'id',
      'email',
      'first_name',
      'last_name',
      'phone',
      'tags',
      'contact_type',
      'contact_type_source',
      'contact_type_confidence',
      'contact_type_set_at',
      'contact_source',
      'contact_source_detail',
      'is_archived',
      'business_name',
      'website',
      'city',
      'state',
      'country',
      'created_at',
      'updated_at',
    ]
    if (opts.campaignId) selectColumns.push('contact_campaign_memberships!inner(campaign_id)')
    if (opts.segmentFunnelIds && opts.segmentFunnelIds.length > 0) {
      selectColumns.push('contact_funnel_memberships!inner(funnel_id)')
    }

    let query = supabase.from('contacts').select(selectColumns.join(','), { count: 'exact' })

    if (opts.orgId !== undefined) {
      query = opts.orgId === null ? query.is('org_id', null) : query.eq('org_id', opts.orgId)
    }

    // Archive status (default: show non-archived)
    query = query.eq('is_archived', Boolean(opts.includeArchived))

    // Contact type (lead/customer)
    if (opts.contactType) query = query.eq('contact_type', opts.contactType)

    // Campaign scope — restrict to contacts with a membership in this campaign
    if (opts.campaignId) {
      query = query.eq('contact_campaign_memberships.campaign_id', opts.campaignId)
    }

    // Segment funnel scope — contacts with a membership in any segment funnel
    if (opts.segmentFunnelIds && opts.segmentFunnelIds.length > 0) {
      query = query.in('contact_funnel_memberships.funnel_id', opts.segmentFunnelIds)
    }

    if (opts.segmentDateFrom) {
      query = query.gte('created_at', `${opts.segmentDateFrom}T00:00:00.000Z`)
    }
    if (opts.segmentDateTo) {
      query = query.lte('created_at', `${opts.segmentDateTo}T23:59:59.999Z`)
    }

    // Global search
    if (opts.search) {
      query = query.or(
        `email.ilike.%${opts.search}%,first_name.ilike.%${opts.search}%,last_name.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`,
      )
    }

    // Structured filters (subset of legacy behavior)
    const filters = (opts.filters ?? {}) as Record<string, FilterField>
    const getFilter = (key: string): FilterField | undefined => {
      const f = filters[key]
      if (!f || typeof f !== 'object') return undefined
      if (
        f.operator !== 'is' &&
        f.operator !== 'is_not' &&
        f.operator !== 'is_empty' &&
        f.operator !== 'is_not_empty'
      )
        return undefined
      return f
    }

    // Filters that require membership lookup to produce contact_ids.
    const contactIdConstraints: { include?: Set<string>; exclude?: Set<string> } = {}

    const funnelFilter = getFilter('funnelIds')
    if (funnelFilter && Array.isArray(funnelFilter.value) && funnelFilter.value.length > 0) {
      const { data: rows, error } = await supabase
        .from('contact_funnel_memberships')
        .select('contact_id')
        .in('funnel_id', funnelFilter.value)
      if (error) throw new Error(`DB error: ${error.message}`)
      const ids = new Set((rows ?? []).map((r: any) => r.contact_id as string).filter(Boolean))
      if (funnelFilter.operator === 'is') contactIdConstraints.include = ids
      if (funnelFilter.operator === 'is_not') contactIdConstraints.exclude = ids
    }

    const sourceDomainFilter = getFilter('sourceDomain')
    if (
      sourceDomainFilter &&
      typeof sourceDomainFilter.value === 'string' &&
      sourceDomainFilter.value.trim()
    ) {
      const domain = sourceDomainFilter.value.trim()
      let membershipQuery = supabase.from('contact_funnel_memberships').select('contact_id')
      if (sourceDomainFilter.operator === 'is') {
        membershipQuery = membershipQuery.ilike('last_source_domain', `%${domain}%`)
      } else if (sourceDomainFilter.operator === 'is_not') {
        membershipQuery = membershipQuery.not('last_source_domain', 'ilike', `%${domain}%`)
      }
      if (sourceDomainFilter.operator === 'is_empty')
        membershipQuery = membershipQuery.is('last_source_domain', null)
      if (sourceDomainFilter.operator === 'is_not_empty')
        membershipQuery = membershipQuery.not('last_source_domain', 'is', null)

      const { data: rows, error } = await membershipQuery
      if (error) throw new Error(`DB error: ${error.message}`)
      const ids = new Set((rows ?? []).map((r: any) => r.contact_id as string).filter(Boolean))
      // Combine with existing include constraint using intersection when both exist.
      contactIdConstraints.include = contactIdConstraints.include
        ? new Set([...contactIdConstraints.include].filter((id) => ids.has(id)))
        : ids
    }

    // Apply include/exclude constraints if present.
    if (contactIdConstraints.include) {
      const ids = [...contactIdConstraints.include]
      if (ids.length === 0) return { contacts: [], total: 0, hasMore: false }
      query = query.in('id', ids)
    }
    if (contactIdConstraints.exclude) {
      const ids = [...contactIdConstraints.exclude]
      if (ids.length > 0) {
        // PostgREST expects "not in" in a single string: '(a,b,c)'.
        const quoted = ids.map((id) => `'${String(id).replace(/'/g, "''")}'`).join(',')
        query = query.not('id', 'in', `(${quoted})`)
      }
    }

    const applyTextFilter = (column: string, f: FilterField) => {
      if (f.operator === 'is_empty') return query.is(column, null)
      if (f.operator === 'is_not_empty') return query.not(column, 'is', null)
      if (typeof f.value !== 'string' || !f.value.trim()) return query
      if (f.operator === 'is') return query.ilike(column, `%${f.value.trim()}%`)
      return query.not(column, 'ilike', `%${f.value.trim()}%`)
    }

    const applyArrayFilter = (column: string, f: FilterField) => {
      if (!Array.isArray(f.value) || f.value.length === 0) return query
      const logic = f.multiSelectLogic ?? 'any'
      if (f.operator === 'is') {
        return logic === 'all' ? query.contains(column, f.value) : query.overlaps(column, f.value)
      }
      // is_not: exclude anything that overlaps.
      return query.not(column, 'ov', f.value)
    }

    // Text-like filters (contacts table columns)
    const map: Record<string, string> = {
      name: 'email', // name is derived; keep filter drawer aligned to first/last fields
      email: 'email',
      phone: 'phone',
      firstName: 'first_name',
      lastName: 'last_name',
      businessName: 'business_name',
      website: 'website',
      city: 'city',
      state: 'state',
      country: 'country',
      contactSource: 'contact_source',
      contactType: 'contact_type',
    }

    for (const [key, column] of Object.entries(map)) {
      const f = getFilter(key)
      if (f) query = applyTextFilter(column, f)
    }

    const tagsFilter = getFilter('tagIds')
    if (tagsFilter) query = applyArrayFilter('tags', tagsFilter)

    const dateFrom = getFilter('dateFrom')
    if (dateFrom && typeof dateFrom.value === 'string' && dateFrom.value) {
      if (dateFrom.operator === 'is') query = query.gte('created_at', dateFrom.value)
    }
    const dateTo = getFilter('dateTo')
    if (dateTo && typeof dateTo.value === 'string' && dateTo.value) {
      if (dateTo.operator === 'is') query = query.lte('created_at', dateTo.value)
    }

    // Sorting (subset)
    const sort = opts.sort ?? 'created_at.desc'
    switch (sort) {
      case 'created_at.asc':
        query = query.order('created_at', { ascending: true })
        break
      case 'created_at.desc':
        query = query.order('created_at', { ascending: false })
        break
      case 'email.asc':
        query = query.order('email', { ascending: true })
        break
      case 'email.desc':
        query = query.order('email', { ascending: false })
        break
      case 'name.asc':
        query = query
          .order('last_name', { ascending: true, nullsFirst: false })
          .order('first_name', {
            ascending: true,
            nullsFirst: false,
          })
        break
      case 'name.desc':
        query = query
          .order('last_name', { ascending: false, nullsFirst: true })
          .order('first_name', {
            ascending: false,
            nullsFirst: true,
          })
        break
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`DB error: ${error.message}`)

    const contacts = (data ?? []) as any[]
    const total = count ?? 0

    // Enrich with last funnel membership info (domain/page + funnel title).
    const contactIds = contacts.map((c) => c.id).filter(Boolean)
    const latestMembershipByContactId = new Map<
      string,
      {
        funnel_id: string | null
        funnel_title: string | null
        source_domain: string | null
        page_slug: string | null
      }
    >()

    const latestNotePreviewByContactId = new Map<string, string>()

    if (contactIds.length > 0) {
      // One bounded query: latest funnel membership + latest note per contact
      // via per-foreign-table order/limit, instead of fetching every
      // membership row and every note (full content) for the page.
      let enrichQuery = supabase
        .from('contacts')
        .select(
          'id, contact_funnel_memberships(funnel_id, last_source_domain, last_page_slug, last_seen_at, funnels(title:name)), contact_notes(content, created_at)',
        )
        .in('id', contactIds)
        .order('last_seen_at', {
          ascending: false,
          referencedTable: 'contact_funnel_memberships',
        })
        .limit(1, { referencedTable: 'contact_funnel_memberships' })
        .order('created_at', { ascending: false, referencedTable: 'contact_notes' })
        .limit(1, { referencedTable: 'contact_notes' })
      if (opts.orgId !== undefined) {
        enrichQuery =
          opts.orgId === null
            ? enrichQuery.is('contact_notes.org_id', null)
            : enrichQuery.eq('contact_notes.org_id', opts.orgId)
      }
      const { data: enrichRows, error: enrichError } = await enrichQuery
      if (enrichError) throw new Error(`DB error: ${enrichError.message}`)

      for (const row of (enrichRows ?? []) as any[]) {
        const cid = row.id as string
        if (!cid) continue
        const membership = (row.contact_funnel_memberships ?? [])[0]
        if (membership) {
          latestMembershipByContactId.set(cid, {
            funnel_id: (membership.funnel_id as string | null) ?? null,
            funnel_title: (membership.funnels?.title as string | null) ?? null,
            source_domain: (membership.last_source_domain as string | null) ?? null,
            page_slug: (membership.last_page_slug as string | null) ?? null,
          })
        }
        const note = (row.contact_notes ?? [])[0]
        const content = typeof note?.content === 'string' ? note.content.trim() : ''
        if (content) {
          latestNotePreviewByContactId.set(cid, content.slice(0, NOTE_PREVIEW_MAX_LENGTH))
        }
      }
    }

    const enriched = contacts.map((c) => {
      const {
        contact_campaign_memberships: _campaignMemberships,
        contact_funnel_memberships: _funnelMemberships,
        ...contact
      } = c
      const latest = latestMembershipByContactId.get(contact.id as string)
      return {
        ...contact,
        funnel_id: latest?.funnel_id ?? null,
        funnel_title: latest?.funnel_title ?? null,
        source_domain: latest?.source_domain ?? null,
        page_slug: latest?.page_slug ?? null,
        latest_note_preview: latestNotePreviewByContactId.get(contact.id as string) ?? null,
      }
    })

    return {
      contacts: enriched,
      total,
      hasMore: offset + limit < total,
    }
  }
}
