import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InteractionEnvelopeV1 } from '@vibey/api-shared'

type InsertCall = { table: string; payload: Record<string, unknown> }
type UpsertCall = { table: string; payload: Record<string, unknown>; options?: Record<string, unknown> }

function makeClient(
  opts: { existingHashes?: Set<string> },
  inserts: InsertCall[],
  upserts: UpsertCall[] = [],
) {
  const makeChain = (table: string) => {
    const filters: Record<string, unknown> = {}
    const chain: Record<string, any> = {
      select: () => chain,
      limit: () => chain,
      eq(column: string, value: unknown) {
        filters[column] = value
        return chain
      },
      insert(payload: Record<string, unknown>) {
        inserts.push({ table, payload })
        return chain
      },
      upsert(payload: Record<string, unknown>, options?: Record<string, unknown>) {
        upserts.push({ table, payload, options })
        return chain
      },
      async maybeSingle() {
        if (table === 'ns_memories') {
          const hash = filters['content_hash'] as string | undefined
          if (hash && opts.existingHashes?.has(hash)) {
            return { data: { id: 'existing-memory' }, error: null }
          }
        }
        return { data: null, error: null }
      },
      async single() {
        if (table === 'customer_entities') return { data: { id: 'customer-entity-1' }, error: null }
        if (table === 'customer_source_identities') {
          return { data: { id: 'customer-source-identity-1' }, error: null }
        }
        if (table === 'brain_episodes') return { data: { id: 'episode-1' }, error: null }
        return { data: { id: `mem-${inserts.length}` }, error: null }
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

function envelope(overrides: Partial<InteractionEnvelopeV1> = {}): InteractionEnvelopeV1 {
  return {
    v: 1,
    channel: 'telegram',
    source_id: 'conv-1',
    title: 'Telegram Chat',
    window: { from: '2026-06-10T10:00:00.000Z', to: '2026-06-10T11:00:00.000Z' },
    participants: [
      {
        role: 'customer',
        name: 'Lead One',
        identifiers: [{ kind: 'telegram_chat_id', value: '12345' }],
      },
    ],
    content: {
      format: 'transcript',
      text: 'Customer: I want to scale my coaching business to 100k/month',
      message_count: 4,
    },
    ...overrides,
  }
}

function geminiResponse(items: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(items) }] } }],
    }),
  }
}

const embeddingResponse = {
  ok: true,
  json: async () => ({ embedding: { values: [0.1, 0.2, 0.3] } }),
}

function stubFetch(items: unknown) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const href = String(url)
    if (href.includes('generateContent')) return geminiResponse(items)
    if (href.includes('embedContent')) return embeddingResponse
    throw new Error(`Unexpected fetch: ${href}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function loadService() {
  const mod = await import('./customer-interaction-extraction.service')
  expect(mod.CustomerInteractionExtractionService).toBeTypeOf('function')
  return new mod.CustomerInteractionExtractionService() as any
}

const baseInput = {
  brainId: 'brain-1',
  userId: 'owner-1',
  orgId: 'org-1',
  contactId: 'contact-1',
}

describe('CustomerInteractionExtractionService', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GEMINI_API_KEY
  })

  it('saves only items at or above the 0.6 significance gate with the customer memory contract', async () => {
    stubFetch([
      {
        content: 'Wants to scale coaching business to 100k/month',
        type: 'fact',
        speaker: 'Lead One',
        confidence: 0.9,
        significance: 0.8,
        tags: ['goal'],
      },
      {
        content: 'Said hello at the start',
        type: 'fact',
        speaker: 'Lead One',
        confidence: 0.9,
        significance: 0.2,
        tags: [],
      },
    ])
    const inserts: InsertCall[] = []
    const upserts: UpsertCall[] = []
    const service = await loadService()

    const result = await service.extractAndSave(makeClient({}, inserts, upserts), {
      ...baseInput,
      envelope: envelope(),
    })

    expect(result.status).toBe('ok')
    expect(result.memories_created).toBe(1)
    expect(result.memory_ids).toHaveLength(1)

    const memoryInserts = inserts.filter((c) => c.table === 'ns_memories')
    expect(memoryInserts).toHaveLength(1)
    const payload = memoryInserts[0].payload
    expect(payload.brain_id).toBe('brain-1')
    expect(payload.contact_id).toBe('contact-1')
    expect(payload.content).toBe('Wants to scale coaching business to 100k/month')
    expect(payload.content_hash).toBe(
      createHash('sha256').update('Wants to scale coaching business to 100k/month').digest('hex'),
    )
    expect(payload.memory_type).toBe('fact')
    expect(payload.source_type).toBe('telegram_chat')
    expect(payload.source_id).toBe('conv-1')
    expect(payload.source_title).toBe('Telegram Chat')
    expect(payload.customer_entity_id).toBe('customer-entity-1')
    expect(payload.customer_source_identity_id).toBe('customer-source-identity-1')
    expect(payload.customer_resolution_status).toBe('linked_contact')
    expect(payload.agent_id).toBe('atlas')
    expect(payload.tags).toContain('customer_brain')
    const metadata = payload.metadata as Record<string, unknown>
    expect(metadata.user_id).toBe('owner-1')
    expect(metadata.identity_resolution).toMatchObject({
      status: 'linked_contact',
      contact_id: 'contact-1',
      customer_entity_id: 'customer-entity-1',
      customer_source_identity_id: 'customer-source-identity-1',
      source_type: 'telegram_chat',
      source_id: '12345',
      identity_kind: 'telegram_chat_id',
    })
    expect(payload.significance).toBe(0.8)

    expect(upserts.find((c) => c.table === 'customer_entities')?.payload).toMatchObject({
      brain_id: 'brain-1',
      entity_key: 'contact:contact-1',
      entity_type: 'contact',
      primary_contact_id: 'contact-1',
    })
    expect(upserts.find((c) => c.table === 'customer_source_identities')?.payload).toMatchObject({
      brain_id: 'brain-1',
      customer_entity_id: 'customer-entity-1',
      contact_id: 'contact-1',
      source_type: 'telegram_chat',
      source_id: '12345',
      identity_kind: 'telegram_chat_id',
    })
  })

  it('maps widget envelopes to source_type widget_chat', async () => {
    stubFetch([
      {
        content: 'Prefers async communication over calls',
        type: 'preference',
        speaker: null,
        confidence: 0.8,
        significance: 0.7,
        tags: [],
      },
    ])
    const inserts: InsertCall[] = []
    const service = await loadService()

    await service.extractAndSave(makeClient({}, inserts), {
      ...baseInput,
      envelope: envelope({ channel: 'widget' }),
    })

    expect(inserts[0]?.payload.source_type).toBe('widget_chat')
  })

  it('saves source-anchored customer memories when contact_id is unknown', async () => {
    stubFetch([
      {
        content: 'Anonymous visitor wants clearer weekly rollout updates',
        type: 'insight',
        speaker: null,
        confidence: 0.8,
        significance: 0.7,
        tags: ['public_widget'],
      },
    ])
    const inserts: InsertCall[] = []
    const upserts: UpsertCall[] = []
    const service = await loadService()

    const result = await service.extractAndSave(makeClient({}, inserts, upserts), {
      ...baseInput,
      contactId: null,
      envelope: envelope({
        channel: 'widget',
        source_id: 'conv-widget-1',
        title: 'Public Widget Chat',
        participants: [
          {
            role: 'customer',
            name: null,
            identifiers: [{ kind: 'visitor_id', value: 'visitor-1' }],
          },
        ],
      }),
    })

    expect(result.status).toBe('ok')
    const payload = inserts.find((c) => c.table === 'ns_memories')?.payload
    expect(payload).toMatchObject({
      brain_id: 'brain-1',
      contact_id: null,
      source_type: 'widget_chat',
      source_id: 'conv-widget-1',
      customer_entity_id: 'customer-entity-1',
      customer_source_identity_id: 'customer-source-identity-1',
      customer_resolution_status: 'unlinked_source',
    })
    expect(upserts.find((c) => c.table === 'customer_entities')?.payload).toMatchObject({
      entity_key: 'source:widget_visitor:visitor-1',
      entity_type: 'source_identity',
      primary_contact_id: null,
    })
    expect(upserts.find((c) => c.table === 'customer_source_identities')?.payload).toMatchObject({
      contact_id: null,
      source_type: 'widget_visitor',
      source_id: 'visitor-1',
      identity_kind: 'visitor_id',
    })
    expect((payload?.metadata as Record<string, unknown>).identity_resolution).toMatchObject({
      status: 'unlinked_source',
      source_type: 'widget_visitor',
      source_id: 'visitor-1',
      identity_kind: 'visitor_id',
    })
  })

  it('returns zero memories without error when everything is below the gate', async () => {
    stubFetch([
      {
        content: 'small talk',
        type: 'fact',
        speaker: null,
        confidence: 0.5,
        significance: 0.3,
        tags: [],
      },
    ])
    const inserts: InsertCall[] = []
    const service = await loadService()

    const result = await service.extractAndSave(makeClient({}, inserts), {
      ...baseInput,
      envelope: envelope(),
    })

    expect(result.memories_created).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('skips content_hash duplicates', async () => {
    const content = 'Wants to scale coaching business to 100k/month'
    stubFetch([
      { content, type: 'fact', speaker: null, confidence: 0.9, significance: 0.8, tags: [] },
    ])
    const hash = createHash('sha256').update(content).digest('hex')
    const inserts: InsertCall[] = []
    const service = await loadService()

    const result = await service.extractAndSave(
      makeClient({ existingHashes: new Set([hash]) }, inserts),
      { ...baseInput, envelope: envelope() },
    )

    expect(result.memories_created).toBe(0)
    expect(inserts).toHaveLength(0)
  })

  it('returns an error result (without throwing) when Gemini returns invalid JSON', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes('generateContent')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'not valid json {' }] } }],
          }),
        }
      }
      return embeddingResponse
    })
    vi.stubGlobal('fetch', fetchMock)
    const service = await loadService()

    const result = await service.extractAndSave(makeClient({}, []), {
      ...baseInput,
      envelope: envelope(),
    })

    expect(result.status).toBe('error')
    expect(result.memories_created ?? 0).toBe(0)
  })

  it('coerces unknown memory types into a valid customer memory type', async () => {
    stubFetch([
      {
        content: 'Believes paid ads are a waste for his audience',
        type: 'hot_take',
        speaker: null,
        confidence: 0.9,
        significance: 0.9,
        tags: [],
      },
    ])
    const inserts: InsertCall[] = []
    const service = await loadService()

    await service.extractAndSave(makeClient({}, inserts), {
      ...baseInput,
      envelope: envelope(),
    })

    expect(inserts[0]?.payload.memory_type).toBe('insight')
  })

  it('fails cleanly when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY
    stubFetch([])
    const service = await loadService()

    const result = await service.extractAndSave(makeClient({}, []), {
      ...baseInput,
      envelope: envelope(),
    })

    expect(result.status).toBe('error')
    expect(String(result.reason ?? '')).toContain('GEMINI_API_KEY')
  })
})
