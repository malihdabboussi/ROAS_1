import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainEvidenceIngestionService } from './brain-evidence-ingestion.service'

const originalFlag = process.env.BRAIN_EVIDENCE_CHUNKS

afterEach(() => {
  if (originalFlag === undefined) delete process.env.BRAIN_EVIDENCE_CHUNKS
  else process.env.BRAIN_EVIDENCE_CHUNKS = originalFlag
})

function makeSupabase() {
  const chunkUpsert = vi.fn(async () => ({ error: null }))
  const episodeUpsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'episode-1' }, error: null })),
    })),
  }))
  return {
    chunkUpsert,
    episodeUpsert,
    client: {
      from: vi.fn((table: string) => ({
        upsert: table === 'brain_episodes' ? episodeUpsert : chunkUpsert,
      })),
    },
  }
}

describe('BrainEvidenceIngestionService', () => {
  it('does not write evidence chunks unless the flag is enabled', async () => {
    delete process.env.BRAIN_EVIDENCE_CHUNKS
    const supabase = makeSupabase()
    const service = new BrainEvidenceIngestionService({ getEmbedding: vi.fn() } as any)

    const result = await service.writeEvidenceChunks(supabase.client as any, {
      brainId: 'brain-1',
      family: 'user',
      ownerId: 'user-1',
      sourceType: 'document',
      sourceTitle: 'Launch Notes',
      ingestionPath: 'direct_tool',
      chunks: ['Launch copy should be subtle.'],
    })

    expect(result).toEqual({ chunks_inserted: 0, episode_id: null })
    expect(supabase.chunkUpsert).not.toHaveBeenCalled()
    expect(supabase.episodeUpsert).not.toHaveBeenCalled()
  })

  it('writes deterministic source-grounded evidence chunks when enabled', async () => {
    process.env.BRAIN_EVIDENCE_CHUNKS = '1'
    const supabase = makeSupabase()
    const getEmbedding = vi.fn(async () => [0.1, 0.2, 0.3])
    const service = new BrainEvidenceIngestionService({ getEmbedding } as any)

    const result = await service.writeEvidenceChunks(supabase.client as any, {
      brainId: 'brain-1',
      family: 'user',
      orgId: 'org-1',
      ownerId: 'user-1',
      sourceType: 'document',
      sourceTitle: 'Launch Notes',
      ingestionPath: 'direct_tool',
      chunks: ['Launch copy should be subtle.'],
    })

    expect(result).toEqual({ chunks_inserted: 1, episode_id: 'episode-1' })
    expect(supabase.chunkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        brain_id: 'brain-1',
        source_type: 'document',
        source_title: 'Launch Notes',
        chunk_index: 0,
        contextual_prefix:
          'Source: Launch Notes. Type: document. Brain family: user. This chunk was indexed as source evidence for later retrieval.',
        content: 'Launch copy should be subtle.',
        embedding: '[0.1,0.2,0.3]',
        metadata: expect.objectContaining({
          brain_scope: 'user',
          org_id: 'org-1',
          owner_id: 'user-1',
          ingestion_path: 'direct_tool',
          embedding_status: 'embedded',
        }),
      }),
      { onConflict: 'brain_id,source_type,source_id,chunk_index' },
    )
  })
})
