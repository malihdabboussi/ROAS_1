import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceAssetIndexRegistry } from './space-asset-index.registry'
import { SpaceAssetIndexService } from './space-asset-index.service'

class QueryBuilder {
  private filters: Array<{ key: string; value: unknown }> = []

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select() {
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value })
    return this
  }

  limit() {
    return this
  }

  maybeSingle() {
    const row =
      this.rows.find((candidate) =>
        this.filters.every((filter) => this.valueFor(candidate, filter.key) === filter.value),
      ) ?? null
    return Promise.resolve({ data: row, error: null })
  }

  private valueFor(row: Record<string, unknown>, key: string): unknown {
    if (key === 'custom_data->>_source_id') {
      const customData = row.custom_data as Record<string, unknown> | undefined
      return customData?._source_id
    }
    return row[key]
  }
}

describe('SpaceAssetIndexService', () => {
  afterEach(() => {
    delete process.env.SPACE_ASSET_INDEXING
    delete process.env.SPACE_SEMANTIC_RETRIEVAL
  })

  it('enriches conversation documents with linked Space item parent context before indexing', async () => {
    process.env.SPACE_ASSET_INDEXING = '1'
    const writer = {
      deleteSource: vi.fn(),
      replaceSource: vi.fn(async () => ({ indexed: 1, skipped: 0 })),
    } as any
    const structuralEdges = {
      replaceStructuralEdgesForSource: vi.fn(async () => ({ written: 1 })),
    } as any
    const rowsByTable: Record<string, Array<Record<string, unknown>>> = {
      conversation_documents: [
        {
          id: 'doc-1',
          title: 'Launch notes',
          content: { summary: 'Use the $49 launch price.' },
          user_id: 'user-1',
          org_id: null,
        },
      ],
      space_items: [
        {
          id: 'space-item-1',
          space_id: 'space-1',
          org_id: 'org-1',
          parent_item_id: null,
          custom_data: { _source_id: 'doc-1' },
        },
      ],
    }
    const supabase = {
      from: (table: string) => new QueryBuilder(rowsByTable[table] ?? []),
    } as any

    const result = await new SpaceAssetIndexService(
      new SpaceAssetIndexRegistry(),
      writer,
      structuralEdges,
    ).indexSource(supabase, {
      sourceType: 'conversation_document',
      sourceId: 'doc-1',
      userId: 'user-1',
    })

    expect(result).toEqual({
      indexed: 1,
      skipped: 0,
      source_type: 'conversation_document',
      source_id: 'doc-1',
    })
    expect(writer.replaceSource).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        sourceType: 'conversation_document',
        sourceId: 'doc-1',
        spaceId: 'space-1',
        orgId: 'org-1',
        parentType: 'space_doc',
        parentId: 'space-item-1',
      }),
    )
    expect(structuralEdges.replaceStructuralEdgesForSource).toHaveBeenCalled()
  })
})
