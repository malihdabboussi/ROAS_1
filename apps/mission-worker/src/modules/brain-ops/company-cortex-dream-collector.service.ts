import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'
import type { CompanyDreamGroup } from './company-dream-signal-triage.service'

type CollectInput = {
  orgId: string
  brainId: string
  windowStart: string
  windowEnd: string
}

type SourceRow = Record<string, unknown>

@Injectable()
export class CompanyCortexDreamCollectorService {
  constructor(private readonly database: DatabaseService) {}

  async collect(input: CollectInput): Promise<{
    groups: CompanyDreamGroup[]
    sourceCounts: Record<string, number>
  }> {
    const client = this.database.getClient()
    const [messages, channelMessages, activity, deliverables, documents] = await Promise.all([
      client
        .from('messages')
        .select(
          'id, conversation_id, role, content, content_blocks, metadata, created_at, conversations!inner(id, title, agent_id, org_id)',
        )
        .eq('conversations.org_id', input.orgId)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: true }),
      client
        .from('channel_messages')
        .select(
          'id, channel_id, reply_to_id, sender_type, sender_id, content, content_blocks, metadata, created_at, channels!inner(id, name, org_id)',
        )
        .eq('channels.org_id', input.orgId)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: true }),
      client
        .from('space_item_activity')
        .select('id, item_id, space_id, event_type, payload, actor_kind, created_at')
        .eq('org_id', input.orgId)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: true }),
      client
        .from('space_item_deliverables')
        .select('id, item_id, space_id, agent_key, type, title, content, metadata, created_at')
        .eq('org_id', input.orgId)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: true }),
      client
        .from('conversation_documents')
        .select(
          'id, conversation_id, document_type, title, content, metadata, created_at, conversations!inner(id, title, org_id)',
        )
        .eq('conversations.org_id', input.orgId)
        .gte('created_at', input.windowStart)
        .lt('created_at', input.windowEnd)
        .order('created_at', { ascending: true }),
    ])

    const messageRows = this.rows(messages)
    const channelRows = this.rows(channelMessages)
    const activityRows = this.rows(activity)
    const deliverableRows = this.rows(deliverables)
    const documentRows = this.rows(documents)

    return {
      groups: [
        ...this.groupMessages(messageRows),
        ...this.groupChannelMessages(channelRows),
        ...this.groupSpaceActivity(activityRows),
        ...this.groupDeliverables(deliverableRows),
        ...this.groupConversationDocuments(documentRows),
      ],
      sourceCounts: {
        messages: messageRows.length,
        channel_messages: channelRows.length,
        space_item_activity: activityRows.length,
        space_item_deliverables: deliverableRows.length,
        conversation_documents: documentRows.length,
      },
    }
  }

  private rows(result: unknown): SourceRow[] {
    const data = (result as { data?: unknown[] | null; error?: { message?: string } | null })?.data
    const error = (result as { error?: { message?: string } | null })?.error
    if (error) throw new Error(error.message ?? 'Company Cortex dream source query failed')
    return Array.isArray(data) ? (data as SourceRow[]) : []
  }

  private groupMessages(rows: SourceRow[]): CompanyDreamGroup[] {
    const grouped = this.groupBy(rows, 'conversation_id')
    return [...grouped.entries()].map(([conversationId, items]) => ({
      id: `conversation:${conversationId}`,
      source: 'conversation' as const,
      turns: items.map((row) => ({
        role: this.toConversationRole(String(row.role ?? 'system')),
        text: this.contentText(row),
      })),
      metadata: { conversation_id: conversationId },
    }))
  }

  private groupChannelMessages(rows: SourceRow[]): CompanyDreamGroup[] {
    const grouped = new Map<string, SourceRow[]>()
    for (const row of rows) {
      const channelId = String(row.channel_id ?? 'unknown')
      const threadId = String(row.reply_to_id ?? row.id ?? 'unknown')
      const key = `${channelId}:${threadId}`
      grouped.set(key, [...(grouped.get(key) ?? []), row])
    }
    return [...grouped.entries()].map(([key, items]) => ({
      id: `channel_thread:${key}`,
      source: 'channel_thread' as const,
      turns: items.map((row) => ({
        role:
          row.sender_type === 'agent'
            ? ('agent' as const)
            : row.sender_type === 'system'
              ? 'system'
              : 'user',
        text: this.contentText(row),
      })),
      metadata: { thread_key: key },
    }))
  }

  private groupSpaceActivity(rows: SourceRow[]): CompanyDreamGroup[] {
    const grouped = this.groupBy(rows, 'item_id')
    return [...grouped.entries()].map(([itemId, items]) => ({
      id: `space_item:${itemId}`,
      source: 'space_activity' as const,
      turns: items.map((row) => ({
        role:
          row.actor_kind === 'agent'
            ? ('agent' as const)
            : row.actor_kind === 'system'
              ? 'system'
              : 'user',
        text: `${String(row.event_type ?? 'activity')}: ${this.payloadText(row.payload)}`,
      })),
      metadata: { item_id: itemId },
    }))
  }

  private groupDeliverables(rows: SourceRow[]): CompanyDreamGroup[] {
    return rows.map((row) => ({
      id: `deliverable:${String(row.id ?? 'unknown')}`,
      source: 'deliverable' as const,
      turns: [
        {
          role: 'agent' as const,
          text: [row.title, row.content].filter((value) => typeof value === 'string').join('\n'),
        },
      ],
      metadata: { item_id: row.item_id ?? null, agent_key: row.agent_key ?? null },
    }))
  }

  private groupConversationDocuments(rows: SourceRow[]): CompanyDreamGroup[] {
    return rows.map((row) => ({
      id: `conversation_document:${String(row.id ?? 'unknown')}`,
      source: 'conversation_document' as const,
      turns: [
        {
          role: 'assistant' as const,
          text: [row.title, this.payloadText(row.content)].filter(Boolean).join('\n'),
        },
      ],
      metadata: {
        conversation_id: row.conversation_id ?? null,
        document_type: row.document_type ?? null,
      },
    }))
  }

  private groupBy(rows: SourceRow[], key: string): Map<string, SourceRow[]> {
    const grouped = new Map<string, SourceRow[]>()
    for (const row of rows) {
      const value = String(row[key] ?? 'unknown')
      grouped.set(value, [...(grouped.get(value) ?? []), row])
    }
    return grouped
  }

  private toConversationRole(role: string): 'user' | 'assistant' | 'system' | 'tool' {
    if (role === 'user' || role === 'assistant' || role === 'tool') return role
    return 'system'
  }

  private contentText(row: SourceRow): string {
    if (typeof row.content === 'string') return row.content
    return this.payloadText(row.content_blocks ?? row.metadata ?? {})
  }

  private payloadText(value: unknown): string {
    if (typeof value === 'string') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
}
