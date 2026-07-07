import { describe, expect, it, vi } from 'vitest'
import type { SpaceSemanticEdgeInput } from './space-semantic-edge.types'
import { SpaceStructuralEdgeBuilderService } from './services/space-structural-edge-builder.service'

function buildService(views: Array<Record<string, unknown>>) {
  let captured: SpaceSemanticEdgeInput[] = []
  const writer = {
    replaceStructuralEdgesForSource: vi.fn(
      async (_sb: unknown, _st: string, _sid: string, edges: SpaceSemanticEdgeInput[]) => {
        captured = edges
        return { written: edges.length }
      },
    ),
  }
  const repository = {
    getSpaceSchema: vi.fn(async () => ({ data: { schema: { views } }, error: null })),
  }
  const service = new SpaceStructuralEdgeBuilderService(writer as any, repository as any)
  return { service, writer, repository, edges: () => captured }
}

const docAsset = {
  sourceType: 'space_doc',
  sourceId: 'doc-1',
  spaceId: 'space-1',
  campaignId: 'campaign-1',
  parentType: null,
  parentId: null,
}

describe('SpaceStructuralEdgeBuilderService view membership', () => {
  it('links a doc under its Space view and suppresses the direct Space edge', async () => {
    const { service, edges } = buildService([{ id: 'docs', type: 'docs', name: 'Docs' }])

    await service.replaceStructuralEdgesForSource({} as any, docAsset, { custom_data: null })

    const built = edges()
    const viewEdge = built.find((e) => e.fromSourceType === 'space_view')
    expect(viewEdge).toMatchObject({
      fromSourceType: 'space_view',
      fromSourceId: 'space-1:docs',
      toSourceType: 'space_doc',
      toSourceId: 'doc-1',
      edgeType: 'contains_doc',
    })
    // Clean Space → View → Item hierarchy: no direct Space → Item edge.
    expect(built.some((e) => e.fromSourceType === 'space')).toBe(false)
  })

  it('keeps the direct Space edge when the space has no matching view', async () => {
    const { service, edges } = buildService([{ id: 'kanban', type: 'kanban', name: 'Board' }])

    await service.replaceStructuralEdgesForSource({} as any, docAsset, { custom_data: null })

    const built = edges()
    expect(built.some((e) => e.fromSourceType === 'space_view')).toBe(false)
    expect(built.find((e) => e.fromSourceType === 'space')).toMatchObject({
      fromSourceType: 'space',
      fromSourceId: 'space-1',
      toSourceType: 'space_doc',
      toSourceId: 'doc-1',
      edgeType: 'contains_doc',
    })
  })
})
