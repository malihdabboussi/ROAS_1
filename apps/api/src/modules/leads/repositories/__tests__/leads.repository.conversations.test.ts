import { describe, expect, it, vi } from 'vitest'
import { LeadsRepository } from '../leads.repository'

type Row = Record<string, any>

class Query {
  readonly eqCalls: Array<[string, unknown]> = []
  private selectArg = ''
  private filters: Array<(row: Row) => boolean> = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private foreignOrderBy: Record<string, { column: string; ascending: boolean }> = {}
  private foreignLimits: Record<string, number> = {}
  private rangeFrom = 0
  private rangeTo = Number.POSITIVE_INFINITY

  constructor(
    private readonly tableName: string,
    private readonly tables: Record<string, Row[]>,
  ) {}

  select(arg?: string) {
    this.selectArg = arg ?? ''
    return this
  }

  eq(column: string, value: unknown) {
    this.eqCalls.push([column, value])
    this.filters.push((row) => row[column] === value)
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  order(
    column: string,
    options?: { ascending?: boolean; referencedTable?: string; foreignTable?: string },
  ) {
    const foreignTable = options?.referencedTable ?? options?.foreignTable
    if (foreignTable) {
      this.foreignOrderBy[foreignTable] = { column, ascending: options?.ascending ?? true }
      return this
    }
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number, options?: { referencedTable?: string; foreignTable?: string }) {
    const foreignTable = options?.referencedTable ?? options?.foreignTable
    if (foreignTable) {
      this.foreignLimits[foreignTable] = count
      return this
    }
    this.rangeFrom = 0
    this.rangeTo = count - 1
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  async single() {
    const rows = this.execute()
    return { data: rows[0] ?? null, error: null }
  }

  async maybeSingle() {
    const rows = this.execute()
    return { data: rows[0] ?? null, error: null }
  }

  then(resolve: (value: { data: Row[]; error: null; count: number }) => unknown) {
    const rows = this.execute()
    return Promise.resolve(resolve({ data: rows, error: null, count: rows.length }))
  }

  private execute(): Row[] {
    let rows = (this.tables[this.tableName] ?? []).filter((row) =>
      this.filters.every((filter) => filter(row)),
    )
    if (this.orderBy) {
      rows = [...rows].sort((a, b) => {
        const av = a[this.orderBy!.column]
        const bv = b[this.orderBy!.column]
        if (av === bv) return 0
        return av > bv === this.orderBy!.ascending ? 1 : -1
      })
    }
    rows = rows.slice(this.rangeFrom, this.rangeTo + 1)
    // Minimal embed support: `messages(...)` on conversations attaches the
    // per-conversation message list with foreign-table order/limit applied
    // (mirrors PostgREST embedded resources — no org filter on children).
    if (this.tableName === 'conversations' && this.selectArg.includes('messages(')) {
      const order = this.foreignOrderBy.messages ?? { column: 'created_at', ascending: true }
      const limit = this.foreignLimits.messages ?? Number.POSITIVE_INFINITY
      rows = rows.map((row) => {
        const messages = (this.tables.messages ?? [])
          .filter((m) => m.conversation_id === row.id)
          .sort((a, b) => {
            const av = a[order.column]
            const bv = b[order.column]
            if (av === bv) return 0
            return av > bv === order.ascending ? 1 : -1
          })
          .slice(0, limit)
        return { ...row, messages }
      })
    }
    return rows
  }
}

function makeSupabase(tables: Record<string, Row[]>) {
  const queries: Record<string, Query[]> = {}
  const supabase = {
    from: vi.fn((tableName: string) => {
      const query = new Query(tableName, tables)
      queries[tableName] ??= []
      queries[tableName].push(query)
      return query
    }),
  }
  return { supabase, queries }
}

describe('LeadsRepository.findContactConversations', () => {
  it('returns previews for org-scoped contact conversations when legacy messages.org_id is null', async () => {
    const repository = new LeadsRepository()
    const { supabase, queries } = makeSupabase({
      contacts: [
        {
          id: 'contact-1',
          user_id: 'user-1',
          org_id: 'org-1',
          email: null,
          first_name: 'Brian',
          last_name: 'Bell',
          phone: null,
          contact_type: 'unknown',
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:00:00.000Z',
        },
      ],
      conversations: [
        {
          id: 'conversation-1',
          user_id: 'user-1',
          org_id: 'org-1',
          contact_id: 'contact-1',
          campaign_id: 'campaign-1',
          agent_id: 'zara',
          title: 'Brian Bell',
          status: 'active',
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:10:00.000Z',
          metadata: { source: 'telegram' },
        },
      ],
      messages: [
        {
          id: 'message-1',
          conversation_id: 'conversation-1',
          role: 'user',
          content: 'Legacy Telegram message',
          created_at: '2026-06-08T09:11:00.000Z',
          metadata: {},
          org_id: null,
        },
      ],
    })

    const result = await repository.findContactConversations(supabase as any, 'contact-1', 'org-1')

    expect(result.total).toBe(1)
    expect(result.linked[0]?.preview_messages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        content: 'Legacy Telegram message',
      }),
    ])
    // Previews come embedded in the conversations query — no standalone
    // messages query (and therefore no org filter dropping legacy rows).
    expect(queries.messages).toBeUndefined()
  })

  it('does not return cross-org conversations because conversation lookup is scoped by contact org', async () => {
    const repository = new LeadsRepository()
    const { supabase } = makeSupabase({
      contacts: [
        {
          id: 'contact-1',
          user_id: 'user-1',
          org_id: 'org-1',
          email: null,
          first_name: 'Brian',
          last_name: 'Bell',
          phone: null,
          contact_type: 'unknown',
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:00:00.000Z',
        },
      ],
      conversations: [
        {
          id: 'conversation-1',
          user_id: 'user-1',
          org_id: 'org-1',
          contact_id: 'contact-1',
          campaign_id: 'campaign-1',
          agent_id: 'zara',
          title: 'Org one',
          status: 'active',
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:10:00.000Z',
          metadata: { source: 'telegram' },
        },
        {
          id: 'conversation-2',
          user_id: 'user-1',
          org_id: 'org-2',
          contact_id: 'contact-1',
          campaign_id: 'campaign-2',
          agent_id: 'zara',
          title: 'Other org',
          status: 'active',
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:20:00.000Z',
          metadata: { source: 'telegram' },
        },
      ],
      messages: [
        {
          id: 'message-1',
          conversation_id: 'conversation-1',
          role: 'user',
          content: 'Org one message',
          created_at: '2026-06-08T09:11:00.000Z',
          metadata: {},
          org_id: null,
        },
        {
          id: 'message-2',
          conversation_id: 'conversation-2',
          role: 'user',
          content: 'Other org message',
          created_at: '2026-06-08T09:21:00.000Z',
          metadata: {},
          org_id: 'org-2',
        },
      ],
    })

    const result = await repository.findContactConversations(supabase as any, 'contact-1', 'org-1')

    expect(result.linked.map((conversation) => conversation.id)).toEqual(['conversation-1'])
    expect(result.linked[0]?.preview_messages.map((message) => message.id)).toEqual(['message-1'])
  })

  it('caps embedded previews at the per-conversation limit with newest first', async () => {
    const repository = new LeadsRepository()
    const messages = Array.from({ length: 6 }, (_, i) => ({
      id: `message-${i + 1}`,
      conversation_id: 'conversation-1',
      role: 'user',
      content: `Message ${i + 1}`,
      created_at: `2026-06-08T09:0${i + 1}:00.000Z`,
      metadata: {},
      org_id: null,
    }))
    const { supabase } = makeSupabase({
      contacts: [
        {
          id: 'contact-1',
          user_id: 'user-1',
          org_id: 'org-1',
          email: null,
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:00:00.000Z',
        },
      ],
      conversations: [
        {
          id: 'conversation-1',
          user_id: 'user-1',
          org_id: 'org-1',
          contact_id: 'contact-1',
          campaign_id: 'campaign-1',
          agent_id: 'zara',
          title: 'Brian Bell',
          status: 'active',
          created_at: '2026-06-08T09:00:00.000Z',
          updated_at: '2026-06-08T09:10:00.000Z',
          metadata: {},
        },
      ],
      messages,
    })

    const result = await repository.findContactConversations(supabase as any, 'contact-1', 'org-1')

    expect(result.linked[0]?.preview_messages.map((message) => message.id)).toEqual([
      'message-6',
      'message-5',
      'message-4',
    ])
  })
})
