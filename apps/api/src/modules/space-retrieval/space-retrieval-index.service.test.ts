import { describe, expect, it, vi } from 'vitest'
import { SpaceRetrievalRepository } from './repositories/space-retrieval.repository'
import { SpaceRetrievalIndexService } from './services/space-retrieval-index.service'

describe('SpaceRetrievalIndexService', () => {
  it('indexes row-provided space views without loading a canonical table row', async () => {
    const embedding = { getEmbedding: vi.fn().mockResolvedValue(null) }
    const structuralEdges = {
      replaceStructuralEdgesForSource: vi.fn().mockResolvedValue({ written: 0 }),
    }
    const service = new SpaceRetrievalIndexService(
      embedding as any,
      structuralEdges as any,
      new SpaceRetrievalRepository(),
    )
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({ error: null }),
    }
    const objectChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'object-1' }, error: null }),
    }
    const chunkChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    let objectCalls = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_semantic_objects') {
          objectCalls += 1
          return objectCalls === 1 ? deleteChain : objectChain
        }
        if (table === 'space_semantic_chunks') return chunkChain
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }

    process.env.SPACE_ASSET_INDEXING = '1'
    const result = await service.indexSource(supabase as any, {
      sourceType: 'space_view',
      sourceId: 'space-1:view-1',
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      row: {
        id: 'space-1:view-1',
        space_id: 'space-1',
        title: 'IG Research',
        view: { id: 'view-1', type: 'instagram_research', name: 'IG Research' },
      },
    })

    expect(result.indexed).toBe(1)
    expect(supabase.from).not.toHaveBeenCalledWith('space_items')
    expect(objectChain.upsert).toHaveBeenCalled()
    expect(structuralEdges.replaceStructuralEdgesForSource).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        sourceType: 'space_view',
        sourceId: 'space-1:view-1',
        spaceId: 'space-1',
      }),
      expect.any(Object),
    )
    expect(chunkChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: 'space_view',
        source_id: 'space-1:view-1',
        space_id: 'space-1',
      }),
    )
  })
})
