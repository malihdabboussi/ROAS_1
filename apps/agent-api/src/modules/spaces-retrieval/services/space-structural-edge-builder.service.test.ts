import { describe, expect, it, vi } from 'vitest'
import { SpaceStructuralEdgeBuilderService } from './space-structural-edge-builder.service'

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

  maybeSingle() {
    const row =
      this.rows.find((candidate) =>
        this.filters.every((filter) => candidate[filter.key] === filter.value),
      ) ?? null
    return Promise.resolve({ data: row, error: null })
  }
}

describe('SpaceStructuralEdgeBuilderService', () => {
  it('links Space docs under their canonical Space view when the view exists', async () => {
    const writer = {
      replaceStructuralEdgesForSource: vi.fn(async (_supa, _sourceType, _sourceId, edges) => ({
        written: edges.length,
      })),
    } as any
    const supabase = {
      from: (table: string) =>
        new QueryBuilder(
          table === 'spaces'
            ? [
                {
                  id: 'space-1',
                  schema: { views: [{ id: 'docs-view', type: 'docs', name: 'Docs' }] },
                },
              ]
            : [],
        ),
    } as any

    const result = await new SpaceStructuralEdgeBuilderService(
      writer,
    ).replaceStructuralEdgesForSource(
      supabase,
      {
        sourceType: 'space_doc',
        sourceId: 'doc-1',
        title: 'Launch doc',
        content: 'Launch detail',
        userId: 'user-1',
        spaceId: 'space-1',
      },
      { id: 'doc-1', custom_data: {} },
    )

    expect(result).toEqual({ written: 1 })
    expect(writer.replaceStructuralEdgesForSource).toHaveBeenCalledWith(
      supabase,
      'space_doc',
      'doc-1',
      [
        expect.objectContaining({
          fromSourceType: 'space_view',
          fromSourceId: 'space-1:docs-view',
          toSourceType: 'space_doc',
          toSourceId: 'doc-1',
          edgeType: 'contains_doc',
        }),
      ],
    )
  })
})
