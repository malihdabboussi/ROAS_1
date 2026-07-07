import { describe, expect, it, vi } from 'vitest'

type InsertCall = { table: string; payload: Record<string, unknown> }
type UpdateCall = {
  table: string
  payload: Record<string, unknown>
  filters: Record<string, unknown>
}

type ClientFixtures = {
  conversations?: Array<Record<string, unknown>>
  messagesByConversation?: Record<string, Array<Record<string, unknown>>>
  brains?: Array<Record<string, unknown>>
  existingDedupeKeys?: Set<string>
}

type ClientCalls = { inserts: InsertCall[]; updates: UpdateCall[] }

function makeClient(fixtures: ClientFixtures, calls: ClientCalls) {
  const makeChain = (table: string) => {
    const filters: Record<string, unknown> = {}
    let updatePayload: Record<string, unknown> | null = null
    const chain: Record<string, any> = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      in: () => chain,
      is: () => chain,
      not: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      or: () => chain,
      eq(column: string, value: unknown) {
        filters[column] = value
        return chain
      },
      insert(payload: Record<string, unknown>) {
        calls.inserts.push({ table, payload })
        return chain
      },
      update(payload: Record<string, unknown>) {
        updatePayload = payload
        return {
          ...chain,
          eq(column: string, value: unknown) {
            filters[column] = value
            calls.updates.push({ table, payload: updatePayload!, filters: { ...filters } })
            return chain
          },
        }
      },
      async maybeSingle() {
        if (table === 'brain_ops_outbox') {
          const key = filters['dedupe_key'] as string | undefined
          if (key && fixtures.existingDedupeKeys?.has(key)) {
            return { data: { id: 'existing-outbox' }, error: null }
          }
          return { data: null, error: null }
        }
        return { data: null, error: null }
      },
      async single() {
        return { data: { id: 'inserted-row' }, error: null }
      },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        let data: unknown[] = []
        if (table === 'conversations') data = fixtures.conversations ?? []
        if (table === 'messages') {
          const convId = filters['conversation_id'] as string | undefined
          data = convId ? (fixtures.messagesByConversation?.[convId] ?? []) : []
        }
        if (table === 'ns_brains') data = fixtures.brains ?? []
        return Promise.resolve({ data, error: null }).then(resolve)
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

async function loadSweeper() {
  const mod = await import('./customer-signal-sweeper.service')
  expect(mod.CustomerSignalSweeperService).toBeTypeOf('function')
  return mod.CustomerSignalSweeperService as new (
    configService: { get(key: string): unknown },
    databaseService: { getClient(): unknown; hasPgPool(): boolean },
  ) => any
}

function makeSweeper(fixtures: ClientFixtures, calls: ClientCalls, Sweeper: any) {
  const config = {
    get: (key: string) =>
      (
        ({
          'brainOps.customerSignalSweepMs': 0,
          'brainOps.customerSignalFlushTokens': 50_000,
          'brainOps.customerSignalGraceMinutes': 30,
        }) as Record<string, unknown>
      )[key],
  }
  const database = {
    getClient: () => makeClient(fixtures, calls),
    hasPgPool: () => false,
  }
  return new Sweeper(config, database)
}

const HOURS = 60 * 60 * 1000
const oldIso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOURS).toISOString()

const telegramConv = (id: string) => ({
  id,
  user_id: 'owner-1',
  org_id: 'org-1',
  title: 'Telegram Chat',
  metadata: { telegram_chat_id: `tg-${id}`, source: 'telegram' },
  contact_id: null,
  last_extracted_message_at: null,
})

const widgetConv = (id: string, metadata: Record<string, unknown>) => ({
  id,
  user_id: 'owner-1',
  org_id: 'org-1',
  title: 'Widget Chat',
  metadata: { public: true, visitor_id: `vis-${id}`, ...metadata },
  contact_id: null,
  last_extracted_message_at: null,
})

const messages = (prefix: string, hoursAgo: number) => [
  {
    id: `${prefix}-m1`,
    role: 'user',
    content: 'I want to scale my business',
    created_at: oldIso(hoursAgo),
  },
  {
    id: `${prefix}-m2`,
    role: 'assistant',
    content: 'What is your budget?',
    created_at: oldIso(hoursAgo - 0.1),
  },
  {
    id: `${prefix}-m3`,
    role: 'user',
    content: 'Around 2k per month',
    created_at: oldIso(hoursAgo - 0.2),
  },
]

const enabledBrains = [
  { id: 'brain-1', owner_id: 'owner-1', org_id: 'org-1' },
  { id: 'brain-2', owner_id: 'owner-1', org_id: 'org-1' },
]

describe('CustomerSignalSweeperService.shouldFlushScope', () => {
  it('does not flush below the token threshold within the same UTC day', async () => {
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper({}, { inserts: [], updates: [] }, Sweeper)
    const now = Date.parse('2026-06-11T10:00:00.000Z')

    expect(
      sweeper.shouldFlushScope(
        { estTokens: 1_000, oldestUnprocessedAt: '2026-06-11T08:00:00.000Z' },
        now,
      ),
    ).toBe(false)
  })

  it('flushes when accumulated tokens reach the threshold', async () => {
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper({}, { inserts: [], updates: [] }, Sweeper)
    const now = Date.parse('2026-06-11T10:00:00.000Z')

    expect(
      sweeper.shouldFlushScope(
        { estTokens: 50_000, oldestUnprocessedAt: '2026-06-11T08:00:00.000Z' },
        now,
      ),
    ).toBe(true)
  })

  it('flushes leftovers from a previous UTC day regardless of token count (daily gate)', async () => {
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper({}, { inserts: [], updates: [] }, Sweeper)
    const now = Date.parse('2026-06-11T00:05:00.000Z')

    expect(
      sweeper.shouldFlushScope(
        { estTokens: 120, oldestUnprocessedAt: '2026-06-10T23:00:00.000Z' },
        now,
      ),
    ).toBe(true)
  })

  it('never flushes a scope with nothing unprocessed', async () => {
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper({}, { inserts: [], updates: [] }, Sweeper)
    expect(sweeper.shouldFlushScope({ estTokens: 0, oldestUnprocessedAt: null }, Date.now())).toBe(
      false,
    )
  })
})

describe('CustomerSignalSweeperService.flushScope', () => {
  it('emits one envelope per conversation per enabled customer brain and advances cursors', async () => {
    const calls: ClientCalls = { inserts: [], updates: [] }
    const fixtures: ClientFixtures = {
      conversations: [
        telegramConv('conv-a'),
        widgetConv('conv-b', { visitor_email: 'lead@example.com' }),
      ],
      messagesByConversation: {
        'conv-a': messages('a', 5),
        'conv-b': messages('b', 5),
      },
      brains: enabledBrains,
    }
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper(fixtures, calls, Sweeper)

    await sweeper.flushScope({ orgId: 'org-1', userId: 'owner-1' })

    const outboxInserts = calls.inserts.filter((c) => c.table === 'brain_ops_outbox')
    expect(outboxInserts).toHaveLength(4)

    for (const insert of outboxInserts) {
      expect(insert.payload.event_type).toBe('customer_interaction_route')
      expect(insert.payload.user_id).toBe('owner-1')
      expect(insert.payload.org_id).toBe('org-1')
      const payload = insert.payload.payload as { envelope?: { v?: number; channel?: string } }
      expect(payload?.envelope?.v).toBe(1)
    }

    const dedupeKeys = outboxInserts.map((c) => c.payload.dedupe_key)
    expect(dedupeKeys).toEqual(
      expect.arrayContaining([
        'interaction-brain-1-conv-a-a-m3',
        'interaction-brain-2-conv-a-a-m3',
        'interaction-brain-1-conv-b-b-m3',
        'interaction-brain-2-conv-b-b-m3',
      ]),
    )

    const channels = outboxInserts.map(
      (c) => (c.payload.payload as { envelope: { channel: string } }).envelope.channel,
    )
    expect(channels.filter((c) => c === 'telegram')).toHaveLength(2)
    expect(channels.filter((c) => c === 'widget')).toHaveLength(2)

    const cursorUpdates = calls.updates.filter((c) => c.table === 'conversations')
    expect(cursorUpdates).toHaveLength(2)
    const cursorByConv = Object.fromEntries(cursorUpdates.map((u) => [u.filters.id, u.payload]))
    expect(cursorByConv['conv-a']).toMatchObject({ last_extracted_message_id: 'a-m3' })
    expect(cursorByConv['conv-b']).toMatchObject({ last_extracted_message_id: 'b-m3' })
    expect(cursorByConv['conv-a'].last_extracted_message_at).toBeTruthy()
  })

  it('skips conversations with recent activity (grace window) without advancing their cursor', async () => {
    const calls: ClientCalls = { inserts: [], updates: [] }
    const fixtures: ClientFixtures = {
      conversations: [telegramConv('conv-old'), telegramConv('conv-live')],
      messagesByConversation: {
        'conv-old': messages('old', 5),
        'conv-live': messages('live', 0.1), // newest message ~6 minutes ago, inside 30m grace
      },
      brains: [enabledBrains[0]],
    }
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper(fixtures, calls, Sweeper)

    await sweeper.flushScope({ orgId: 'org-1', userId: 'owner-1' })

    const outboxInserts = calls.inserts.filter((c) => c.table === 'brain_ops_outbox')
    expect(outboxInserts).toHaveLength(1)
    expect(outboxInserts[0].payload.dedupe_key).toBe('interaction-brain-1-conv-old-old-m3')

    const cursorUpdates = calls.updates.filter((c) => c.table === 'conversations')
    expect(cursorUpdates).toHaveLength(1)
    expect(cursorUpdates[0].filters.id).toBe('conv-old')
  })

  it('enqueues anonymous widget conversations with a source identity', async () => {
    const calls: ClientCalls = { inserts: [], updates: [] }
    const fixtures: ClientFixtures = {
      conversations: [widgetConv('conv-anon', {})],
      messagesByConversation: { 'conv-anon': messages('anon', 5) },
      brains: [enabledBrains[0]],
    }
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper(fixtures, calls, Sweeper)

    await sweeper.flushScope({ orgId: 'org-1', userId: 'owner-1' })

    const outboxInserts = calls.inserts.filter((c) => c.table === 'brain_ops_outbox')
    expect(outboxInserts).toHaveLength(1)
    const payload = outboxInserts[0].payload.payload as {
      envelope: { participants: Array<{ identifiers: Array<{ kind: string; value: string }> }> }
    }
    expect(payload.envelope.participants[0].identifiers).toEqual([
      { kind: 'visitor_id', value: 'vis-conv-anon' },
    ])
    expect(calls.updates.filter((c) => c.table === 'conversations')).toHaveLength(1)
  })

  it('tolerates dedupe collisions and still advances the cursor (idempotent re-run)', async () => {
    const calls: ClientCalls = { inserts: [], updates: [] }
    const fixtures: ClientFixtures = {
      conversations: [telegramConv('conv-a')],
      messagesByConversation: { 'conv-a': messages('a', 5) },
      brains: [enabledBrains[0]],
      existingDedupeKeys: new Set(['interaction-brain-1-conv-a-a-m3']),
    }
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper(fixtures, calls, Sweeper)

    await sweeper.flushScope({ orgId: 'org-1', userId: 'owner-1' })

    expect(calls.inserts.filter((c) => c.table === 'brain_ops_outbox')).toHaveLength(0)
    const cursorUpdates = calls.updates.filter((c) => c.table === 'conversations')
    expect(cursorUpdates).toHaveLength(1)
    expect(cursorUpdates[0].filters.id).toBe('conv-a')
  })

  it('leaves conversations untouched when the scope has no enabled customer brain', async () => {
    const calls: ClientCalls = { inserts: [], updates: [] }
    const fixtures: ClientFixtures = {
      conversations: [telegramConv('conv-a')],
      messagesByConversation: { 'conv-a': messages('a', 5) },
      brains: [],
    }
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper(fixtures, calls, Sweeper)

    await sweeper.flushScope({ orgId: 'org-1', userId: 'owner-1' })

    expect(calls.inserts.filter((c) => c.table === 'brain_ops_outbox')).toHaveLength(0)
    expect(calls.updates.filter((c) => c.table === 'conversations')).toHaveLength(0)
  })
})

describe('CustomerSignalSweeperService.listCandidateScopes', () => {
  it('includes public widget conversations without requiring visitor email in the PG scan', async () => {
    const Sweeper = await loadSweeper()
    const pgQuery = vi.fn().mockResolvedValue({
      rows: [
        {
          org_id: 'org-1',
          user_id: 'owner-1',
          est_tokens: '120',
          oldest_unprocessed_at: '2026-06-10T10:00:00.000Z',
        },
      ],
    })
    const config = {
      get: (key: string) =>
        (
          ({
            'brainOps.customerSignalSweepMs': 0,
            'brainOps.customerSignalFlushTokens': 50_000,
            'brainOps.customerSignalGraceMinutes': 30,
          }) as Record<string, unknown>
        )[key],
    }
    const sweeper = new Sweeper(config, {
      getClient: vi.fn(),
      hasPgPool: () => true,
      pgQuery,
    } as any)

    const scopes = await sweeper.listCandidateScopes()

    const sql = pgQuery.mock.calls[0][0] as string
    expect(sql).toContain("c.metadata->>'public' = 'true'")
    expect(sql).not.toContain('visitor_email')
    expect(sql).not.toContain('extracted_email')
    expect(scopes).toEqual([
      {
        orgId: 'org-1',
        userId: 'owner-1',
        estTokens: 120,
        oldestUnprocessedAt: '2026-06-10T10:00:00.000Z',
      },
    ])
  })
})

describe('CustomerSignalSweeperService.runSweep', () => {
  it('no-ops while another sweep is in flight', async () => {
    const Sweeper = await loadSweeper()
    const sweeper = makeSweeper({}, { inserts: [], updates: [] }, Sweeper)

    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const listCandidateScopes = vi.fn().mockImplementation(async () => {
      await gate
      return []
    })
    sweeper.listCandidateScopes = listCandidateScopes

    const first = sweeper.runSweep()
    const second = sweeper.runSweep()
    release()
    await Promise.all([first, second])

    expect(listCandidateScopes).toHaveBeenCalledTimes(1)
  })
})
