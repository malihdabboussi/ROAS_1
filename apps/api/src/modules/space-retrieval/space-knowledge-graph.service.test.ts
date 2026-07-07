import { describe, expect, it, vi } from 'vitest'
import { SpaceRetrievalRepository } from './repositories/space-retrieval.repository'
import { SpaceKnowledgeGraphService } from './services/space-knowledge-graph.service'

type RowPredicate = (row: Record<string, unknown>) => boolean

// Minimal PostgREST `or` filter parser for the union used by the campaign rollup:
// `space_id.in.("a","b"),and(space_id.is.null,campaign_id.eq.x)`
function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of input) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current) parts.push(current)
  return parts
}

function parseSimplePredicate(clause: string): RowPredicate {
  const inMatch = clause.match(/^(\w+)\.in\.\((.*)\)$/)
  if (inMatch) {
    const [, col, raw] = inMatch
    const values = raw.split(',').map((value) => value.trim().replace(/^"|"$/g, ''))
    return (row) => values.includes(String(row[col]))
  }
  const isNullMatch = clause.match(/^(\w+)\.is\.null$/)
  if (isNullMatch) {
    const [, col] = isNullMatch
    return (row) => row[col] == null
  }
  const eqMatch = clause.match(/^(\w+)\.eq\.(.*)$/)
  if (eqMatch) {
    const [, col, value] = eqMatch
    return (row) => String(row[col]) === value
  }
  return () => false
}

function parseOrClause(clause: string): RowPredicate {
  const trimmed = clause.trim()
  if (trimmed.startsWith('and(') && trimmed.endsWith(')')) {
    const inner = splitTopLevel(trimmed.slice(4, -1)).map(parseSimplePredicate)
    return (row) => inner.every((predicate) => predicate(row))
  }
  return parseSimplePredicate(trimmed)
}

class Query {
  eqCalls: Array<[string, unknown]> = []
  orCalls: string[] = []
  limitCalls: unknown[] = []

  select() {
    return this
  }

  order() {
    return this
  }

  limit(value?: unknown) {
    this.limitCalls.push(value)
    return this
  }

  eq(key: string, value: unknown) {
    this.eqCalls.push([key, value])
    this.filters.push((row) => row[key] === value)
    return this
  }

  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]))
    return this
  }

  is(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value || (value === null && row[key] == null))
    return this
  }

  or(filter: string) {
    this.orCalls.push(filter)
    const predicates = splitTopLevel(filter).map(parseOrClause)
    this.filters.push((row) => predicates.some((predicate) => predicate(row)))
    return this
  }

  private filters: Array<(row: Record<string, unknown>) => boolean> = []

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  then(resolve: (value: unknown) => void) {
    return Promise.resolve({
      data: this.rows.filter((row) => this.filters.every((filter) => filter(row))),
      error: null,
    }).then(resolve)
  }
}

function supabaseWithTables(
  tables: Record<string, Array<Record<string, unknown>>>,
  rpcResults?: Record<string, { data: unknown; error: { message: string; code?: string } | null }>,
) {
  const queries: Record<string, Query[]> = {}
  return {
    queries,
    supabase: {
      from: vi.fn((table: string) => {
        const query = new Query(tables[table] ?? [])
        queries[table] = [...(queries[table] ?? []), query]
        return query
      }),
      rpc: vi.fn((fn: string, _args: Record<string, unknown>) =>
        Promise.resolve(
          rpcResults?.[fn] ?? {
            data: null,
            error: { message: `function ${fn} does not exist`, code: 'PGRST202' },
          },
        ),
      ),
    },
  }
}

describe('SpaceKnowledgeGraphService', () => {
  it('returns Space Knowledge objects and parent edges for a space', async () => {
    const { supabase, queries } = supabaseWithTables({
      space_semantic_objects: [
        {
          id: 'space-object-1',
          source_type: 'space',
          source_id: 'space-1',
          title: 'Launch Space',
          summary: 'Workspace summary',
          user_id: 'user-1',
          space_id: 'space-1',
          metadata: {},
          created_at: '2026-05-28T10:00:00.000Z',
          updated_at: '2026-05-28T10:00:00.000Z',
        },
        {
          id: 'doc-object-1',
          source_type: 'space_doc',
          source_id: 'doc-1',
          title: 'Offer notes',
          summary: 'Offer summary',
          user_id: 'user-1',
          space_id: 'space-1',
          parent_type: 'space',
          parent_id: 'space-1',
          metadata: {
            retrieve_via: { action: 'read_space_document', data: { document_id: 'doc-1' } },
          },
          source_updated_at: '2026-05-28T10:09:00.000Z',
          indexed_at: '2026-05-28T10:11:00.000Z',
          content_hash: 'hash-doc-1',
          space_semantic_chunks: [{ id: 'chunk-1' }, { id: 'chunk-2' }],
          created_at: '2026-05-28T10:10:00.000Z',
          updated_at: '2026-05-28T10:10:00.000Z',
        },
      ],
      space_semantic_edges: [
        {
          id: 'edge-1',
          space_id: 'space-1',
          from_object_id: 'space-object-1',
          to_object_id: 'doc-object-1',
          edge_type: 'contains_doc',
          edge_class: 'structural',
          confidence: 1,
          strength: 1,
          reason: 'Object belongs to this Space.',
          metadata: {},
        },
      ],
    })

    const result = await new SpaceKnowledgeGraphService(
      new SpaceRetrievalRepository(),
    ).getSpaceGraph(supabase as any, 'space-1')

    expect(supabase.from).toHaveBeenCalledWith('space_semantic_objects')
    expect(queries.space_semantic_objects[0]?.eqCalls).toContainEqual(['space_id', 'space-1'])
    expect(result.objects).toHaveLength(2)
    expect(result.edges).toEqual([
      {
        id: 'edge-1',
        from_node_id: 'space-object-1',
        to_node_id: 'doc-object-1',
        edge_type: 'contains_doc',
        edge_class: 'structural',
        confidence: 1,
        strength: 1,
        reason: 'Object belongs to this Space.',
        metadata: {},
      },
    ])
    expect(result.stats.by_source_type).toEqual({ space: 1, space_doc: 1 })
    expect(result.objects[1]?.retrieve_via).toMatchObject({ action: 'read_space_document' })
    expect(result.objects[1]).toMatchObject({
      source_updated_at: '2026-05-28T10:09:00.000Z',
      indexed_at: '2026-05-28T10:11:00.000Z',
      content_hash: 'hash-doc-1',
      chunk_count: 2,
    })
  })

  it('returns batch stats from the SQL aggregate RPC without scanning rows', async () => {
    const { supabase } = supabaseWithTables(
      {},
      {
        space_knowledge_stats_batch: {
          data: [
            {
              scope: 'space',
              scope_id: 'space-1',
              total_objects: 2,
              total_edges: 1,
              last_updated: '2026-05-28T11:00:00+00:00',
              by_source_type: { space: 1, space_doc: 1 },
            },
            {
              scope: 'campaign',
              scope_id: 'campaign-1',
              total_objects: 1,
              total_edges: 1,
              last_updated: '2026-05-28T12:00:00+00:00',
              by_source_type: { mission: 1 },
            },
          ],
          error: null,
        },
      },
    )

    const result = await new SpaceKnowledgeGraphService(
      new SpaceRetrievalRepository(),
    ).getStatsBatch(supabase as any, {
      spaceIds: ['space-1'],
      campaignIds: ['campaign-1'],
    })

    expect(supabase.rpc).toHaveBeenCalledWith('space_knowledge_stats_batch', {
      p_space_ids: ['space-1'],
      p_campaign_ids: ['campaign-1'],
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.spaces['space-1']).toEqual({
      total_objects: 2,
      total_edges: 1,
      last_updated: '2026-05-28T11:00:00+00:00',
      by_source_type: { space: 1, space_doc: 1 },
    })
    expect(result.campaigns['campaign-1']).toMatchObject({
      total_objects: 1,
      total_edges: 1,
      by_source_type: { mission: 1 },
    })
  })

  it('falls back to row-scan stats when the RPC is unavailable', async () => {
    const { supabase } = supabaseWithTables({
      space_semantic_objects: [
        {
          id: 'space-1',
          space_id: 'space-1',
          source_type: 'space',
          updated_at: '2026-05-28T10:00:00.000Z',
        },
        {
          id: 'doc-1',
          space_id: 'space-1',
          source_type: 'space_doc',
          updated_at: '2026-05-28T11:00:00.000Z',
        },
        {
          id: 'mission-1',
          campaign_id: 'campaign-1',
          source_type: 'mission',
          updated_at: '2026-05-28T12:00:00.000Z',
        },
      ],
      space_semantic_edges: [
        { id: 'edge-1', space_id: 'space-1' },
        { id: 'edge-2', campaign_id: 'campaign-1' },
      ],
    })

    const result = await new SpaceKnowledgeGraphService(
      new SpaceRetrievalRepository(),
    ).getStatsBatch(supabase as any, {
      spaceIds: ['space-1'],
      campaignIds: ['campaign-1'],
    })

    expect(result.spaces['space-1']).toMatchObject({
      total_objects: 2,
      total_edges: 1,
      by_source_type: { space: 1, space_doc: 1 },
    })
    expect(result.campaigns['campaign-1']).toMatchObject({
      total_objects: 1,
      total_edges: 1,
      by_source_type: { mission: 1 },
    })
  })

  it('rolls Campaign Knowledge up by live space membership, not the stale campaign stamp', async () => {
    const { supabase } = supabaseWithTables({
      // campaign-1 currently owns space-1 only; space-2 was reassigned elsewhere.
      spaces: [{ id: 'space-1', campaign_id: 'campaign-1' }],
      space_semantic_objects: [
        {
          id: 'mission-1',
          source_type: 'mission',
          source_id: 'mission-1',
          title: 'Launch mission',
          summary: 'Mission summary',
          user_id: 'user-1',
          space_id: 'space-1',
          campaign_id: 'campaign-1',
          metadata: {},
          created_at: '2026-05-28T10:00:00.000Z',
          updated_at: '2026-05-28T10:00:00.000Z',
        },
        {
          // Stale stamp: campaign_id still points at campaign-1, but the space now
          // belongs to a different campaign — must be excluded from the rollup.
          id: 'orphan-1',
          source_type: 'space_doc',
          source_id: 'doc-x',
          title: 'Reassigned doc',
          summary: 'Stale',
          user_id: 'user-1',
          space_id: 'space-2',
          campaign_id: 'campaign-1',
          metadata: {},
          created_at: '2026-05-28T10:00:00.000Z',
          updated_at: '2026-05-28T10:00:00.000Z',
        },
        {
          // Campaign-level object with no space — included via the union branch.
          id: 'contact-1',
          source_type: 'contact',
          source_id: 'c-1',
          title: 'Campaign contact',
          summary: 'Contact',
          user_id: 'user-1',
          space_id: null,
          campaign_id: 'campaign-1',
          metadata: {},
          created_at: '2026-05-28T10:00:00.000Z',
          updated_at: '2026-05-28T10:00:00.000Z',
        },
      ],
      space_semantic_edges: [
        {
          id: 'edge-1',
          space_id: 'space-1',
          from_object_id: 'mission-1',
          to_object_id: 'contact-1',
          edge_type: 'contains_item',
          edge_class: 'structural',
          confidence: 1,
          strength: 1,
          reason: null,
          metadata: {},
        },
      ],
    })

    const result = await new SpaceKnowledgeGraphService(
      new SpaceRetrievalRepository(),
    ).getCampaignGraph(supabase as any, 'campaign-1', 25)

    expect(result.scope).toEqual({ type: 'campaign', campaign_id: 'campaign-1' })
    const ids = result.objects.map((o) => o.id).sort()
    expect(ids).toEqual(['contact-1', 'mission-1'])
    expect(ids).not.toContain('orphan-1')
    expect(result.stats.by_source_type).toEqual({ mission: 1, contact: 1 })
    expect(result.edges.map((e) => e.id)).toEqual(['edge-1'])
  })

  it('returns an empty Campaign Knowledge graph when the campaign has no spaces', async () => {
    const { supabase } = supabaseWithTables({
      spaces: [],
      space_semantic_objects: [
        {
          id: 'orphan-1',
          source_type: 'mission',
          source_id: 'mission-1',
          space_id: 'space-9',
          campaign_id: 'campaign-1',
          metadata: {},
          created_at: '2026-05-28T10:00:00.000Z',
          updated_at: '2026-05-28T10:00:00.000Z',
        },
      ],
      space_semantic_edges: [],
    })

    const result = await new SpaceKnowledgeGraphService(
      new SpaceRetrievalRepository(),
    ).getCampaignGraph(supabase as any, 'campaign-1')

    expect(result.objects).toEqual([])
    expect(result.edges).toEqual([])
    expect(result.stats.total_objects).toBe(0)
  })
})
