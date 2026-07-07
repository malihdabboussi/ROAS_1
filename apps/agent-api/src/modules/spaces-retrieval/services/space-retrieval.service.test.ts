import { describe, expect, it } from 'vitest'
import { BrainRerankerService } from '../../brain/services/brain-reranker.service'
import { BrainSufficiencyService } from '../../brain/services/brain-sufficiency.service'
import { SpaceRetrievalService } from './space-retrieval.service'

class QueryBuilder {
  private rows: Array<Record<string, unknown>>
  private filters: Array<{ key: string; value: unknown }> = []

  constructor(rows: Array<Record<string, unknown>>) {
    this.rows = rows
  }

  select() {
    return this
  }

  textSearch() {
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value })
    return this
  }

  in(key: string, values: unknown[]) {
    this.rows = this.rows.filter((row) => values.includes(row[key]))
    return this
  }

  limit() {
    return this
  }

  then(resolve: (value: unknown) => void) {
    const rows = this.rows.filter((row) =>
      this.filters.every((filter) => row[filter.key] === filter.value),
    )
    return Promise.resolve({ data: rows, error: null }).then(resolve)
  }
}

describe('SpaceRetrievalService', () => {
  it('filters current_space retrieval and reranks exact title evidence', async () => {
    const rows = [
      {
        id: 'chunk-1',
        space_object_id: 'object-1',
        user_id: 'user-1',
        org_id: null,
        space_id: 'space-1',
        source_type: 'space_doc',
        source_id: 'doc-1',
        source_title: 'Homepage Offer Doc',
        title: 'Homepage Offer Doc',
        content: 'Decision: Almanac launch price is $49.',
        metadata: {
          retrieve_via: { action: 'read_space_document', data: { document_id: 'doc-1' } },
        },
        similarity: 0.62,
      },
      {
        id: 'chunk-2',
        space_object_id: 'object-2',
        user_id: 'user-1',
        org_id: null,
        space_id: 'space-2',
        source_type: 'space_doc',
        source_id: 'doc-2',
        source_title: 'Other Space Doc',
        title: 'Other Space Doc',
        content: 'A generic launch note.',
        metadata: {},
        similarity: 0.9,
      },
    ]
    const supabase = {
      rpc: async (_name: string, args: Record<string, unknown>) => ({
        data: rows.filter((row) => !args.p_space_id || row.space_id === args.p_space_id),
        error: null,
      }),
      from: () => new QueryBuilder(rows),
    } as any
    const embedding = {
      getEmbedding: async () => [0.1, 0.2, 0.3],
    } as any

    const service = new SpaceRetrievalService(
      embedding,
      new BrainRerankerService(),
      new BrainSufficiencyService(),
    )
    const result = await service.search(supabase, {
      query: 'Homepage Offer Doc launch price',
      userId: 'user-1',
      spaceId: 'space-1',
      mode: 'current_space',
    })

    expect(result.results[0]?.id).toBe('chunk-1')
    expect(result.results.every((item) => item.space_id === 'space-1')).toBe(true)
    expect(result.results[0]?.metadata.retrieve_via).toMatchObject({
      action: 'read_space_document',
    })
  })
})
