import { describe, expect, it } from 'vitest'
import type { BrainMemory } from '../types'
import {
  knowledgeSourceSupportsPreview,
  resolveKnowledgeSourcePreviewProps,
} from './knowledge-source-preview'

function knowledgeNode(overrides: Partial<BrainMemory>): BrainMemory {
  return {
    id: 'node-1',
    content: 'Summary text',
    memory_type: 'presentation',
    source_type: 'presentation',
    significance: 0.65,
    confidence: 1,
    tags: [],
    recalled_count: 0,
    created_at: '2026-05-28T10:00:00.000Z',
    updated_at: '2026-05-28T10:00:00.000Z',
    node_type: 'knowledge_item',
    knowledge_scope: 'space',
    ...overrides,
  }
}

describe('resolveKnowledgeSourcePreviewProps', () => {
  it('maps presentation sources to presentation preview props', () => {
    const props = resolveKnowledgeSourcePreviewProps(
      knowledgeNode({
        source_id: 'pres-1',
        knowledge_source_type: 'presentation',
        name: 'Launch deck',
      }),
    )

    expect(props).toEqual({
      artifactType: 'presentation',
      artifactId: 'pres-1',
      name: 'Launch deck',
      spaceId: undefined,
      funnelPageId: undefined,
      bodyPreview: 'Summary text',
      emailSubject: undefined,
      imageUrl: undefined,
      subtitle: undefined,
    })
  })

  it('maps funnel pages to funnel preview with page id', () => {
    const props = resolveKnowledgeSourcePreviewProps(
      knowledgeNode({
        source_id: 'page-1',
        parent_id: 'funnel-1',
        knowledge_source_type: 'funnel_page',
        source_title: 'Opt-in page',
      }),
    )

    expect(props).toMatchObject({
      artifactType: 'funnel',
      artifactId: 'funnel-1',
      funnelPageId: 'page-1',
      name: 'Opt-in page',
    })
  })

  it('requires space id for visual doc previews', () => {
    expect(
      resolveKnowledgeSourcePreviewProps(
        knowledgeNode({
          source_id: 'doc-1',
          knowledge_source_type: 'space_doc',
        }),
      ),
    ).toBeNull()

    expect(
      resolveKnowledgeSourcePreviewProps(
        knowledgeNode({
          source_id: 'doc-1',
          knowledge_source_type: 'space_doc',
          space_id: 'space-1',
        }),
      ),
    ).toMatchObject({
      artifactType: 'visual-doc',
      artifactId: 'doc-1',
      spaceId: 'space-1',
    })
  })

  it('detects media asset preview support', () => {
    expect(
      knowledgeSourceSupportsPreview(
        knowledgeNode({
          knowledge_source_type: 'media_asset',
          source_id: 'media-1',
        }),
      ),
    ).toBe(true)
  })
})
