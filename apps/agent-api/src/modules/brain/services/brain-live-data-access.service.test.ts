import { describe, expect, it, vi } from 'vitest'
import { BrainLiveDocumentRepository } from '../repositories/brain-live-document.repository'
import { BrainLiveRepository } from '../repositories/brain-live.repository'
import { BrainLiveService, type LiveSession } from './brain-live.service'

type Filter = { method: 'eq' | 'is' | 'in' | 'neq'; column: string; value: unknown }

function makeQuery(rows: unknown[] = [], single: unknown = null) {
  const filters: Filter[] = []
  let inserted: unknown = null
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'eq', column, value })
      return query
    }),
    is: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'is', column, value })
      return query
    }),
    in: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'in', column, value })
      return query
    }),
    neq: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'neq', column, value })
      return query
    }),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn((payload: unknown) => {
      inserted = payload
      return query
    }),
    maybeSingle: vi.fn(async () => ({ data: single ?? filterRows(rows, filters)[0] ?? null, error: null })),
    single: vi.fn(async () => ({ data: inserted ?? single, error: null })),
    then: (resolve: (value: { data: unknown[]; error: null; count: number }) => unknown) => {
      const filtered = filterRows(rows, filters)
      return Promise.resolve(resolve({ data: filtered, error: null, count: filtered.length }))
    },
  }
  return query
}

function filterRows(rows: unknown[], filters: Filter[]) {
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return true
    const record = row as Record<string, unknown>
    return filters.every((filter) => {
      if (filter.method === 'eq') return record[filter.column] === filter.value
      if (filter.method === 'is') return record[filter.column] === filter.value
      if (filter.method === 'neq') return record[filter.column] !== filter.value
      if (filter.method === 'in') {
        return Array.isArray(filter.value) && filter.value.includes(record[filter.column])
      }
      return true
    })
  })
}

function createService(supabase: any, overrides: Record<string, unknown> = {}) {
  const service = Object.create(BrainLiveService.prototype) as BrainLiveService
  Object.assign(service as any, {
    supabase,
    logger: { warn: vi.fn(), error: vi.fn(), log: vi.fn() },
    memoriesService: {
      listMemories: vi.fn(async () => [
        { id: 'mem-1', memory_type: 'fact', content: 'Launch copy should stay precise.' },
      ]),
      searchMemories: vi.fn(async () => ({ results: [] })),
      createMemory: vi.fn(async () => ({ id: 'mem-new' })),
    },
    crystallizationService: { crystallize: vi.fn() },
    embeddingService: { getEmbedding: vi.fn(async () => [0.1, 0.2]) },
    creditsService: { processDirectTextUsage: vi.fn() },
    delegations: new Map(),
    liveRepository: new BrainLiveRepository(),
    documentRepository: new BrainLiveDocumentRepository(),
    ...overrides,
  })
  return service
}

describe('BrainLiveService data access behavior', () => {
  it('resolves and caches a live conversation campaign id', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'conversations') {
          return makeQuery([{ id: 'conv-1', campaign_id: 'campaign-1' }])
        }
        return makeQuery([])
      }),
    }
    const service = createService(supabase)
    const session = {
      id: 'session-1',
      userId: 'user-1',
      orgId: 'org-1',
      scope: { type: 'user' },
      createdAt: Date.now(),
      conversationId: 'conv-1',
    } satisfies LiveSession

    await expect(service.resolveCampaignId(session)).resolves.toBe('campaign-1')
    await expect(service.resolveCampaignId(session)).resolves.toBe('campaign-1')

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(session.campaignId).toBe('campaign-1')
  })

  it('builds company Brain context from stats, recent memories, objects, and signals', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_memories') {
          return makeQuery([
            { id: 'mem-1', brain_id: 'brain-company', memory_type: 'fact' },
            { id: 'mem-2', brain_id: 'brain-company', memory_type: 'decision' },
          ])
        }
        if (table === 'ns_snapshots') {
          return makeQuery([{ id: 'snap-1', brain_id: 'brain-company' }])
        }
        if (table === 'company_cortex_objects') {
          return makeQuery([
            {
              brain_id: 'brain-company',
              object_type: 'protocol',
              title: 'Approval protocol',
              truth: 'Ask before mutating workspaces.',
              status: 'active',
            },
          ])
        }
        if (table === 'company_cortex_signals') {
          return makeQuery([
            {
              brain_id: 'brain-company',
              signal_type: 'decision',
              truth: 'Workspace changes need approval.',
              status: 'active',
            },
          ])
        }
        return makeQuery([])
      }),
    }
    const service = createService(supabase)

    const context = await (service as any).buildBrainContext('user-1', {
      type: 'company',
      brainId: 'brain-company',
      label: 'Company Cortex',
    })

    expect(context).toContain('Brain stats: 2 memories, 1 snapshots.')
    expect(context).toContain('[protocol] Approval protocol')
    expect(context).toContain('[decision] Workspace changes need approval.')
    expect(context).toContain('[fact] Launch copy should stay precise.')
  })

  it('searches company cortex objects for live voice Brain search', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') {
          return makeQuery([], { id: 'brain-company' })
        }
        if (table === 'company_cortex_objects') {
          return makeQuery([
            {
              id: 'object-1',
              brain_id: 'brain-company',
              object_type: 'protocol',
              title: 'Approval protocol',
              truth: 'Ask before mutating workspaces.',
              status: 'active',
              updated_at: '2026-06-19T00:00:00.000Z',
            },
          ])
        }
        return makeQuery([])
      }),
    }
    const service = createService(supabase)

    const result = await service.executeBrainAction(
      'user-1',
      'org-1',
      { type: 'company', brainId: 'brain-company' },
      'search_user_brain',
      { query: 'approval', limit: 5 },
      'session-1',
    )

    expect(result).toMatchObject({
      success: true,
      count: 1,
      results: [
        {
          id: 'object-1',
          content: 'Approval protocol: Ask before mutating workspaces.',
          type: 'protocol',
        },
      ],
    })
  })

  it('reads document metadata and vector matches for live voice document search', async () => {
    const storageBucket = {
      createSignedUrl: vi.fn(async () => ({
        data: { signedUrl: 'https://signed.example/doc.pdf' },
        error: null,
      })),
      download: vi.fn(),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'media_assets') {
          return makeQuery(
            [
              {
                id: 'asset-1',
                user_id: 'user-1',
                org_id: 'org-1',
                name: 'Deck',
                original_filename: 'deck.pdf',
                file_path: 'uploads/deck.pdf',
                bucket_name: 'media',
                file_size: 1000,
                mime_type: 'application/pdf',
                page_count: 2,
                text_layer:
                  'Approval protocol content for workspace changes. The document explains why teams should ask before mutating workspaces and how the approval decision is recorded.',
                outline: [],
                public_url: null,
                document_intelligence: { pages: 2 },
              },
            ],
            null,
          )
        }
        return makeQuery([])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_media_asset_chunks') {
          return {
            data: [{ page_number: 2, snippet: 'Approval protocol content', similarity: 0.87 }],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
      storage: { from: vi.fn(() => storageBucket) },
    }
    const service = createService(supabase)

    const result = await service.executeReadDocument(
      {
        id: 'session-1',
        userId: 'user-1',
        orgId: 'org-1',
        scope: { type: 'agent', agentId: 'designer' },
        createdAt: Date.now(),
      },
      { asset_id: 'asset-1', mode: 'search', query: 'approval' },
    )

    expect(result).toMatchObject({
      success: true,
      mode: 'search',
      asset: {
        id: 'asset-1',
        filename: 'deck.pdf',
        url: 'https://signed.example/doc.pdf',
      },
      matches: [{ page: 2, snippet: 'Approval protocol content', score: 0.87 }],
    })
  })

  it('persists live transcript messages with voice metadata', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'messages') return makeQuery([])
        return makeQuery([])
      }),
    }
    const service = createService(supabase)

    const result = await service.saveTranscriptMessage('conv-1', 'user-1', 'user', '  hello  ', {
      mood: 'focused',
    })

    expect(result).toMatchObject({
      conversation_id: 'conv-1',
      role: 'user',
      content: 'hello',
      metadata: { mood: 'focused', source: 'voice_live' },
    })
  })
})
