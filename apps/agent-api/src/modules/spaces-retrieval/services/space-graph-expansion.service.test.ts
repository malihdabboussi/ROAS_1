import { describe, expect, it } from 'vitest'
import type { SpaceRetrievalCandidate } from '../types/space-retrieval.types'
import { SpaceGraphExpansionService } from './space-graph-expansion.service'

class QueryBuilder {
  private filters: Array<(row: Record<string, unknown>) => boolean> = []

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select() {
    return this
  }

  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]))
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value)
    return this
  }

  is(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value || (value === null && row[key] == null))
    return this
  }

  limit() {
    return this
  }

  then(resolve: (value: unknown) => void) {
    return Promise.resolve({
      data: this.rows.filter((row) => this.filters.every((filter) => filter(row))),
      error: null,
    }).then(resolve)
  }
}

describe('SpaceGraphExpansionService', () => {
  it('expands a seed object through structural edges into connected chunks', async () => {
    const rowsByTable: Record<string, Array<Record<string, unknown>>> = {
      space_semantic_edges: [
        {
          id: 'edge-1',
          from_object_id: 'view-object',
          to_object_id: 'post-object',
          edge_type: 'contains_item',
          edge_class: 'structural',
          confidence: 1,
          strength: 1,
          reason: 'Object is listed inside this Space view.',
          space_id: 'space-1',
        },
      ],
      space_semantic_chunks: [
        {
          id: 'post-chunk',
          space_object_id: 'post-object',
          user_id: 'user-1',
          org_id: null,
          space_id: 'space-1',
          campaign_id: null,
          source_type: 'instagram_research_item',
          source_id: 'post-1',
          source_title: 'IG @vibey post',
          title: 'IG @vibey post',
          content: 'Caption: strong hook.',
          metadata: { retrieve_via: { action: 'get_task', data: { task_id: 'post-1' } } },
        },
      ],
    }
    const supabase = {
      from: (table: string) => new QueryBuilder(rowsByTable[table] ?? []),
    } as any
    const seed: SpaceRetrievalCandidate = {
      id: 'view-chunk',
      space_object_id: 'view-object',
      source_type: 'space_view',
      source_id: 'space-1:view-1',
      source_title: 'IG Research',
      title: 'IG Research',
      content: 'View: IG Research',
      snippet: 'View: IG Research',
      user_id: 'user-1',
      org_id: null,
      space_id: 'space-1',
      campaign_id: null,
      metadata: {},
      retrieve_via: null,
      lane: 'space_view',
      scores: { final: 0.8 },
      match_reasons: ['Matched Space retrieval evidence'],
    }

    const result = await new SpaceGraphExpansionService().expandCandidates(
      supabase,
      {
        query: 'IG Research',
        userId: 'user-1',
        spaceId: 'space-1',
        mode: 'current_space',
        expandGraph: true,
        graphDepth: 1,
      },
      [seed],
      10,
    )

    expect(result.map((candidate) => candidate.id)).toContain('post-chunk')
    expect(
      result.find((candidate) => candidate.id === 'post-chunk')?.metadata.graph_via,
    ).toMatchObject({
      edge_id: 'edge-1',
      edge_type: 'contains_item',
      edge_class: 'structural',
    })
  })
})
