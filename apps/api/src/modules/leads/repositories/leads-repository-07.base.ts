import { LeadsRepositoryBase06 } from './leads-repository-06.base'
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

export abstract class LeadsRepositoryBase07 extends LeadsRepositoryBase06 {

  async updateContactNote(
    supabase: SupabaseClient,
    noteId: string,
    userId: string,
    orgId: string | null | undefined,
    updates: { content?: string; card_tint?: string | null },
    isOrgAdmin: boolean,
  ) {
    let query = supabase
      .from('contact_notes')
      .select('id, user_id, content, card_tint')
      .eq('id', noteId)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data: existing, error: findErr } = await query.maybeSingle()
    if (findErr) throw new Error(`DB error: ${findErr.message}`)
    if (!existing) throw new Error('Note not found')
    const row = existing as {
      id: string
      user_id: string
      content: string
      card_tint: string | null
    }
    if (row.user_id !== userId && !isOrgAdmin) {
      throw new Error('Only the note author or an org owner/admin can edit this note')
    }
    const patch: Record<string, unknown> = {}
    if (updates.content !== undefined) patch.content = updates.content
    if ('card_tint' in updates) patch.card_tint = updates.card_tint ?? null
    if (Object.keys(patch).length === 0)
      return { id: row.id, content: row.content, card_tint: row.card_tint }
    let updateQuery = supabase.from('contact_notes').update(patch).eq('id', noteId)
    if (orgId !== undefined) {
      updateQuery =
        orgId === null ? updateQuery.is('org_id', null) : updateQuery.eq('org_id', orgId)
    }
    const { data: updated, error: upErr } = await updateQuery
      .select('id, content, card_tint')
      .maybeSingle()
    if (upErr) throw new Error(`DB error: ${upErr.message}`)
    if (!updated) throw new Error('Note update failed — row not found or not permitted')
    return updated as { id: string; content: string; card_tint: string | null }
  }

  async createLeadSecure(
    supabase: SupabaseClient,
    data: {
      p_funnel_id: string
      p_email: string
      p_name?: string
      p_phone?: string
      p_page_slug?: string
      p_source_domain?: string
      p_utm?: Record<string, unknown>
      p_user_agent?: string
      p_ip?: string
      p_visitor_id?: string
    },
  ) {
    const { data: result, error } = await supabase.rpc('create_lead_secure', data)
    if (error) {
      // Handle duplicate email — upsert at app layer if RPC doesn't support ON CONFLICT yet
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('email', data.p_email)
          .single()
        if (existing) {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (data.p_name) updates.name = data.p_name
          if (data.p_phone) updates.phone = data.p_phone
          if (data.p_funnel_id) updates.funnel_id = data.p_funnel_id
          if (data.p_page_slug) updates.page_slug = data.p_page_slug
          if (data.p_source_domain) updates.source_domain = data.p_source_domain
          if (data.p_utm && Object.keys(data.p_utm).length > 0) updates.utm = data.p_utm
          if (data.p_visitor_id) updates.visitor_id = data.p_visitor_id
          await supabase.from('leads').update(updates).eq('id', existing.id)
          return existing.id
        }
      }
      throw new Error(`RPC error: ${error.message}`)
    }
    return result
  }
}
