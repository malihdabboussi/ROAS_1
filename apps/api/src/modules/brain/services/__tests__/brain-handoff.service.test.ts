import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrainHandoffTargetRepository } from '../../repositories/brain-handoff-target.repository'
import { BrainHandoffRepository } from '../../repositories/brain-handoff.repository'
import { BrainHandoffBrainCopyService } from '../brain-handoff-brain-copy.service'
import { BrainHandoffTargetResolverService } from '../brain-handoff-target-resolver.service'
import { BrainHandoffService } from '../brain-handoff.service'

type Handler = (args: { table: string; select?: string }) => { data: unknown; error: unknown }

/**
 * Minimal chainable Supabase mock. Each `.from(table)` call runs through the
 * provided handler which inspects filters and returns `{ data, error }`.
 */
function makeSupabase(handler: Handler): SupabaseClient {
  const makeChain = (table: string) => {
    const state: { select?: string } = {}
    const chain: Record<string, unknown> = {
      select(sel: string) {
        state.select = sel
        return chain
      },
      eq() {
        return chain
      },
      is() {
        return chain
      },
      in() {
        return chain
      },
      not() {
        return chain
      },
      limit() {
        return chain
      },
      order() {
        return chain
      },
      upsert() {
        return chain
      },
      insert() {
        return chain
      },
      async maybeSingle() {
        return handler({ table, select: state.select })
      },
      then(resolve: (v: unknown) => unknown) {
        return Promise.resolve(handler({ table, select: state.select })).then(resolve)
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) } as unknown as SupabaseClient
}

describe('BrainHandoffService', () => {
  let service: BrainHandoffService

  beforeEach(() => {
    service = new BrainHandoffService(
      new BrainHandoffTargetResolverService(new BrainHandoffTargetRepository()),
      new BrainHandoffRepository(),
      new BrainHandoffBrainCopyService(new BrainHandoffRepository()),
    )
  })

  it('throws when campaign target has no campaign_id', async () => {
    const sb = makeSupabase(() => ({ data: null, error: null }))
    await expect(
      service.copyAllFromBrain(sb, 'user-1', 'src-brain', {
        type: 'campaign',
        campaignId: '',
      }),
    ).rejects.toThrow(/campaignId is required/i)
  })

  it('throws when agent target has no agent key', async () => {
    const sb = makeSupabase(() => ({ data: null, error: null }))
    await expect(
      service.copyAllFromBrain(sb, 'user-1', 'src-brain', {
        type: 'agent',
        agentKey: '',
      }),
    ).rejects.toThrow(/agentKey is required/i)
  })

  it('throws when sourceBrainId is empty', async () => {
    const sb = makeSupabase(() => ({ data: null, error: null }))
    await expect(service.copyAllFromBrain(sb, 'user-1', '', { type: 'default' })).rejects.toThrow(
      /sourceBrainId is required/i,
    )
  })

  it('throws when the resolved target brain is the same as the source', async () => {
    const sb = makeSupabase(({ table, select }) => {
      if (table === 'ns_brains' && select === 'id') {
        return { data: { id: 'same-brain' }, error: null }
      }
      return { data: null, error: null }
    })
    await expect(
      service.copyAllFromBrain(sb, 'user-1', 'same-brain', { type: 'default' }),
    ).rejects.toThrow(/must be different/i)
  })

  it('throws when target campaign is not found', async () => {
    const sb = makeSupabase(({ table }) => {
      if (table === 'campaigns') return { data: null, error: null }
      return { data: null, error: null }
    })
    await expect(
      service.copyAllFromBrain(sb, 'user-1', 'src-brain', {
        type: 'campaign',
        campaignId: 'campaign-missing',
      }),
    ).rejects.toThrow(/Target campaign not found/i)
  })

  it('resolves default brain via owner_id + is_default', async () => {
    const calls: Array<{ table: string; select?: string }> = []
    const sb = makeSupabase(({ table, select }) => {
      calls.push({ table, select })
      if (table === 'ns_brains' && select === 'id') {
        return { data: { id: 'default-brain' }, error: null }
      }
      // All subsequent listing calls return empty so copy loops are no-ops.
      return { data: [], error: null }
    })
    const result = await service.copyAllFromBrain(sb, 'user-1', 'src-brain', { type: 'default' })
    expect(result.target_brain_id).toBe('default-brain')
    expect(result.target_campaign_id).toBeNull()
    expect(result.copied).toEqual({
      memories: 0,
      snapshots: 0,
      sk_sources: 0,
      sk_entries: 0,
      narrative_pages: 0,
      narrative_links: 0,
      memory_connections: 0,
      snapshot_edges: 0,
      content_hashes: 0,
      campaign_nodes: 0,
    })
    expect(calls.some((c) => c.table === 'ns_brains')).toBe(true)
  })

  it('copies brain rows with remapped relationship ids into the target brain', async () => {
    const supabase = {}
    const targetResolver = {
      resolveTarget: vi.fn().mockResolvedValue({
        type: 'brain',
        brainId: 'target-brain',
        agentId: 'target-agent',
      }),
    }
    const rowsByTable: Record<string, Array<Record<string, unknown>>> = {
      ns_memories: [
        {
          id: 'memory-1',
          content: 'Memory one',
          content_hash: 'hash-1',
          memory_type: 'fact',
          tags: ['tag'],
        },
        {
          id: 'memory-2',
          content: 'Memory two',
          content_hash: 'hash-2',
          memory_type: 'fact',
        },
      ],
      ns_snapshots: [
        {
          id: 'snapshot-1',
          name: 'Snapshot',
          core: 'Core',
          source_id: 'source-1',
        },
        {
          id: 'snapshot-2',
          name: 'Snapshot 2',
          core: 'Core 2',
          source_id: 'source-1',
        },
      ],
      ns_sk_sources: [{ id: 'source-1', source_type: 'document', title: 'Source' }],
      ns_sk_entries: [{ id: 'entry-1', source_id: 'source-1', title: 'Entry', content: 'Body' }],
      ns_narrative_pages: [
        { id: 'page-1', slug: 'one', title: 'One' },
        { id: 'page-2', slug: 'two', title: 'Two' },
      ],
      ns_content_hashes: [
        { content_hash: 'hash-a', source_type: 'doc', snapshot_ids: ['snapshot-1', 'missing'] },
      ],
    }
    const handoffRepository = {
      findRowsForBrain: vi.fn((_supabase, table: string) => rowsByTable[table] ?? []),
      insertRows: vi.fn().mockResolvedValue(undefined),
      findNarrativeLinks: vi.fn().mockResolvedValue([
        { from_page_id: 'page-1', to_page_id: 'page-2', link_type: 'supports' },
        { from_page_id: 'page-1', to_page_id: 'missing', link_type: 'related' },
      ]),
      insertNarrativeLinks: vi.fn().mockResolvedValue(undefined),
      findMemoryConnections: vi.fn().mockResolvedValue([
        {
          source_memory_id: 'memory-1',
          target_memory_id: 'memory-2',
          relationship: 'related',
          strength: 0.9,
          created_by: 'auto',
        },
      ]),
      insertMemoryConnections: vi.fn().mockResolvedValue(undefined),
      findSnapshotEdges: vi.fn().mockResolvedValue([
        {
          source_id: 'snapshot-1',
          target_id: 'snapshot-2',
          edge_type: 'supports',
          strength: 0.7,
          context: 'ctx',
          auto_generated: true,
        },
      ]),
      insertSnapshotEdges: vi.fn().mockResolvedValue(undefined),
      upsertContentHashes: vi.fn().mockResolvedValue(undefined),
    }
    const brainCopyService = new BrainHandoffBrainCopyService(handoffRepository as never)
    const handoffService = new BrainHandoffService(
      targetResolver as never,
      handoffRepository as never,
      brainCopyService,
    )

    const result = await handoffService.copyAllFromBrain(
      supabase as never,
      'user-1',
      'source-brain',
      { type: 'agent', agentKey: 'target-agent' },
    )

    expect(result).toMatchObject({
      target_brain_id: 'target-brain',
      target_campaign_id: null,
      copied: {
        memories: 2,
        snapshots: 2,
        sk_sources: 1,
        sk_entries: 1,
        narrative_pages: 2,
        narrative_links: 1,
        memory_connections: 1,
        snapshot_edges: 1,
        content_hashes: 1,
        campaign_nodes: 0,
      },
    })

    const insertedMemories = handoffRepository.insertRows.mock.calls.find(
      (call) => call[1] === 'ns_memories',
    )?.[2] as Array<Record<string, unknown>>
    const insertedSnapshots = handoffRepository.insertRows.mock.calls.find(
      (call) => call[1] === 'ns_snapshots',
    )?.[2] as Array<Record<string, unknown>>
    const insertedSources = handoffRepository.insertRows.mock.calls.find(
      (call) => call[1] === 'ns_sk_sources',
    )?.[2] as Array<Record<string, unknown>>
    const insertedEntries = handoffRepository.insertRows.mock.calls.find(
      (call) => call[1] === 'ns_sk_entries',
    )?.[2] as Array<Record<string, unknown>>
    const insertedPages = handoffRepository.insertRows.mock.calls.find(
      (call) => call[1] === 'ns_narrative_pages',
    )?.[2] as Array<Record<string, unknown>>

    expect(insertedMemories).toEqual([
      expect.objectContaining({
        brain_id: 'target-brain',
        agent_id: 'target-agent',
        content: 'Memory one',
        recalled_count: 0,
      }),
      expect.objectContaining({
        brain_id: 'target-brain',
        agent_id: 'target-agent',
        content: 'Memory two',
        recalled_count: 0,
      }),
    ])
    expect(insertedSnapshots[0]).toEqual(
      expect.objectContaining({ brain_id: 'target-brain', agent_id: 'target-agent' }),
    )
    expect(insertedEntries[0].source_id).toBe(insertedSources[0].id)
    expect(handoffRepository.insertNarrativeLinks).toHaveBeenCalledWith(supabase, [
      {
        from_page_id: insertedPages[0].id,
        to_page_id: insertedPages[1].id,
        link_type: 'supports',
      },
    ])
    expect(handoffRepository.insertMemoryConnections).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({
        source_memory_id: insertedMemories[0].id,
        target_memory_id: insertedMemories[1].id,
      }),
    ])
    expect(handoffRepository.insertSnapshotEdges).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({
        source_id: insertedSnapshots[0].id,
        target_id: insertedSnapshots[1].id,
      }),
    ])
    expect(handoffRepository.upsertContentHashes).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({
        brain_id: 'target-brain',
        content_hash: 'hash-a',
        snapshot_ids: [insertedSnapshots[0].id],
      }),
    ])
  })
})

// Spies reference to avoid the linter dropping the import.
void vi
