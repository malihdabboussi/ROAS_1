import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type FunnelChangeStatus = 'applied' | 'undone' | 'superseded'
export type FunnelChangeSource = 'studio' | 'agent'
export type FunnelChangeOperation = 'insert' | 'update' | 'delete'

export interface FunnelChangeItemInput {
  entity_type: 'funnel_file' | 'funnel_page'
  entity_id: string | null
  path: string | null
  operation: FunnelChangeOperation
  before_snapshot: Record<string, unknown> | null
  after_snapshot: Record<string, unknown> | null
  funnel_page_id?: string | null
}

export interface FunnelChangeSetInput {
  funnelId: string
  funnelPageId: string | null
  userId: string
  orgId: string | null
  source: FunnelChangeSource
  action: string
  label?: string | null
  metadata?: Record<string, unknown>
  items: FunnelChangeItemInput[]
}

@Injectable()
export class FunnelHistoryRepository {
  async findLatestByStatus(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; status: FunnelChangeStatus },
  ) {
    let q = supabase
      .from('funnel_change_sets')
      .select('*')
      .eq('funnel_id', input.funnelId)
      .eq('status', input.status)
    q = input.funnelPageId
      ? q.or(`funnel_page_id.eq.${input.funnelPageId},funnel_page_id.is.null`)
      : q.is('funnel_page_id', null)
    const { data, error } = await q
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to read funnel history: ${error.message}`)
    return data
  }

  async findLatestApplied(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ) {
    return this.findLatestByStatus(supabase, { ...input, status: 'applied' })
  }

  async findLatestUndone(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ) {
    return this.findLatestByStatus(supabase, { ...input, status: 'undone' })
  }

  async createChangeSet(supabase: SupabaseClient, input: FunnelChangeSetInput) {
    const { data: changeSet, error } = await supabase
      .from('funnel_change_sets')
      .insert({
        funnel_id: input.funnelId,
        funnel_page_id: input.funnelPageId,
        user_id: input.userId,
        org_id: input.orgId,
        source: input.source,
        action: input.action,
        label: input.label ?? null,
        status: 'applied',
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create funnel history: ${error.message}`)

    const items = input.items.map((item) => ({
      change_set_id: (changeSet as { id: string }).id,
      funnel_id: input.funnelId,
      funnel_page_id: item.funnel_page_id ?? input.funnelPageId,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      path: item.path,
      operation: item.operation,
      before_snapshot: item.before_snapshot,
      after_snapshot: item.after_snapshot,
    }))
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('funnel_change_items').insert(items)
      if (itemsError) throw new Error(`Failed to create funnel history items: ${itemsError.message}`)
    }
    return changeSet
  }

  async listChangeItems(supabase: SupabaseClient, changeSetId: string) {
    const { data, error } = await supabase
      .from('funnel_change_items')
      .select('*')
      .eq('change_set_id', changeSetId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to read funnel history items: ${error.message}`)
    return data ?? []
  }

  async markChangeSetStatus(
    supabase: SupabaseClient,
    changeSetId: string,
    status: FunnelChangeStatus,
  ) {
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {
      status,
      updated_at: now,
      undone_at: status === 'undone' ? now : null,
      superseded_at: status === 'superseded' ? now : null,
    }
    const { error } = await supabase
      .from('funnel_change_sets')
      .update(updates)
      .eq('id', changeSetId)
    if (error) throw new Error(`Failed to update funnel history: ${error.message}`)
  }

  async supersedeRedo(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ) {
    let q = supabase
      .from('funnel_change_sets')
      .update({
        status: 'superseded',
        superseded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('funnel_id', input.funnelId)
      .eq('status', 'undone')
    q = input.funnelPageId
      ? q.or(`funnel_page_id.eq.${input.funnelPageId},funnel_page_id.is.null`)
      : q.is('funnel_page_id', null)
    const { error } = await q
    if (error) throw new Error(`Failed to supersede funnel redo history: ${error.message}`)
  }

  async restoreFileSnapshot(
    supabase: SupabaseClient,
    input: {
      funnelId: string
      funnelPageId: string | null
      path: string | null
      entityId: string | null
      snapshot: Record<string, unknown> | null
    },
  ) {
    if (!input.snapshot) {
      let q = supabase.from('funnel_files').delete().eq('funnel_id', input.funnelId)
      if (input.entityId) q = q.eq('id', input.entityId)
      if (input.path) q = q.eq('path', input.path)
      q = input.funnelPageId ? q.eq('funnel_page_id', input.funnelPageId) : q.is('funnel_page_id', null)
      const { error } = await q
      if (error) throw new Error(`Failed to restore deleted funnel file: ${error.message}`)
      return
    }

    const payload: Record<string, unknown> = {
      ...input.snapshot,
      updated_at: new Date().toISOString(),
    }
    if (payload.id) {
      const { error } = await supabase.from('funnel_files').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to restore funnel file: ${error.message}`)
      return
    }

    let existingQuery = supabase
      .from('funnel_files')
      .select('id')
      .eq('funnel_id', input.funnelId)
      .eq('path', String(payload.path ?? input.path ?? ''))
    existingQuery = input.funnelPageId
      ? existingQuery.eq('funnel_page_id', input.funnelPageId)
      : existingQuery.is('funnel_page_id', null)
    const { data: existing, error: existingError } = await existingQuery.maybeSingle()
    if (existingError) throw new Error(`Failed to read funnel file: ${existingError.message}`)
    if (existing) {
      const { error } = await supabase
        .from('funnel_files')
        .update(payload)
        .eq('id', (existing as { id: string }).id)
      if (error) throw new Error(`Failed to restore funnel file: ${error.message}`)
      return
    }
    const { error } = await supabase.from('funnel_files').insert(payload)
    if (error) throw new Error(`Failed to restore funnel file: ${error.message}`)
  }

  async touchPages(supabase: SupabaseClient, pageIds: string[]) {
    const uniquePageIds = Array.from(new Set(pageIds.filter(Boolean)))
    if (uniquePageIds.length === 0) return
    const { error } = await supabase
      .from('funnel_pages')
      .update({ updated_at: new Date().toISOString() })
      .in('id', uniquePageIds)
    if (error) throw new Error(`Failed to refresh funnel pages: ${error.message}`)
  }
}
