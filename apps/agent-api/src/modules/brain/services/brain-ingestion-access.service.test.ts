import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainOpsHookService } from './brain-ops-hook.service'
import { DocumentIngestionService } from './document-ingestion.service'
import { SkIngestionService } from './sk-ingestion.service'

function makeDocumentBrainQuery(existingBrainId: string) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: { id: existingBrainId }, error: null })),
  }
  return query
}

function makeSkSupabase() {
  const brainQuery: any = {
    select: vi.fn(() => brainQuery),
    eq: vi.fn(() => brainQuery),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: 'brain-agent',
        owner_id: 'user-1',
        org_id: null,
        scope: 'agent',
        created_by: 'user-1',
      },
      error: null,
    })),
  }
  const sourceInsertSingle = vi.fn(async () => ({ data: { id: 'source-1' }, error: null }))
  const sourceInsertSelect = vi.fn(() => ({ single: sourceInsertSingle }))
  const sourceInsert = vi.fn(() => ({ select: sourceInsertSelect }))
  const sourceUpdateEq = vi.fn(async () => ({ error: null }))
  const sourceUpdate = vi.fn(() => ({ eq: sourceUpdateEq }))
  const entryLookupQuery: any = {
    select: vi.fn(() => entryLookupQuery),
    eq: vi.fn(() => entryLookupQuery),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  }
  const entryInsert = vi.fn(async () => ({ error: null }))
  const from = vi.fn((table: string) => {
    if (table === 'ns_brains') return brainQuery
    if (table === 'ns_sk_sources') {
      return {
        insert: sourceInsert,
        update: sourceUpdate,
      }
    }
    if (table === 'ns_sk_entries') {
      return {
        select: entryLookupQuery.select,
        insert: entryInsert,
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from },
    sourceInsert,
    sourceUpdate,
    sourceUpdateEq,
    entryLookupQuery,
    entryInsert,
  }
}

describe('Brain ingestion data access behavior', () => {
  const originalEvidenceFlag = process.env.BRAIN_EVIDENCE_CHUNKS

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalEvidenceFlag === undefined) delete process.env.BRAIN_EVIDENCE_CHUNKS
    else process.env.BRAIN_EVIDENCE_CHUNKS = originalEvidenceFlag
  })

  it('persists extracted SK entries and finalizes the SK source', async () => {
    const supabase = makeSkSupabase()
    const embedding = {
      callGemini: vi.fn(async () =>
        JSON.stringify([
          {
            title: 'Pricing Guardrail',
            content: 'Always confirm custom pricing before publishing.',
            entry_type: 'principle',
            domain: 'sales',
            complexity: 'intermediate',
            confidence: 0.91,
            tags: ['pricing'],
          },
        ]),
      ),
      getEmbedding: vi.fn(async () => [0.12, 0.34]),
    }
    const service = new SkIngestionService(
      embedding as any,
      { registerForBrain: vi.fn(async () => ({ duplicate: false, contentHash: 'hash-1' })) } as any,
      {
        gatherExtractionContext: vi.fn(async () => ({
          relatedMemories: [],
          brainStats: { totalMemories: 0, totalSkEntries: 0, topDomains: [] },
          sourceType: 'document',
        })),
        buildContextBlock: vi.fn(() => ''),
      } as any,
    )

    const result = await service.ingest(supabase.client as any, 'user-1', {
      brainId: 'brain-agent',
      text: 'A useful sales note that should become one structured knowledge entry.',
      sourceType: 'document',
      title: 'Sales Notes',
      domain: 'sales',
    })

    expect(result).toEqual({ sourceId: 'source-1', entriesInserted: 1, duplicate: false })
    expect(supabase.sourceInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-agent',
        source_type: 'document',
        title: 'Sales Notes',
        domain: 'sales',
        status: 'processing',
      }),
    )
    expect(supabase.entryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-agent',
        source_id: 'source-1',
        entry_type: 'principle',
        title: 'Pricing Guardrail',
        content: 'Always confirm custom pricing before publishing.',
        domain: 'sales',
        complexity: 'intermediate',
        confidence: 0.91,
        mastery: 0.3,
        embedding: '[0.12,0.34]',
        tags: ['pricing'],
      }),
    )
    expect(supabase.sourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        entries_count: 1,
        ingested_at: expect.any(String),
      }),
    )
    expect(supabase.sourceUpdateEq).toHaveBeenCalledWith('id', 'source-1')
  })

  it('resolves the default user brain before writing document evidence chunks', async () => {
    process.env.BRAIN_EVIDENCE_CHUNKS = '1'
    const from = vi.fn((table: string) => {
      if (table === 'ns_brains') return makeDocumentBrainQuery('brain-default')
      throw new Error(`Unexpected table ${table}`)
    })
    const memoriesRepo = {
      checkDuplicate: vi.fn(async () => false),
      create: vi.fn(async () => ({ id: 'memory-1', brain_id: 'brain-default' })),
      search: vi.fn(async () => []),
    }
    const evidenceIngestion = { writeEvidenceChunks: vi.fn(async () => ({ chunks_inserted: 1 })) }
    const embedding = {
      callGemini: vi.fn(async () =>
        JSON.stringify([
          {
            content: 'Keep launch positioning calm and specific.',
            type: 'insight',
            confidence: 0.88,
            significance: 0.7,
            tags: ['positioning'],
          },
        ]),
      ),
      getEmbedding: vi.fn(async () => [0.9, 0.8]),
    }
    const service = new DocumentIngestionService(
      embedding as any,
      { registerForOwner: vi.fn(async () => ({ duplicate: false, contentHash: 'hash-1' })) } as any,
      memoriesRepo as any,
      { tagMemory: vi.fn(async () => undefined) } as any,
      {
        gatherExtractionContext: vi.fn(async () => ({
          relatedMemories: [],
          brainStats: { totalMemories: 0, totalSkEntries: 0, topDomains: [] },
          sourceType: 'document',
        })),
        buildContextBlock: vi.fn(() => ''),
      } as any,
      evidenceIngestion as any,
    )

    await expect(
      service.ingest(
        { from } as any,
        {
          ownerId: 'user-1',
          text: 'This document contains one meaningful launch positioning insight for the user.',
          sourceType: 'document',
          sourceTitle: 'Launch Notes',
          orgId: 'org-1',
        },
      ),
    ).resolves.toEqual({ memories_created: 1 })

    expect(evidenceIngestion.writeEvidenceChunks).toHaveBeenCalledWith(
      { from },
      expect.objectContaining({
        brainId: 'brain-default',
        family: 'user',
        ownerId: 'user-1',
        sourceType: 'document',
        sourceTitle: 'Launch Notes',
        ingestionPath: 'direct_tool',
      }),
    )
    expect(memoriesRepo.create).toHaveBeenCalledWith(
      { from },
      expect.objectContaining({
        content: 'Keep launch positioning calm and specific.',
        content_hash: expect.any(String),
        memory_type: 'insight',
        source_type: 'document',
        source_title: 'Launch Notes',
        embedding: '[0.9,0.8]',
      }),
    )
  })

  it('enqueues Cortex library sync work after memory counter threshold', async () => {
    const outboxInsert = vi.fn(async () => ({ error: null }))
    const brainUpdateEq = vi.fn(async () => ({ error: null }))
    const brainReadQuery: any = {
      select: vi.fn(() => brainReadQuery),
      eq: vi.fn(() => brainReadQuery),
      single: vi.fn(async () => ({
        data: {
          owner_id: 'user-1',
          org_id: 'org-1',
          agent_id: null,
          campaign_id: null,
          is_default: true,
          last_library_sync_at: '2026-06-18T00:00:00.000Z',
          cortex_max: true,
        },
        error: null,
      })),
    }
    const brainUpdateTable = {
      update: vi.fn(() => ({ eq: brainUpdateEq })),
    }
    const memoriesQuery: any = {
      select: vi.fn(() => memoriesQuery),
      eq: vi.fn(() => memoriesQuery),
      gte: vi.fn(() => memoriesQuery),
      order: vi.fn(() => memoriesQuery),
      limit: vi.fn(() => memoriesQuery),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          resolve({
            data: [
              {
                id: 'memory-1',
                content: 'Pricing needs explicit confirmation.',
                memory_type: 'decision',
                significance: 0.8,
                source_type: 'document',
                source_title: 'Launch Notes',
                created_at: '2026-06-19T01:00:00.000Z',
              },
            ],
            error: null,
          }),
        ),
    }
    const client = {
      rpc: vi.fn(async () => ({ data: 10, error: null })),
      from: vi
        .fn()
        .mockImplementationOnce(() => brainReadQuery)
        .mockImplementationOnce(() => brainUpdateTable)
        .mockImplementationOnce((table: string) => {
          if (table !== 'ns_memories') throw new Error(`Unexpected table ${table}`)
          return memoriesQuery
        })
        .mockImplementationOnce((table: string) => {
          if (table !== 'brain_ops_outbox') throw new Error(`Unexpected table ${table}`)
          return { insert: outboxInsert }
        }),
    }
    const service = new BrainOpsHookService({ client } as any)

    await service.onMemoriesSaved('brain-default', 10)

    expect(client.rpc).toHaveBeenCalledWith('increment_brain_counter', {
      p_brain_id: 'brain-default',
      p_field: 'memories_since_last_sync',
      p_amount: 10,
    })
    expect(brainUpdateTable.update).toHaveBeenCalledWith({ memories_since_last_sync: 0 })
    expect(brainUpdateEq).toHaveBeenCalledWith('id', 'brain-default')
    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-default',
        user_id: 'user-1',
        org_id: 'org-1',
        event_type: 'brain_library_sync',
        payload: expect.objectContaining({
          brain_label: 'user brain',
          entry_type: 'memory',
          entry_count: 1,
          formatted_entries: expect.stringContaining('Pricing needs explicit confirmation.'),
        }),
      }),
    )
  })
})
