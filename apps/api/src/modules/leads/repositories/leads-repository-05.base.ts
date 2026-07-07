import { LeadsRepositoryBase04 } from './leads-repository-04.base'
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

export abstract class LeadsRepositoryBase05 extends LeadsRepositoryBase04 {

  async importContactsBatch(
    supabase: SupabaseClient,
    userId: string,
    items: Array<{
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      contact_source: string | null
      contact_source_detail?: string | null
    }>,
    orgId?: string | null,
  ): Promise<{ imported: number; skipped: number; contact_ids: string[] }> {
    if (items.length === 0) return { imported: 0, skipped: 0, contact_ids: [] }

    const byEmail = new Map<
      string,
      {
        email: string
        first_name: string | null
        last_name: string | null
        phone: string | null
        contact_source: string | null
        contact_source_detail: string | null
      }
    >()
    for (const i of items) {
      const email = i.email.trim().toLowerCase()
      if (!email || byEmail.has(email)) continue
      byEmail.set(email, {
        email,
        first_name: i.first_name?.trim() || null,
        last_name: i.last_name?.trim() || null,
        phone: i.phone?.trim() || null,
        contact_source: i.contact_source ?? 'import',
        contact_source_detail: i.contact_source_detail ?? null,
      })
    }

    const unique = [...byEmail.values()]
    if (unique.length === 0) return { imported: 0, skipped: items.length, contact_ids: [] }

    const ownerKey = orgId ?? userId
    const emails = unique.map((u) => u.email)

    // Owner-scoped dedupe: a contact created by any member of the org counts as existing.
    let existingQuery = supabase.from('contacts').select('email').in('email', emails)
    existingQuery = orgId
      ? existingQuery.eq('org_id', orgId)
      : existingQuery.eq('user_id', userId).is('org_id', null)
    const { data: existing, error: exErr } = await existingQuery
    if (exErr) throw new Error(`DB error: ${exErr.message}`)

    const { data: existingIdentifiers, error: identErr } = await supabase
      .from('contact_identifiers')
      .select('value')
      .eq('owner_key', ownerKey)
      .eq('kind', 'email')
      .in('value', emails)
    if (identErr) throw new Error(`DB error: ${identErr.message}`)

    const existingSet = new Set([
      ...(existing ?? []).map((r: { email: string }) => r.email.toLowerCase()),
      ...(existingIdentifiers ?? []).map((r: { value: string }) => r.value.toLowerCase()),
    ])
    const toInsert = unique.filter((u) => !existingSet.has(u.email))
    const skipped = unique.length - toInsert.length

    if (toInsert.length === 0) return { imported: 0, skipped, contact_ids: [] }

    const rows = toInsert.map((n) => ({
      user_id: userId,
      email: n.email,
      first_name: n.first_name,
      last_name: n.last_name,
      phone: n.phone,
      source: 'import' as const,
      contact_source: n.contact_source,
      contact_source_detail: n.contact_source_detail,
      tags: [] as string[],
      org_id: orgId ?? null,
    }))

    const { data: inserted, error: insErr } = await supabase
      .from('contacts')
      .insert(rows)
      .select('id, email, phone')
    if (insErr) throw new Error(`DB error: ${insErr.message}`)
    const insertedRows = (inserted ?? []) as Array<{
      id: string
      email: string | null
      phone: string | null
    }>
    const contact_ids = insertedRows.map((r) => r.id)

    await this.insertContactIdentifierRows(
      supabase,
      ownerKey,
      insertedRows.map((r) => ({
        contact_id: r.id,
        email: r.email,
        phone: r.phone,
        source: 'import',
      })),
    )

    return { imported: toInsert.length, skipped, contact_ids }
  }

  async importContactsToCampaign(
    supabase: SupabaseClient,
    campaignId: string,
    contactIds: string[],
    orgId?: string | null,
  ) {
    if (contactIds.length === 0) return { imported: 0 }

    if (orgId !== undefined) {
      const { data: campaign, error: campaignErr } = await supabase
        .from('campaigns')
        .select('id, org_id')
        .eq('id', campaignId)
        .maybeSingle()
      if (campaignErr) throw new Error(`DB error: ${campaignErr.message}`)
      if (!campaign) return { imported: 0 }
      const cOrg = (campaign as { org_id?: string | null }).org_id ?? null
      if (orgId === null) {
        if (cOrg !== null) throw new Error('Campaign org mismatch')
      } else if (cOrg !== orgId) {
        throw new Error('Campaign org mismatch')
      }
    }

    let contactsQuery = supabase.from('contacts').select('id, user_id').in('id', contactIds)
    if (orgId !== undefined) {
      contactsQuery =
        orgId === null ? contactsQuery.is('org_id', null) : contactsQuery.eq('org_id', orgId)
    }
    const { data: contacts, error: contactsError } = await contactsQuery
    if (contactsError) throw new Error(`DB error: ${contactsError.message}`)
    if (!contacts || contacts.length === 0) return { imported: 0 }

    const rows = contacts.map((c: any) => ({
      user_id: c.user_id,
      contact_id: c.id,
      campaign_id: campaignId,
      last_seen_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('contact_campaign_memberships')
      .upsert(rows, { onConflict: 'contact_id,campaign_id' })
    if (upsertError) throw new Error(`DB error: ${upsertError.message}`)

    return { imported: contacts.length }
  }
}
