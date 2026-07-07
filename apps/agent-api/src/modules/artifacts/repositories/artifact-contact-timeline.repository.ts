import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null; count?: number | null }

type ContactRow = {
  id: string
  user_id: string
  email: string | null
  created_at?: string | null
}

export type ContactTimelineInput = {
  contactId: string
  orgId: string
  limit: number
  offset: number
}

export type ContactCommunicationInput = ContactTimelineInput & {
  includeEmailBodies: boolean
  channel?: string | null
}

const ACTIVITY_SOURCE_LIMIT = 200
const CONVERSATION_PREVIEW_MESSAGE_LIMIT = 3

function deriveConversationChannel(metadata: unknown): 'widget' | 'telegram' | 'app' {
  const meta = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {}
  if (meta.telegram_chat_id || meta.source === 'telegram') return 'telegram'
  if (meta.public === true) return 'widget'
  return 'app'
}

@Injectable()
export class ArtifactContactTimelineRepository {
  async findContactActivity(
    supabase: SupabaseClient,
    input: ContactTimelineInput,
  ): Promise<{ contact: ContactRow | null; events: Array<Record<string, unknown>>; total: number }> {
    const contact = await this.findScopedContact(supabase, input.contactId, input.orgId)
    if (!contact) return { contact: null, events: [], total: 0 }

    const [notes, activity, funnels, campaigns, conversations, rollup] = await Promise.all([
      this.queryNotes(supabase, input),
      this.queryActivity(supabase, input),
      this.queryFunnelMemberships(supabase, input.contactId),
      this.queryCampaignMemberships(supabase, input.contactId),
      this.queryConversations(supabase, input),
      supabase.rpc('get_contact_conversation_message_rollup', { p_contact_id: input.contactId }),
    ])

    const events: Array<Record<string, unknown>> = [
      {
        id: `created_${input.contactId}`,
        event_type: 'contact_created',
        payload: {},
        created_at: contact.created_at ?? null,
      },
      ...funnels.map((row) => ({
        id: `fm_${row.id}`,
        event_type: 'funnel_submission',
        payload: {
          funnel_id: row.funnel_id ?? null,
          source_domain: row.last_source_domain ?? null,
          page_slug: row.last_page_slug ?? null,
        },
        created_at: row.first_seen_at ?? row.last_seen_at ?? null,
      })),
      ...campaigns.map((row) => ({
        id: `cm_${row.id}`,
        event_type: 'campaign_joined',
        payload: { campaign_id: row.campaign_id ?? null },
        created_at: row.first_seen_at ?? row.last_seen_at ?? null,
      })),
      ...notes.map((row) => ({
        id: `note_${row.id}`,
        event_type: 'note_added',
        payload: {
          content: row.content ?? null,
          card_tint: row.card_tint ?? null,
        },
        created_at: row.created_at ?? null,
        user_id: row.user_id ?? null,
      })),
      ...activity.map((row) => ({
        id: row.id,
        event_type: row.event_type,
        payload: row.payload ?? {},
        created_at: row.created_at,
        user_id: row.user_id ?? null,
      })),
      ...this.conversationActivityEvents(conversations, rollup?.data),
    ].filter((event) => typeof event.created_at === 'string')

    events.sort(
      (a, b) =>
        new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime(),
    )
    const total = events.length
    return {
      contact,
      events: events.slice(input.offset, input.offset + input.limit),
      total,
    }
  }

  async listContactCommunications(
    supabase: SupabaseClient,
    input: ContactCommunicationInput,
  ): Promise<{
    contact: ContactRow | null
    emails: Array<Record<string, unknown>>
    conversations: Array<Record<string, unknown>>
    suggested_conversations: Array<Record<string, unknown>>
    total: { emails: number; conversations: number; suggested_conversations: number }
  }> {
    const contact = await this.findScopedContact(supabase, input.contactId, input.orgId)
    if (!contact) {
      return {
        contact: null,
        emails: [],
        conversations: [],
        suggested_conversations: [],
        total: { emails: 0, conversations: 0, suggested_conversations: 0 },
      }
    }

    const wantsEmail = !input.channel || input.channel === 'email'
    const wantsConversations = !input.channel || input.channel !== 'email'
    const [emails, conversations] = await Promise.all([
      wantsEmail ? this.queryEmails(supabase, contact, input) : Promise.resolve({ rows: [], total: 0 }),
      wantsConversations
        ? this.queryConversationLists(supabase, contact, input)
        : Promise.resolve({ linked: [], suggested: [], total: 0 }),
    ])

    return {
      contact,
      emails: emails.rows,
      conversations: conversations.linked,
      suggested_conversations: conversations.suggested,
      total: {
        emails: emails.total,
        conversations: conversations.total,
        suggested_conversations: conversations.suggested.length,
      },
    }
  }

  private async findScopedContact(
    supabase: SupabaseClient,
    contactId: string,
    orgId: string,
  ): Promise<ContactRow | null> {
    const { data, error } = (await supabase
      .from('contacts')
      .select('id, user_id, email, created_at')
      .eq('id', contactId)
      .eq('org_id', orgId)
      .maybeSingle()) as QueryResult<ContactRow>
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? null
  }

  private async queryNotes(supabase: SupabaseClient, input: ContactTimelineInput) {
    const { data, error } = (await supabase
      .from('contact_notes')
      .select('id, content, user_id, created_at, card_tint')
      .eq('contact_id', input.contactId)
      .eq('org_id', input.orgId)
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  private async queryActivity(supabase: SupabaseClient, input: ContactTimelineInput) {
    const { data, error } = (await supabase
      .from('contact_activity')
      .select('id, user_id, event_type, payload, created_at')
      .eq('contact_id', input.contactId)
      .eq('org_id', input.orgId)
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  private async queryFunnelMemberships(supabase: SupabaseClient, contactId: string) {
    const { data, error } = (await supabase
      .from('contact_funnel_memberships')
      .select('id, funnel_id, last_source_domain, last_page_slug, first_seen_at, last_seen_at')
      .eq('contact_id', contactId)
      .order('first_seen_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  private async queryCampaignMemberships(supabase: SupabaseClient, contactId: string) {
    const { data, error } = (await supabase
      .from('contact_campaign_memberships')
      .select('id, campaign_id, first_seen_at, last_seen_at')
      .eq('contact_id', contactId)
      .order('first_seen_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  private async queryConversations(supabase: SupabaseClient, input: ContactTimelineInput) {
    const { data, error } = (await supabase
      .from('conversations')
      .select('id, title, agent_id, metadata, created_at')
      .eq('contact_id', input.contactId)
      .eq('org_id', input.orgId)
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_SOURCE_LIMIT)) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  private conversationActivityEvents(
    conversations: Array<Record<string, unknown>>,
    rollupData: unknown,
  ): Array<Record<string, unknown>> {
    const convById = new Map(conversations.map((conv) => [String(conv.id ?? ''), conv]))
    const started: Array<Record<string, unknown>> = conversations.map((conv) => ({
      id: `convstart_${String(conv.id ?? '')}`,
      event_type: 'conversation_started',
      payload: {
        conversation_id: conv.id ?? null,
        channel: deriveConversationChannel(conv.metadata),
        agent_id: conv.agent_id ?? null,
        title: conv.title ?? null,
      },
      created_at: conv.created_at ?? null,
    }))
    const rollups = Array.isArray(rollupData) ? rollupData : []
    const messageEvents: Array<Record<string, unknown>> = rollups
      .map((row) => (row && typeof row === 'object' ? (row as Record<string, unknown>) : null))
      .filter((row): row is Record<string, unknown> => !!row)
      .map((row): Record<string, unknown> | null => {
        const conv = convById.get(String(row.conversation_id ?? ''))
        if (!conv) return null
        return {
          id: `convmsg_${String(row.conversation_id)}_${String(row.day)}`,
          event_type: 'conversation_message_activity',
          payload: {
            conversation_id: row.conversation_id,
            channel: deriveConversationChannel(conv.metadata),
            agent_id: conv.agent_id ?? null,
            title: conv.title ?? null,
            day: row.day,
            message_count: Number(row.message_count ?? 0),
          },
          created_at: row.last_message_at ?? `${String(row.day)}T23:59:59.000Z`,
        }
      })
      .filter((event): event is Record<string, unknown> => !!event)
    return [
      ...started,
      ...messageEvents,
    ]
  }

  private async queryEmails(
    supabase: SupabaseClient,
    contact: ContactRow,
    input: ContactCommunicationInput,
  ) {
    const email = (contact.email ?? '').trim().toLowerCase()
    if (!email) return { rows: [], total: 0 }
    const { data: leads, error: leadsError } = (await supabase
      .from('leads')
      .select('id, created_at')
      .eq('user_id', contact.user_id)
      .eq('email', email)
      .order('created_at', { ascending: false })) as QueryListResult<Record<string, unknown>>
    if (leadsError) throw new Error(`DB error: ${leadsError.message}`)
    const leadIds = (leads ?? []).map((lead) => String(lead.id ?? '')).filter(Boolean)
    if (leadIds.length === 0) return { rows: [], total: 0 }

    const columns = [
      'id', 'lead_id', 'from_email', 'subject', ...(input.includeEmailBodies ? ['html_body'] : []),
      'status', 'error_message', 'sent_at', 'delivered_at', 'opened_at', 'clicked_at', 'created_at',
    ]
    const { data, error, count } = (await supabase
      .from('email_sends')
      .select(columns.join(', '), { count: 'exact' })
      .in('lead_id', leadIds)
      .eq('user_id', contact.user_id)
      .order('created_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1)) as QueryListResult<Record<string, unknown>>
    if (error) throw new Error(`DB error: ${error.message}`)
    return { rows: data ?? [], total: count ?? data?.length ?? 0 }
  }

  private async queryConversationLists(
    supabase: SupabaseClient,
    contact: ContactRow,
    input: ContactCommunicationInput,
  ) {
    const select =
      'id, user_id, campaign_id, title, agent_id, status, metadata, created_at, updated_at, summary, summary_updated_at, messages(id, conversation_id, role, content, created_at)'
    const linkedQuery = supabase
      .from('conversations')
      .select(select, { count: 'exact' })
      .eq('contact_id', input.contactId)
      .eq('org_id', input.orgId)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false, referencedTable: 'messages' })
      .limit(CONVERSATION_PREVIEW_MESSAGE_LIMIT, { referencedTable: 'messages' })
      .range(input.offset, input.offset + input.limit - 1)

    const email = (contact.email ?? '').trim().toLowerCase().replace(/"/g, '\\"')
    const suggestedQuery = email
      ? supabase
          .from('conversations')
          .select(select)
          .is('contact_id', null)
          .eq('user_id', contact.user_id)
          .eq('org_id', input.orgId)
          .or(`metadata->>visitor_email.eq."${email}",metadata->>extracted_email.eq."${email}"`)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false, referencedTable: 'messages' })
          .limit(CONVERSATION_PREVIEW_MESSAGE_LIMIT, { referencedTable: 'messages' })
          .limit(20)
      : Promise.resolve({ data: [], error: null })

    const [{ data, error, count }, suggested] = await Promise.all([linkedQuery, suggestedQuery])
    if (error) throw new Error(`DB error: ${error.message}`)
    if (suggested?.error) throw new Error(`DB error: ${suggested.error.message}`)

    const channel = input.channel && input.channel !== 'email' ? input.channel : null
    const mapConversation = (conversation: Record<string, unknown>) => {
      const { messages, ...rest } = conversation
      return {
        ...rest,
        channel: deriveConversationChannel(conversation.metadata),
        preview_messages: Array.isArray(messages) ? messages : [],
      }
    }
    const filterChannel = (conversation: Record<string, unknown>) =>
      !channel || deriveConversationChannel(conversation.metadata) === channel
    return {
      linked: ((data ?? []) as Array<Record<string, unknown>>).filter(filterChannel).map(mapConversation),
      suggested: ((suggested?.data ?? []) as Array<Record<string, unknown>>)
        .filter(filterChannel)
        .map(mapConversation),
      total: count ?? data?.length ?? 0,
    }
  }
}
