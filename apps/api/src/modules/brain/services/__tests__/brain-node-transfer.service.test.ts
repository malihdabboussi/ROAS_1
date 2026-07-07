import { describe, expect, it, vi } from 'vitest'
import { BrainNodeTransferService } from '../brain-node-transfer.service'
import { BrainNodeTransferCopyService } from '../brain-node-transfer-copy.service'

describe('BrainNodeTransferService', () => {
  it('copies a memory between user brains through repository-backed reads and writes', async () => {
    const supabase = {}
    const repository = {
      findBrainForScope: vi
        .fn()
        .mockResolvedValueOnce({ id: 'source-brain' })
        .mockResolvedValueOnce({ id: 'target-brain' }),
      findMemoryById: vi.fn().mockResolvedValue({
        id: 'mem-1',
        content: 'Remember this',
        memory_type: 'fact',
        source_type: 'document',
        source_id: 'doc-1',
        source_title: 'Doc',
        tags: ['a'],
      }),
      insertMemories: vi.fn().mockResolvedValue(undefined),
    }
    const copyService = new BrainNodeTransferCopyService(repository as never)
    const service = new BrainNodeTransferService(repository as never, copyService)

    await expect(
      service.transfer(supabase as never, 'user-1', {
        operation: 'copy',
        node_type: 'memory',
        node_id: 'mem-1',
        source_scope: { type: 'default' },
        target_scope: { type: 'default' },
      }),
    ).resolves.toEqual({ success: true, copied: 1, moved: 0 })

    expect(repository.findBrainForScope).toHaveBeenNthCalledWith(1, supabase, 'user-1', null)
    expect(repository.findBrainForScope).toHaveBeenNthCalledWith(2, supabase, 'user-1', null)
    expect(repository.findMemoryById).toHaveBeenCalledWith(supabase, 'source-brain', 'mem-1')
    expect(repository.insertMemories).toHaveBeenCalledWith(
      supabase,
      expect.arrayContaining([
        expect.objectContaining({
          brain_id: 'target-brain',
          content: 'Remember this',
          memory_type: 'fact',
          source_title: 'Doc',
        }),
      ]),
    )
  })

  it('copies a memory into an agent skill brain as a source and entry pair', async () => {
    const supabase = {}
    const repository = {
      findBrainForScope: vi
        .fn()
        .mockResolvedValueOnce({ id: 'source-brain' })
        .mockResolvedValueOnce({ id: 'agent-brain' }),
      findMemoryById: vi.fn().mockResolvedValue({
        id: 'mem-1',
        content: 'Remember This',
        memory_type: 'fact',
        source_type: 'document',
        source_id: 'doc-1',
        source_title: 'Doc',
        confidence: 0.7,
        tags: ['tag'],
      }),
      insertSkSource: vi.fn().mockResolvedValue(undefined),
      insertSkEntries: vi.fn().mockResolvedValue(undefined),
    }
    const copyService = new BrainNodeTransferCopyService(repository as never)
    const service = new BrainNodeTransferService(repository as never, copyService)

    await expect(
      service.transfer(supabase as never, 'user-1', {
        operation: 'copy',
        node_type: 'memory',
        node_id: 'mem-1',
        source_scope: { type: 'default' },
        target_scope: { type: 'agent', agent_id: 'agent-1' },
      }),
    ).resolves.toEqual({ success: true, copied: 2, moved: 0 })

    expect(repository.findBrainForScope).toHaveBeenNthCalledWith(2, supabase, 'user-1', 'agent-1')
    expect(repository.insertSkSource).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        brain_id: 'agent-brain',
        source_type: 'document',
        title: 'Doc',
        metadata: { imported_from: 'brain_experience' },
        status: 'ready',
        entries_count: 1,
        domain: 'general',
        tags: [],
      }),
      'Failed to create source',
    )
    const insertedSource = repository.insertSkSource.mock.calls[0][1]
    expect(repository.insertSkEntries).toHaveBeenCalledWith(
      supabase,
      [
        expect.objectContaining({
          brain_id: 'agent-brain',
          source_id: insertedSource.id,
          title: 'Doc',
          content: 'Remember This',
          content_hash: '8699bdec86f342226a646ca6d61f17cbb024e26a896384d827f46215c1a4bd70',
          entry_type: 'concept',
          domain: 'general',
          confidence: 0.7,
          mastery: 0,
          tags: ['tag'],
        }),
      ],
      'Failed to copy memories as entries',
    )
  })
})
