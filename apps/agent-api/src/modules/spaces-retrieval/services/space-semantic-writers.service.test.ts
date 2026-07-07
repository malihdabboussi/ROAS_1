import { describe, expect, it, vi } from 'vitest'
import { SpaceKeywordContextService } from './space-keyword-context.service'
import { SpaceSemanticChunkWriterService } from './space-semantic-chunk-writer.service'
import { SpaceSemanticEdgeWriterService } from './space-semantic-edge-writer.service'

class QueryBuilder {
  private filters: Array<{ key: string; value: unknown }> = []
  private operation: 'delete' | null = null

  constructor(
    private readonly table: string,
    private readonly rows: Array<Record<string, unknown>>,
    private readonly operations: Array<Record<string, unknown>>,
  ) {}

  delete() {
    this.operation = 'delete'
    this.operations.push({ table: this.table, action: 'delete' })
    return this
  }

  select() {
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value })
    return this
  }

  maybeSingle() {
    const row =
      this.rows.find((candidate) =>
        this.filters.every((filter) => candidate[filter.key] === filter.value),
      ) ?? null
    return Promise.resolve({ data: row, error: null })
  }

  then(resolve: (value: unknown) => void) {
    return Promise.resolve({ data: null, error: null, operation: this.operation }).then(resolve)
  }
}

describe('SpaceSemanticChunkWriterService', () => {
  it('deletes the old source, upserts a sanitized object, and inserts embedded chunks', async () => {
    const operations: Array<Record<string, unknown>> = []
    const supabase = {
      from: (table: string) => ({
        delete: () => new QueryBuilder(table, [], operations).delete(),
        upsert: (payload: Record<string, unknown>, options: Record<string, unknown>) => {
          operations.push({ table, action: 'upsert', payload, options })
          return {
            select: () => ({
              single: async () => ({ data: { id: 'object-1' }, error: null }),
            }),
          }
        },
        insert: async (payload: Record<string, unknown>) => {
          operations.push({ table, action: 'insert', payload })
          return { error: null }
        },
      }),
    } as any
    const embedding = {
      getEmbedding: vi.fn(async () => [0.1, 0.2]),
    } as any

    const result = await new SpaceSemanticChunkWriterService(
      embedding,
      new SpaceKeywordContextService(),
    ).replaceSource(supabase, {
      sourceType: 'space_doc',
      sourceId: 'doc-1',
      title: 'Launch\u0000 Doc',
      content: 'Launch\u0000 context',
      userId: 'user-1',
      orgId: null,
      metadata: { unstable: Number.POSITIVE_INFINITY },
    })

    expect(result).toEqual({ indexed: 1, skipped: 0 })
    expect(operations[0]).toMatchObject({ table: 'space_semantic_objects', action: 'delete' })
    expect(operations.find((operation) => operation.action === 'upsert')?.payload).toMatchObject({
      source_type: 'space_doc',
      source_id: 'doc-1',
      title: 'Launch Doc',
      metadata: { unstable: null },
    })
    expect(operations.find((operation) => operation.table === 'space_semantic_chunks')).toMatchObject(
      {
        action: 'insert',
        payload: {
          space_object_id: 'object-1',
          content: 'Launch context',
          embedding: '[0.1,0.2]',
        },
      },
    )
  })
})

describe('SpaceSemanticEdgeWriterService', () => {
  it('dedupes edges, resolves semantic objects, and skips missing targets', async () => {
    const operations: Array<Record<string, unknown>> = []
    const rowsByTable: Record<string, Array<Record<string, unknown>>> = {
      space_semantic_objects: [
        {
          id: 'object-a',
          scope_type: 'personal',
          user_id: 'user-1',
          org_id: null,
          space_id: 'space-1',
          campaign_id: null,
          source_type: 'space',
          source_id: 'space-1',
        },
        {
          id: 'object-b',
          scope_type: 'personal',
          user_id: 'user-1',
          org_id: null,
          space_id: 'space-1',
          campaign_id: null,
          source_type: 'space_doc',
          source_id: 'doc-1',
        },
      ],
    }
    const supabase = {
      from: (table: string) => ({
        select: () => new QueryBuilder(table, rowsByTable[table] ?? [], operations),
        insert: async (payload: Record<string, unknown>) => {
          operations.push({ table, action: 'insert', payload })
          return { error: null }
        },
      }),
    } as any

    const result = await new SpaceSemanticEdgeWriterService().insertEdges(supabase, [
      {
        fromSourceType: 'space',
        fromSourceId: 'space-1',
        toSourceType: 'space_doc',
        toSourceId: 'doc-1',
        edgeType: 'contains_doc',
      },
      {
        fromSourceType: 'space',
        fromSourceId: 'space-1',
        toSourceType: 'space_doc',
        toSourceId: 'doc-1',
        edgeType: 'contains_doc',
      },
      {
        fromSourceType: 'space',
        fromSourceId: 'space-1',
        toSourceType: 'space_doc',
        toSourceId: 'missing',
        edgeType: 'contains_doc',
      },
    ])

    expect(result).toEqual({ written: 1 })
    expect(operations.filter((operation) => operation.action === 'insert')).toHaveLength(1)
    expect(operations.find((operation) => operation.action === 'insert')?.payload).toMatchObject({
      from_object_id: 'object-a',
      to_object_id: 'object-b',
      edge_type: 'contains_doc',
      edge_class: 'structural',
    })
  })
})
