import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null; count?: number | null }

export type ArtifactContactListInput = {
  orgId: string
  search?: string | null
  sort?: string | null
  limit: number
  offset: number
  filters?: Record<string, unknown> | null
  includeArchived: boolean
  contactType?: string | null
  campaignId?: string | null
}

export type ArtifactContactCreateInput = {
  userId: string
  orgId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
}

export type ArtifactContactUpdateInput = {
  contactId: string
  orgId: string
  actorUserId: string
  updates: Record<string, unknown>
}

const CRM_CONTACT_SELECT_COLUMNS = [
  'id', 'email', 'first_name', 'last_name', 'phone', 'tags', 'custom_fields',
  'contact_type', 'contact_type_source', 'contact_type_confidence', 'contact_type_set_at',
  'contact_source', 'contact_source_detail', 'is_archived', 'business_name', 'website',
  'address', 'city', 'state', 'country', 'created_at', 'updated_at',
]

const NOTE_PREVIEW_MAX_LENGTH = 500

@Injectable()
export class ArtifactContactsRepository {
  async listContacts(
    supabase: SupabaseClient,
    input: ArtifactContactListInput,
  ): Promise<QueryListResult<Record<string, unknown>> & { hasMore: boolean }> {
    const selectColumns = [...CRM_CONTACT_SELECT_COLUMNS]
    if (input.campaignId) selectColumns.push('contact_campaign_memberships!inner(campaign_id)')

    let query = supabase
      .from('contacts')
      .select(selectColumns.join(','), { count: 'exact' })
      .eq('org_id', input.orgId)
      .eq('is_archived', input.includeArchived)

    if (input.contactType) query = query.eq('contact_type', input.contactType)
    if (input.campaignId) {
      query = query.eq('contact_campaign_memberships.campaign_id', input.campaignId)
    }
    if (input.search) {
      const search = input.search.replace(/[%_,]/g, '').trim()
      if (search) {
        query = query.or(
          `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,business_name.ilike.%${search}%`,
        )
      }
    }

    query = this.applyStructuredFilters(query, input.filters)
    query = this.applySort(query, input.sort)
    query = query.range(input.offset, input.offset + input.limit - 1)

    const { data, error, count } = (await query) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)

    const contacts = await this.enrichContacts(supabase, input.orgId, data ?? [])
    const total = count ?? contacts.length
    return { data: contacts, error: null, count: total, hasMore: input.offset + input.limit < total }
  }

  async findContactById(
    supabase: SupabaseClient,
    input: { contactId: string; orgId: string },
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('contacts')
      .select('*')
      .eq('id', input.contactId)
      .eq('org_id', input.orgId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findContactEmailForOwner(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string; email: string },
  ): Promise<QueryResult<{ id: string }>> {
    return (await supabase
      .from('contacts')
      .select('id')
      .eq('org_id', input.orgId)
      .eq('email', input.email)
      .limit(1)
      .maybeSingle()) as QueryResult<{ id: string }>
  }

  async createContact(
    supabase: SupabaseClient,
    input: ArtifactContactCreateInput,
  ): Promise<QueryResult<Record<string, unknown>>> {
    const { data, error } = (await supabase
      .from('contacts')
      .insert({
        user_id: input.userId,
        org_id: input.orgId,
        email: input.email,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        phone: input.phone ?? null,
        source: 'manual',
        contact_source: 'manual',
        contact_source_detail: null,
        tags: [],
      })
      .select()
      .single()) as QueryResult<Record<string, unknown>>
    if (error) return { data: null, error }

    await this.upsertContactIdentifierRows(supabase, input.orgId, [
      {
        contact_id: String(data?.id ?? ''),
        email: input.email,
        phone: input.phone ?? null,
        source: 'manual',
      },
    ])
    return { data, error: null }
  }

  async updateContact(
    supabase: SupabaseClient,
    input: ArtifactContactUpdateInput,
  ): Promise<QueryResult<Record<string, unknown>>> {
    const previous = await this.findContactById(supabase, {
      contactId: input.contactId,
      orgId: input.orgId,
    })
    if (previous.error) return previous
    if (!previous.data) return { data: null, error: null }

    const patch = { ...input.updates }
    delete patch.updated_at

    const { data, error } = (await supabase
      .from('contacts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', input.contactId)
      .eq('org_id', input.orgId)
      .select()
      .single()) as QueryResult<Record<string, unknown>>
    if (error) return { data: null, error }
    if (!data) return { data: null, error: null }

    await this.recordContactActivity(supabase, {
      contactId: input.contactId,
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      previous: previous.data,
      updated: data,
      patch,
    })
    return { data, error: null }
  }

  private applyStructuredFilters(
    query: any,
    filters?: Record<string, unknown> | null,
  ) {
    const getFilter = (key: string) => {
      const value = filters?.[key]
      if (!value || typeof value !== 'object') return null
      const field = value as {
        operator?: unknown
        value?: unknown
        multiSelectLogic?: unknown
      }
      if (
        field.operator !== 'is' &&
        field.operator !== 'is_not' &&
        field.operator !== 'is_empty' &&
        field.operator !== 'is_not_empty'
      ) {
        return null
      }
      return field
    }

    const applyTextFilter = (column: string, filter: ReturnType<typeof getFilter>) => {
      if (!filter) return query
      if (filter.operator === 'is_empty') return query.is(column, null)
      if (filter.operator === 'is_not_empty') return query.not(column, 'is', null)
      if (typeof filter.value !== 'string' || !filter.value.trim()) return query
      if (filter.operator === 'is') return query.ilike(column, `%${filter.value.trim()}%`)
      return query.not(column, 'ilike', `%${filter.value.trim()}%`)
    }

    const map: Record<string, string> = {
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
      query = applyTextFilter(column, getFilter(key))
    }

    const tags = getFilter('tagIds')
    if (tags && Array.isArray(tags.value) && tags.value.length > 0) {
      query =
        tags.operator === 'is'
          ? tags.multiSelectLogic === 'all'
            ? query.contains('tags', tags.value)
            : query.overlaps('tags', tags.value)
          : query.not('tags', 'ov', tags.value)
    }

    const dateFrom = getFilter('dateFrom')
    if (dateFrom?.operator === 'is' && typeof dateFrom.value === 'string' && dateFrom.value) {
      query = query.gte('created_at', dateFrom.value)
    }
    const dateTo = getFilter('dateTo')
    if (dateTo?.operator === 'is' && typeof dateTo.value === 'string' && dateTo.value) {
      query = query.lte('created_at', dateTo.value)
    }

    return query
  }

  private applySort(query: any, sort?: string | null) {
    switch (sort ?? 'created_at.desc') {
      case 'created_at.asc':
        return query.order('created_at', { ascending: true })
      case 'email.asc':
        return query.order('email', { ascending: true })
      case 'email.desc':
        return query.order('email', { ascending: false })
      case 'name.asc':
        return query
          .order('last_name', { ascending: true, nullsFirst: false })
          .order('first_name', { ascending: true, nullsFirst: false })
      case 'name.desc':
        return query
          .order('last_name', { ascending: false, nullsFirst: true })
          .order('first_name', { ascending: false, nullsFirst: true })
      case 'created_at.desc':
      default:
        return query.order('created_at', { ascending: false })
    }
  }

  private async enrichContacts(
    supabase: SupabaseClient,
    orgId: string,
    contacts: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]> {
    const contactIds = contacts.map((contact) => String(contact.id ?? '')).filter(Boolean)
    if (contactIds.length === 0) return contacts

    const latestNotePreviewByContactId = new Map<string, string>()
    const { data, error } = (await supabase
      .from('contacts')
      .select('id, contact_notes(content, created_at)')
      .in('id', contactIds)
      .eq('contact_notes.org_id', orgId)
      .order('created_at', { ascending: false, referencedTable: 'contact_notes' })
      .limit(1, { referencedTable: 'contact_notes' })) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)

    for (const row of data ?? []) {
      const id = String(row.id ?? '')
      const notes = Array.isArray(row.contact_notes) ? row.contact_notes : []
      const content = typeof notes[0]?.content === 'string' ? notes[0].content.trim() : ''
      if (id && content) {
        latestNotePreviewByContactId.set(id, content.slice(0, NOTE_PREVIEW_MAX_LENGTH))
      }
    }

    return contacts.map((contact) => {
      const { contact_campaign_memberships: _campaignMemberships, ...rest } = contact
      return {
        ...rest,
        latest_note_preview: latestNotePreviewByContactId.get(String(contact.id ?? '')) ?? null,
      }
    })
  }

  private async upsertContactIdentifierRows(
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
    for (const contact of contacts) {
      const email = contact.email?.trim().toLowerCase()
      if (email) {
        rows.push({
          contact_id: contact.contact_id,
          owner_key: ownerKey,
          kind: 'email',
          value: email,
          confidence: 1,
          source: contact.source,
          last_seen_at: new Date().toISOString(),
        })
      }
      const phone = contact.phone?.replace(/[^\d+]/g, '')
      if (phone) {
        rows.push({
          contact_id: contact.contact_id,
          owner_key: ownerKey,
          kind: 'phone',
          value: phone,
          confidence: 1,
          source: contact.source,
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

  private async recordContactActivity(
    supabase: SupabaseClient,
    input: {
      contactId: string
      orgId: string
      actorUserId: string
      previous: Record<string, unknown>
      updated: Record<string, unknown>
      patch: Record<string, unknown>
    },
  ): Promise<void> {
    const activityRows = Object.keys(input.patch)
      .filter((key) => this.valueChanged(input.previous[key], input.updated[key]))
      .map((key) => ({
        contact_id: input.contactId,
        user_id: input.actorUserId,
        org_id: input.orgId,
        event_type: 'field_change',
        payload: {
          field: key,
          from: input.previous[key] ?? null,
          to: input.updated[key] ?? null,
        },
      }))

    if (activityRows.length === 0) return
    const { error } = await supabase.from('contact_activity').insert(activityRows)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  private valueChanged(before: unknown, after: unknown): boolean {
    if (before === after) return false
    if (before == null && after == null) return false
    if (typeof before === 'object' || typeof after === 'object') {
      return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)
    }
    return true
  }
}
