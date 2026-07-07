import { LeadsRepositoryBase02 } from './leads-repository-02.base'
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

export abstract class LeadsRepositoryBase03 extends LeadsRepositoryBase02 {

  async findContactById(supabase: SupabaseClient, contactId: string, orgId?: string | null) {
    let query = supabase.from('contacts').select('*').eq('id', contactId)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data, error } = await query.single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`DB error: ${error.message}`)
    }
    return data
  }

  async findContactEmailTimeline(
    supabase: SupabaseClient,
    contactId: string,
    orgId?: string | null,
    opts?: { limit?: number; offset?: number; includeBodies?: boolean },
  ) {
    // includeBodies=false returns html_body: null per send (summary mode) —
    // full bodies are loaded per email via findContactEmailById on expand.
    const includeBodies = opts?.includeBodies ?? true
    const contact = await this.findContactById(supabase, contactId, orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const contactRow = contact as {
      id: string
      user_id: string
      email: string | null
      org_id?: string | null
    }
    const email = (contactRow.email ?? '').trim().toLowerCase()
    if (!email) {
      return { contact: contactRow, emails: [], total: 0 }
    }

    const { data: leadRows, error: leadsErr } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('user_id', contactRow.user_id)
      .eq('email', email)
      .order('created_at', { ascending: false })
    if (leadsErr) throw new Error(`DB error: ${leadsErr.message}`)
    const leads = (leadRows ?? []) as Array<{ id: string; created_at: string }>
    const leadIds = leads.map((l) => l.id).filter(Boolean)
    if (leadIds.length === 0) {
      return { contact: contactRow, emails: [], total: 0 }
    }

    const limit = opts?.limit ?? 50
    const offset = opts?.offset ?? 0
    const sendColumns = [
      'id',
      'lead_id',
      'from_email',
      'subject',
      ...(includeBodies ? ['html_body'] : []),
      'status',
      'error_message',
      'sendgrid_message_id',
      'sent_at',
      'delivered_at',
      'opened_at',
      'clicked_at',
      'created_at',
      'updated_at',
    ]
    const {
      data: sendRows,
      error: sendsErr,
      count,
    } = await supabase
      .from('email_sends')
      .select(sendColumns.join(', '), { count: 'exact' })
      .in('lead_id', leadIds)
      .eq('user_id', contactRow.user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (sendsErr) throw new Error(`DB error: ${sendsErr.message}`)
    const sends = (sendRows ?? []) as unknown as Array<{
      id: string
      lead_id: string | null
      from_email: string
      subject: string | null
      html_body?: string | null
      status: string
      error_message: string | null
      sendgrid_message_id: string | null
      sent_at: string | null
      delivered_at: string | null
      opened_at: string | null
      clicked_at: string | null
      created_at: string
      updated_at: string | null
    }>
    const sendIds = sends.map((s) => s.id)
    const eventsBySendId = new Map<string, Array<Record<string, unknown>>>()
    if (sendIds.length > 0) {
      const { data: eventRows, error: eventsErr } = await supabase
        .from('email_events')
        .select(
          'id, email_send_id, event_type, event_data, timestamp, ip_address, user_agent, url, sg_event_id, created_at',
        )
        .in('email_send_id', sendIds)
        .order('timestamp', { ascending: true })
      if (eventsErr) throw new Error(`DB error: ${eventsErr.message}`)
      for (const ev of (eventRows ?? []) as Array<Record<string, unknown>>) {
        const emailSendId = String(ev.email_send_id ?? '')
        if (!emailSendId) continue
        const arr = eventsBySendId.get(emailSendId) ?? []
        arr.push(ev)
        eventsBySendId.set(emailSendId, arr)
      }
    }

    const leadCreatedAtById = new Map(leads.map((l) => [l.id, l.created_at]))
    const emails = sends.map((s) => ({
      ...s,
      html_body: includeBodies ? (s.html_body ?? null) : null,
      lead_created_at: s.lead_id ? (leadCreatedAtById.get(s.lead_id) ?? null) : null,
      events: eventsBySendId.get(s.id) ?? [],
    }))
    return { contact: contactRow, emails, total: count ?? emails.length }
  }

  /** Full single email (incl. html_body) — companion to the summary timeline. */
  async findContactEmailById(
    supabase: SupabaseClient,
    contactId: string,
    emailId: string,
    orgId?: string | null,
  ) {
    const contact = await this.findContactById(supabase, contactId, orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const contactRow = contact as { id: string; user_id: string }

    const { data: send, error: sendErr } = await supabase
      .from('email_sends')
      .select(
        'id, lead_id, from_email, subject, html_body, status, error_message, sendgrid_message_id, sent_at, delivered_at, opened_at, clicked_at, created_at, updated_at',
      )
      .eq('id', emailId)
      .eq('user_id', contactRow.user_id)
      .maybeSingle()
    if (sendErr) throw new Error(`DB error: ${sendErr.message}`)
    if (!send) throw new NotFoundException('Email not found')

    const { data: eventRows, error: eventsErr } = await supabase
      .from('email_events')
      .select(
        'id, email_send_id, event_type, event_data, timestamp, ip_address, user_agent, url, sg_event_id, created_at',
      )
      .eq('email_send_id', emailId)
      .order('timestamp', { ascending: true })
    if (eventsErr) throw new Error(`DB error: ${eventsErr.message}`)

    return { ...(send as Record<string, unknown>), events: eventRows ?? [] }
  }

  async findContactConversations(
    supabase: SupabaseClient,
    contactId: string,
    orgId?: string | null,
    opts?: { limit?: number; offset?: number },
  ) {
    const contact = await this.findContactById(supabase, contactId, orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const contactRow = contact as {
      id: string
      user_id: string
      email: string | null
    }
    const limit = opts?.limit ?? 50
    const offset = opts?.offset ?? 0

    let convQuery = supabase
      .from('conversations')
      .select(
        // Previews embedded with a per-conversation order/limit — fetches only
        // the last N messages per conversation instead of every message row.
        'id, user_id, campaign_id, title, agent_id, status, metadata, created_at, updated_at, summary, summary_updated_at, messages(id, conversation_id, role, content, created_at)',
        { count: 'exact' },
      )
      .eq('contact_id', contactId)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false, referencedTable: 'messages' })
      .limit(CONVERSATION_PREVIEW_MESSAGE_LIMIT, { referencedTable: 'messages' })
      .range(offset, offset + limit - 1)
    if (orgId !== undefined) {
      convQuery = orgId === null ? convQuery.is('org_id', null) : convQuery.eq('org_id', orgId)
    }

    const normalizedEmail = (contactRow.email ?? '').trim().toLowerCase()
    let suggestedPromise: PromiseLike<{ data: unknown; error: { message: string } | null }> | null =
      null
    if (normalizedEmail) {
      const escapedEmail = normalizedEmail.replace(/"/g, '\\"')
      let suggestedQuery = supabase
        .from('conversations')
        .select(
          'id, user_id, campaign_id, title, agent_id, status, metadata, created_at, updated_at, messages(id, conversation_id, role, content, created_at)',
        )
        .is('contact_id', null)
        .eq('user_id', contactRow.user_id)
        .or(
          `metadata->>visitor_email.eq."${escapedEmail}",metadata->>extracted_email.eq."${escapedEmail}"`,
        )
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false, referencedTable: 'messages' })
        .limit(CONVERSATION_PREVIEW_MESSAGE_LIMIT, { referencedTable: 'messages' })
        .limit(20)
      if (orgId !== undefined) {
        suggestedQuery =
          orgId === null ? suggestedQuery.is('org_id', null) : suggestedQuery.eq('org_id', orgId)
      }
      suggestedPromise = suggestedQuery
    }

    // Linked + suggested run in parallel (both depend only on the contact row).
    const [{ data: convRows, error: convErr, count }, suggestedResult] = await Promise.all([
      convQuery,
      suggestedPromise ?? Promise.resolve(null),
    ])
    if (convErr) throw new Error(`DB error: ${convErr.message}`)
    if (suggestedResult?.error) throw new Error(`DB error: ${suggestedResult.error.message}`)

    const linked = (convRows ?? []) as Array<Record<string, unknown>>
    const suggested = ((suggestedResult?.data ?? []) as Array<Record<string, unknown>>) ?? []

    const agentRegistryByKey = await this.loadAgentRegistryByKey(
      supabase,
      [
        ...linked.map((c) => String(c.agent_id ?? '')),
        ...suggested.map((c) => String(c.agent_id ?? '')),
      ],
      { userId: contactRow.user_id, orgId },
    )

    const toConversationWithPreviews = (c: Record<string, unknown>) => {
      const { messages, ...conversation } = c
      const agentMeta = agentRegistryByKey.get(String(c.agent_id ?? ''))
      return {
        ...conversation,
        channel: deriveConversationChannel(c.metadata),
        agent_name: agentMeta?.name ?? null,
        agent_image_url: agentMeta?.image_url ?? null,
        preview_messages: (messages as Array<Record<string, unknown>> | null) ?? [],
      }
    }

    return {
      linked: linked.map(toConversationWithPreviews),
      suggested: suggested.map(toConversationWithPreviews),
      total: count ?? linked.length,
    }
  }

  protected async loadAgentRegistryByKey(
    supabase: SupabaseClient,
    agentKeys: string[],
    scope?: { userId: string; orgId?: string | null },
  ): Promise<Map<string, { name: string | null; image_url: string | null }>> {
    const keys = [...new Set(agentKeys.filter(Boolean))]
    if (keys.length === 0) return new Map()
    let query = supabase
      .from('agents_registry')
      .select('agent_key, name, image_url')
      .in('agent_key', keys)
    if (scope?.userId) {
      if (scope.orgId) {
        query = query.eq('org_id', scope.orgId).is('user_id', null)
      } else {
        query = query.eq('user_id', scope.userId).is('org_id', null)
      }
    }
    const { data, error } = await query
    if (error) return new Map()
    const byKey = new Map<string, { name: string | null; image_url: string | null }>()
    for (const row of (data ?? []) as Array<{
      agent_key: string
      name: string | null
      image_url: string | null
    }>) {
      const meta = {
        name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : null,
        image_url:
          typeof row.image_url === 'string' && row.image_url.trim() ? row.image_url.trim() : null,
      }
      const existing = byKey.get(row.agent_key)
      if (!existing) {
        byKey.set(row.agent_key, meta)
        continue
      }
      byKey.set(row.agent_key, {
        name: existing.name ?? meta.name,
        image_url: existing.image_url ?? meta.image_url,
      })
    }
    return byKey
  }

  protected async loadAgentNames(
    supabase: SupabaseClient,
    agentKeys: string[],
    scope?: { userId: string; orgId?: string | null },
  ): Promise<Map<string, string>> {
    const registry = await this.loadAgentRegistryByKey(supabase, agentKeys, scope)
    return new Map(
      [...registry.entries()]
        .filter(([, meta]) => meta.name)
        .map(([key, meta]) => [key, meta.name as string]),
    )
  }
}
