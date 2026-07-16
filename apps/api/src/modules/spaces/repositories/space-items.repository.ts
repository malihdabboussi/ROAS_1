import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope, resolveScopedOrgId } from '@vibey/api-shared'
import type { CreateSpaceItemDto, SpaceItemQuery, UpdateSpaceItemDto } from '../dto'

/**
 * Column list for `item_kind=task` list fetches: every `space_items` column
 * EXCEPT `doc_body` (up to 200k chars of editor HTML per row that task views
 * never render - docs/all fetches keep `select('*')`). Keep in sync with the
 * `space_items` table when adding columns.
 */
const SPACE_ITEM_TASK_LIST_COLUMNS = [
  'id',
  'space_id',
  'org_id',
  'user_id',
  'title',
  'status',
  'priority',
  'assignee_type',
  'assignee_id',
  'assignees',
  'start_date',
  'due_date',
  'notes',
  'description',
  'source',
  'suggestion_state',
  'linked_mission_id',
  'form_id',
  'recurrence',
  'recurrence_parent_id',
  'parent_item_id',
  'task_execution_status',
  'is_private',
  'share_link_enabled',
  'share_token',
  'sort_order',
  'custom_data',
  'created_at',
  'updated_at',
].join(', ')

type RepositoryErrorResult = {
  error: { message: string } | null
}

type DocMentionPreviewRow = {
  id: string
  space_id: string | null
  title: string | null
  doc_body: string | null
  custom_data: Record<string, unknown> | null
}

@Injectable()
export class SpaceItemsRepository {
  private applyItemOwnerScope(query: any, userId: string, orgId?: string | null) {
    return applyOwnerScope(query, { userId, orgId: orgId ?? null })
  }

  async findItemsBySpaceId(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
  ) {
    let q = supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .order('sort_order', { ascending: true })
    q = this.applyItemOwnerScope(q, userId, orgId)
    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async findItemsBySpaceIdForAccess(
    supabase: SupabaseClient,
    spaceId: string,
    query?: SpaceItemQuery,
  ) {
    const itemKind = query?.item_kind ?? 'all'
    const parentScope = query?.parent_scope ?? 'all'
    const search = query?.q?.trim().toLowerCase()
    let q = supabase
      .from('space_items')
      .select(itemKind === 'task' ? SPACE_ITEM_TASK_LIST_COLUMNS : '*')
      .eq('space_id', spaceId)
      .order('sort_order', { ascending: true })
    if (itemKind === 'task') q = q.is('custom_data->>_view_type', null)
    else if (itemKind === 'doc') q = q.eq('custom_data->>_view_type', 'doc')
    else if (itemKind === 'view_item') {
      q = q.not('custom_data->>_view_type', 'is', null).neq('custom_data->>_view_type', 'doc')
    }
    if (parentScope === 'top_level') q = q.is('parent_item_id', null)
    else if (parentScope === 'children') q = q.not('parent_item_id', 'is', null)
    if (typeof query?.limit === 'number' && !search) q = q.limit(query.limit)
    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)
    let rows = (data ?? []) as any[]
    if (search) {
      rows = rows.filter((item) => {
        const title = typeof item.title === 'string' ? item.title.toLowerCase() : ''
        const notes = typeof item.notes === 'string' ? item.notes.toLowerCase() : ''
        const description =
          typeof item.description === 'string' ? item.description.toLowerCase() : ''
        return title.includes(search) || notes.includes(search) || description.includes(search)
      })
      if (typeof query?.limit === 'number') rows = rows.slice(0, query.limit)
    }
    return rows
  }

  async findItemById(supabase: SupabaseClient, spaceId: string, itemId: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('id', itemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  /** Existing Fathom call row for this space + Fathom meeting id (dedupe ingest). */
  async findItemByFathomMeetingId(
    supabase: SupabaseClient,
    spaceId: string,
    meetingId: string,
  ): Promise<Record<string, unknown> | null> {
    const id = String(meetingId ?? '').trim()
    if (!id) return null
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('custom_data->external_automation->>meeting_id', id)
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  /** Prep / linked row for a provider calendar event id (e.g. google:…). */
  async findItemByCalendarEventId(
    supabase: SupabaseClient,
    spaceId: string,
    calendarEventId: string,
  ): Promise<Record<string, unknown> | null> {
    const id = String(calendarEventId ?? '').trim()
    if (!id) return null
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('custom_data->>calendar_event_id', id)
      .eq('custom_data->>entry_type', 'prep')
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  /** Batch lookup prep items by calendar event ids (agenda enrichment). */
  async findPrepItemsByCalendarEventIds(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    calendarEventIds: string[],
  ): Promise<Record<string, unknown>[]> {
    const ids = [...new Set(calendarEventIds.map((id) => String(id).trim()).filter(Boolean))]
    if (ids.length === 0) return []
    let q = supabase
      .from('space_items')
      .select('id, space_id, title, custom_data, status, updated_at')
      .eq('custom_data->>entry_type', 'prep')
      .in('custom_data->>calendar_event_id', ids)
      .order('updated_at', { ascending: false })
    q = this.applyItemOwnerScope(q, userId, orgId)
    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async findAccessibleItemById(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    itemId: string,
  ) {
    let q = supabase.from('space_items').select('*').eq('id', itemId)
    q = this.applyItemOwnerScope(q, userId, orgId)
    const { data, error } = await q.maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async findDocMentionPreviewItemById(
    supabase: SupabaseClient,
    itemId: string,
  ): Promise<{ data: DocMentionPreviewRow | null } & RepositoryErrorResult> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, space_id, title, doc_body, custom_data')
      .eq('id', itemId)
      .maybeSingle()

    return {
      data: (data ?? null) as DocMentionPreviewRow | null,
      error: error ? { message: error.message } : null,
    }
  }

  async updateLinkedConversationDocument(
    supabase: SupabaseClient,
    conversationDocumentId: string,
    updates: Record<string, unknown>,
  ): Promise<RepositoryErrorResult> {
    const { error } = await supabase
      .from('conversation_documents')
      .update(updates)
      .eq('id', conversationDocumentId)

    return { error: error ? { message: error.message } : null }
  }

  async findActiveOrgMemberUserIds(
    supabase: SupabaseClient,
    orgId: string,
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) return []
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .in('user_id', userIds)
    if (error) return []
    return (data ?? []).map((row) => String((row as { user_id: unknown }).user_id))
  }

  async maxSortOrderForParent(
    supabase: SupabaseClient,
    spaceId: string,
    parentItemId: string | null,
  ): Promise<number> {
    let q = supabase
      .from('space_items')
      .select('sort_order')
      .eq('space_id', spaceId)
      .order('sort_order', { ascending: false })
      .limit(1)
    q = parentItemId ? q.eq('parent_item_id', parentItemId) : q.is('parent_item_id', null)
    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)
    const row = data?.[0] as { sort_order?: number } | undefined
    return typeof row?.sort_order === 'number' ? row.sort_order : -1
  }

  async createItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: CreateSpaceItemDto,
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('space_items')
      .insert({
        ...dto,
        space_id: spaceId,
        user_id: userId,
        org_id: resolveScopedOrgId({ orgId: orgId ?? null }),
      })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async createPreparedItem(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('space_items').insert(payload).select().single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async createPreparedItems(
    supabase: SupabaseClient,
    payloads: Record<string, unknown>[],
  ): Promise<void> {
    if (payloads.length === 0) return
    const { error } = await supabase.from('space_items').insert(payloads)
    if (error) throw new BadRequestException(error.message)
  }

  async updateItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    dto: UpdateSpaceItemDto,
    orgId?: string | null,
  ) {
    const payload: Record<string, unknown> = { ...dto }
    if (dto.custom_data !== undefined) {
      const existing = await this.findItemById(supabase, spaceId, itemId)
      payload.custom_data = {
        ...(((existing as { custom_data?: Record<string, unknown> | null } | null)?.custom_data ??
          {}) as Record<string, unknown>),
        ...(dto.custom_data ?? {}),
      }
    }
    let q = supabase.from('space_items').update(payload).eq('id', itemId).eq('space_id', spaceId)
    q = this.applyItemOwnerScope(q, userId, orgId)
    const { data, error } = await q.select().single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async findItemsByIds(supabase: SupabaseClient, spaceId: string, itemIds: string[]) {
    if (itemIds.length === 0) return []
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .in('id', itemIds)
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async updateItemPrepared(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    payload: Record<string, unknown>,
    orgId?: string | null,
  ) {
    let q = supabase.from('space_items').update(payload).eq('id', itemId).eq('space_id', spaceId)
    q = this.applyItemOwnerScope(q, userId, orgId)
    const { data, error } = await q.select().single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async updateItemBySpaceId(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    payload: Record<string, unknown>,
  ) {
    const { error } = await supabase
      .from('space_items')
      .update(payload)
      .eq('id', itemId)
      .eq('space_id', spaceId)
    if (error) throw new BadRequestException(error.message)
  }

  async findSubtasksByParentId(supabase: SupabaseClient, spaceId: string, parentItemId: string) {
    const { data, error } = await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', spaceId)
      .eq('parent_item_id', parentItemId)
      .order('sort_order', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async deleteItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ) {
    let q = supabase.from('space_items').delete().eq('id', itemId).eq('space_id', spaceId)
    q = this.applyItemOwnerScope(q, userId, orgId)
    const { error } = await q
    if (error) throw new BadRequestException(error.message)
    return { deleted: true }
  }
}
