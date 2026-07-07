import { LeadsRepositoryBase05 } from './leads-repository-05.base'
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

export abstract class LeadsRepositoryBase06 extends LeadsRepositoryBase05 {

  async findContactActivity(supabase: SupabaseClient, contactId: string, orgId?: string | null) {
    const events: Array<{
      id: string
      event_type: string
      payload: Record<string, unknown>
      created_at: string
      user_id?: string | null
    }> = []

    // Sources are independent — run them in parallel and bound each to the
    // most recent ACTIVITY_SOURCE_LIMIT rows (desc + limit; final merge sorts
    // ascending) instead of 8 sequential unbounded queries.
    let notesQuery = supabase
      .from('contact_notes')
      .select('id, content, user_id, created_at, card_tint')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)
    if (orgId !== undefined) {
      notesQuery = orgId === null ? notesQuery.is('org_id', null) : notesQuery.eq('org_id', orgId)
    }

    let activityQuery = supabase
      .from('contact_activity')
      .select('id, user_id, event_type, payload, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)
    if (orgId !== undefined) {
      activityQuery =
        orgId === null ? activityQuery.is('org_id', null) : activityQuery.eq('org_id', orgId)
    }

    let contactQuery = supabase.from('contacts').select('created_at, user_id').eq('id', contactId)
    if (orgId !== undefined) {
      contactQuery =
        orgId === null ? contactQuery.is('org_id', null) : contactQuery.eq('org_id', orgId)
    }

    let conversationsQuery = supabase
      .from('conversations')
      .select('id, title, agent_id, metadata, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)
    if (orgId !== undefined) {
      conversationsQuery =
        orgId === null
          ? conversationsQuery.is('org_id', null)
          : conversationsQuery.eq('org_id', orgId)
    }

    const [
      { data: funnelMemberships, error: fmErr },
      { data: campaignMemberships, error: cmErr },
      { data: notes, error: notesErr },
      { data: contactActivityRows, error: caErr },
      { data: contact },
      { data: conversationRows },
      rollupResult,
    ] = await Promise.all([
      // Funnel membership events (avoid broken embed / wrong column: funnels use `name`, not `title`)
      supabase
        .from('contact_funnel_memberships')
        .select('id, funnel_id, last_source_domain, last_page_slug, first_seen_at, last_seen_at')
        .eq('contact_id', contactId)
        .order('first_seen_at', { ascending: false })
        .limit(ACTIVITY_SOURCE_LIMIT),
      // Campaign membership events (campaigns use `name`, not `title`)
      supabase
        .from('contact_campaign_memberships')
        .select('id, campaign_id, first_seen_at, last_seen_at')
        .eq('contact_id', contactId)
        .order('first_seen_at', { ascending: false })
        .limit(ACTIVITY_SOURCE_LIMIT),
      notesQuery,
      activityQuery,
      contactQuery.single(),
      conversationsQuery,
      // Channel engagement is derived at read time (no per-message writes).
      supabase.rpc('get_contact_conversation_message_rollup', { p_contact_id: contactId }),
    ])

    const fmRows = !fmErr && funnelMemberships ? (funnelMemberships as any[]) : []
    const cmRows = !cmErr && campaignMemberships ? (campaignMemberships as any[]) : []
    const noteRows = !notesErr && notes ? (notes as any[]) : []

    // Title/profile lookups depend on round one — also parallel.
    const funnelIds = [...new Set(fmRows.map((r) => r.funnel_id).filter(Boolean))]
    const campaignIds = [...new Set(cmRows.map((r) => r.campaign_id).filter(Boolean))]
    const authorIds = [
      ...new Set(noteRows.map((r) => r.user_id).filter((id: string | null) => Boolean(id))),
    ] as string[]

    const [funnelTitlesResult, campaignTitlesResult, profilesResult] = await Promise.all([
      funnelIds.length > 0
        ? supabase.from('funnels').select('id, name').in('id', funnelIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
      campaignIds.length > 0
        ? supabase.from('campaigns').select('id, name').in('id', campaignIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
      authorIds.length > 0
        ? supabase.from('profiles').select('id, avatar_url, full_name').in('id', authorIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; avatar_url: string | null; full_name: string | null }>,
          }),
    ])

    const funnelTitleById: Record<string, string | null> = {}
    for (const f of (funnelTitlesResult.data ?? []) as { id: string; name: string | null }[]) {
      funnelTitleById[f.id] = f.name ?? null
    }
    for (const row of fmRows) {
      events.push({
        id: `fm_${row.id}`,
        event_type: 'funnel_submission',
        payload: {
          funnel_id: row.funnel_id,
          funnel_title: funnelTitleById[row.funnel_id] ?? null,
          source_domain: row.last_source_domain ?? null,
          page_slug: row.last_page_slug ?? null,
        },
        created_at: row.first_seen_at ?? row.last_seen_at ?? new Date().toISOString(),
      })
    }

    const campaignTitleById: Record<string, string | null> = {}
    for (const c of (campaignTitlesResult.data ?? []) as { id: string; name: string | null }[]) {
      campaignTitleById[c.id] = c.name ?? null
    }
    for (const row of cmRows) {
      events.push({
        id: `cm_${row.id}`,
        event_type: 'campaign_joined',
        payload: {
          campaign_id: row.campaign_id,
          campaign_title: campaignTitleById[row.campaign_id] ?? null,
        },
        created_at: row.first_seen_at ?? row.last_seen_at ?? new Date().toISOString(),
      })
    }

    const avatarByUserId: Record<string, string | null> = {}
    const nameByUserId: Record<string, string | null> = {}
    for (const p of (profilesResult.data ?? []) as {
      id: string
      avatar_url: string | null
      full_name: string | null
    }[]) {
      avatarByUserId[p.id] = p.avatar_url ?? null
      nameByUserId[p.id] = p.full_name && p.full_name.trim().length > 0 ? p.full_name.trim() : null
    }
    for (const row of noteRows) {
      const uid = row.user_id as string | null
      events.push({
        id: `note_${row.id}`,
        event_type: 'note_added',
        payload: {
          content: row.content,
          card_tint: (row as { card_tint?: string | null }).card_tint ?? null,
          avatar_url: uid ? (avatarByUserId[uid] ?? null) : null,
          display_name: uid ? (nameByUserId[uid] ?? null) : null,
        },
        created_at: row.created_at,
        user_id: uid,
      })
    }

    if (!caErr && contactActivityRows) {
      for (const row of contactActivityRows as any[]) {
        events.push({
          id: row.id as string,
          event_type: row.event_type as string,
          payload: (row.payload as Record<string, unknown>) ?? {},
          created_at: row.created_at as string,
          user_id: row.user_id as string | null,
        })
      }
    }

    // Conversation events (started + per-day message rollups), derived at read time
    const convRows = (conversationRows ?? []) as Array<{
      id: string
      title: string | null
      agent_id: string | null
      metadata: unknown
      created_at: string
    }>
    if (convRows.length > 0) {
      const contactUserId =
        contact && typeof (contact as { user_id?: unknown }).user_id === 'string'
          ? (contact as { user_id: string }).user_id
          : ''
      const agentNameByKey = await this.loadAgentNames(
        supabase,
        convRows.map((c) => String(c.agent_id ?? '')),
        contactUserId ? { userId: contactUserId, orgId } : undefined,
      )
      const convById = new Map(convRows.map((c) => [c.id, c]))

      for (const conv of convRows) {
        events.push({
          id: `convstart_${conv.id}`,
          event_type: 'conversation_started',
          payload: {
            conversation_id: conv.id,
            channel: deriveConversationChannel(conv.metadata),
            agent_name: agentNameByKey.get(String(conv.agent_id ?? '')) ?? null,
            title: conv.title ?? null,
          },
          created_at: conv.created_at,
        })
      }

      const rollupRows =
        rollupResult && !rollupResult.error && Array.isArray(rollupResult.data)
          ? (rollupResult.data as Array<{
              conversation_id: string
              day: string
              message_count: number
              last_message_at: string | null
            }>)
          : []
      for (const row of rollupRows) {
        const conv = convById.get(row.conversation_id)
        if (!conv) continue
        events.push({
          id: `convmsg_${row.conversation_id}_${row.day}`,
          event_type: 'conversation_message_activity',
          payload: {
            conversation_id: row.conversation_id,
            channel: deriveConversationChannel(conv.metadata),
            agent_name: agentNameByKey.get(String(conv.agent_id ?? '')) ?? null,
            title: conv.title ?? null,
            day: row.day,
            message_count: Number(row.message_count ?? 0),
          },
          created_at: row.last_message_at ?? `${row.day}T23:59:59.000Z`,
        })
      }
    }

    // Contact creation event
    if (contact) {
      events.push({
        id: `created_${contactId}`,
        event_type: 'contact_created',
        payload: {},
        created_at: (contact as any).created_at,
      })
    }

    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return { events }
  }

  async createContactNote(
    supabase: SupabaseClient,
    contactId: string,
    userId: string,
    content: string,
    orgId?: string | null,
    cardTint?: string | null,
  ) {
    const { data, error } = await supabase
      .from('contact_notes')
      .insert({
        contact_id: contactId,
        user_id: userId,
        org_id: orgId ?? null,
        content,
        card_tint: cardTint ?? null,
      })
      .select('id, content, created_at, user_id, card_tint')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    let avatarUrl: string | null = null
    let displayName: string | null = null
    const { data: prof } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', userId)
      .maybeSingle()
    if (prof) {
      const p = prof as { avatar_url: string | null; full_name: string | null }
      avatarUrl = p.avatar_url ?? null
      displayName = p.full_name && p.full_name.trim().length > 0 ? p.full_name.trim() : null
    }
    const row = data as {
      id: string
      content: string
      created_at: string
      user_id: string
      card_tint?: string | null
    }
    return {
      id: `note_${row.id}`,
      event_type: 'note_added' as const,
      payload: {
        content: row.content,
        card_tint: row.card_tint ?? null,
        avatar_url: avatarUrl,
        display_name: displayName,
      },
      created_at: row.created_at,
      user_id: row.user_id,
    }
  }
}
