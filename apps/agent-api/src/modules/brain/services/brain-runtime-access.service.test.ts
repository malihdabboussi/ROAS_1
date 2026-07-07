import { describe, expect, it, vi } from 'vitest'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'
import { ContentDedupeService } from './content-dedupe.service'
import { EmotionalTaggingService } from './emotional-tagging.service'
import { PendingCapturesService } from './pending-captures.service'
import { ScholarContextService } from './scholar-context.service'
import { VoiceAssignmentService } from './voice-assignment.service'

describe('Brain small runtime data access behavior', () => {
  it('registers a new content hash for a brain', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    const insert = vi.fn(async () => ({ error: null }))
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle,
            })),
          })),
        })),
        insert,
      })),
    }
    const service = new ContentDedupeService()

    const result = await service.registerForBrain(
      supabase as any,
      'brain-1',
      '  Launch copy should stay subtle.  ',
      'document',
    )

    expect(result.duplicate).toBe(false)
    expect(result.contentHash).toHaveLength(64)
    expect(supabase.from).toHaveBeenCalledWith('ns_content_hashes')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-1',
        source_type: 'document',
        snapshot_ids: [],
      }),
    )
  })

  it('updates bounded emotional metadata from Gemini analysis', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const supabase = {
      from: vi.fn(() => ({ update })),
    }
    const embedding = {
      callGemini: vi.fn(async () =>
        JSON.stringify({
          source_emotion: 'Determination',
          emotional_valence: 2,
          emotional_intensity: -1,
          speaker_intent: 'Motivation',
        }),
      ),
    }
    const service = new EmotionalTaggingService(embedding as any)

    await service.tagMemory(supabase as any, 'memory-1', 'We keep going.', 'user-1', 'org-1')

    expect(embedding.callGemini).toHaveBeenCalledWith(expect.any(String), undefined, {
      userId: 'user-1',
      orgId: 'org-1',
    })
    expect(update).toHaveBeenCalledWith({
      source_emotion: 'determination',
      emotional_valence: 1,
      emotional_intensity: 0,
      speaker_intent: 'motivation',
    })
    expect(eq).toHaveBeenCalledWith('id', 'memory-1')
  })

  it('assigns and persists a role-based voice when registry voice is missing', async () => {
    const readQuery = {
      select: vi.fn(() => readQuery),
      eq: vi.fn(() => readQuery),
      is: vi.fn(() => readQuery),
      maybeSingle: vi.fn(async () => ({
        data: { image_url: 'https://example.com/avatar.png', role: 'CEO' },
        error: null,
      })),
    }
    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn(() => updateQuery),
      is: vi.fn(() => Promise.resolve({ error: null })),
    }
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(readQuery)
        .mockReturnValueOnce(updateQuery),
    }
    const service = new VoiceAssignmentService(
      { get: vi.fn(() => '') } as any,
      { client: supabase } as any,
    )
    service.detectAvatarGender = vi.fn(async () => 'male')

    await expect(service.resolveAgentVoice('atlas', 'user-1')).resolves.toBe('Charon')
    expect(updateQuery.update).toHaveBeenCalledWith({ voice_name: 'Charon' })
    expect(updateQuery.eq).toHaveBeenCalledWith('agent_key', 'atlas')
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('accepts pending captures into snapshots and preserves source fallbacks', async () => {
    const capture = {
      id: 'capture-1',
      brain_id: 'brain-1',
      agent_id: 'agent-1',
      session_id: 'session-1',
      context: 'Training call',
      source_type: 'conversation',
      snapshots: [
        {
          title: 'Pricing rule',
          content: 'Always confirm the custom price floor.',
          confidence: 0.9,
          significance: 0.7,
          tags: ['pricing'],
          source_id: 'snapshot-source',
          source_title: 'Call recap',
        },
      ],
    }
    const pendingFetchQuery = {
      select: vi.fn(() => pendingFetchQuery),
      eq: vi.fn(() => pendingFetchQuery),
      single: vi.fn(async () => ({ data: capture, error: null })),
    }
    const pendingUpdateQuery = {
      eq: vi.fn(async () => ({ error: null })),
    }
    const pendingTable = {
      select: vi.fn(() => pendingFetchQuery),
      update: vi.fn(() => pendingUpdateQuery),
    }
    const snapshotInsert = vi.fn(async () => ({ error: null }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_pending_captures') return pendingTable
        if (table === 'ns_snapshots') return { insert: snapshotInsert }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const service = new PendingCapturesService(
      { client: supabase } as any,
      new BrainRuntimeRepository(),
    )

    await expect(service.acceptCapture('capture-1')).resolves.toEqual({
      accepted: true,
      snapshotsCreated: 1,
    })

    expect(snapshotInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-1',
        name: 'Pricing rule',
        core: 'Always confirm the custom price floor.',
        source: 'Call recap',
        source_type: 'conversation',
        source_id: 'snapshot-source',
        agent_id: 'agent-1',
        session_id: 'session-1',
        capture_context: 'Training call',
      }),
    )
    expect(pendingTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted', reviewed_at: expect.any(String) }),
    )
    expect(pendingUpdateQuery.eq).toHaveBeenCalledWith('id', 'capture-1')
  })

  it('builds scholar extraction context from default brain, related memories, and SK domains', async () => {
    const tableCalls: Array<{ table: string; columns: string; options?: unknown }> = []
    const makeListQuery = (result: { data: unknown; count?: number | null }) => {
      const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result)),
      }
      return query
    }
    const supabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn((columns: string, options?: unknown) => {
          tableCalls.push({ table, columns, options })
          if (table === 'ns_brains') {
            return makeListQuery({ data: [{ id: 'brain-default', is_default: true }] })
          }
          if (table === 'ns_memories') {
            return makeListQuery({ data: null, count: 2 })
          }
          if (table === 'ns_sk_entries') {
            return makeListQuery({
              data: [{ domain: 'sales' }, { domain: 'ops' }, { domain: 'sales' }],
              count: 3,
            })
          }
          return makeListQuery({ data: [] })
        }),
      })),
      rpc: vi.fn(async () => ({
        data: [
          {
            content: 'Existing pricing constraint.',
            memory_type: 'fact',
            significance: 0.8,
          },
        ],
        error: null,
      })),
    }
    const service = new ScholarContextService(
      {
        getEmbedding: vi.fn(async () => [0.1, 0.2]),
      } as any,
      new BrainRuntimeRepository(),
    )

    const context = await service.gatherExtractionContext(
      supabase as any,
      'user-1',
      'Pricing source document',
      'document',
      'org-1',
    )

    expect(context.relatedMemories).toEqual([
      {
        content: 'Existing pricing constraint.',
        memory_type: 'fact',
        significance: 0.8,
      },
    ])
    expect(context.brainStats).toEqual({
      totalMemories: 2,
      totalSkEntries: 3,
      topDomains: ['sales', 'ops'],
    })
    expect(supabase.rpc).toHaveBeenCalledWith(
      'search_ns_memories',
      expect.objectContaining({
        p_brain_id: 'brain-default',
        p_query_embedding: '[0.1,0.2]',
        p_match_count: 5,
      }),
    )
    expect(tableCalls).toContainEqual({
      table: 'ns_memories',
      columns: 'id',
      options: { count: 'exact', head: true },
    })
  })
})
