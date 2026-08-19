import { describe, expect, it } from 'vitest'
import {
  clampGraphLimit,
  GRAPH_MAX_NODE_LIMIT,
  GRAPH_NODE_CONTENT_MAX_CHARS,
  slimGraphMemory,
} from './graph-node-window'

describe('clampGraphLimit', () => {
  it('leaves the default window to each graph path when no limit is requested', () => {
    expect(clampGraphLimit(undefined)).toEqual({ limit: undefined, capped: false })
    expect(clampGraphLimit(Number.NaN)).toEqual({ limit: undefined, capped: false })
    expect(clampGraphLimit(0)).toEqual({ limit: undefined, capped: false })
  })

  it('passes a normal request through', () => {
    expect(clampGraphLimit(500)).toEqual({ limit: 500, capped: false })
  })

  it('caps a full-load request so the response stays under the serverless payload limit', () => {
    expect(clampGraphLimit(10_000)).toEqual({ limit: GRAPH_MAX_NODE_LIMIT, capped: true })
  })
})

describe('slimGraphMemory', () => {
  it('caps content to the node-panel display length', () => {
    const slim = slimGraphMemory({
      id: 'm1',
      content: 'x'.repeat(GRAPH_NODE_CONTENT_MAX_CHARS + 50),
    })
    expect((slim.content as string).length).toBe(GRAPH_NODE_CONTENT_MAX_CHARS)
  })

  it('keeps only preview metadata keys and drops import bookkeeping', () => {
    const slim = slimGraphMemory({
      id: 'm1',
      content: 'short',
      metadata: {
        user_id: 'u1',
        import_source: 'fathom',
        temporal: { a: 1 },
        thumbnail_url: 'https://cdn/x.png',
        body: 'b'.repeat(900),
      },
    })
    expect(slim.metadata).toEqual({
      thumbnail_url: 'https://cdn/x.png',
      body: 'b'.repeat(500),
    })
  })

  it('returns null metadata when nothing previewable remains', () => {
    expect(slimGraphMemory({ id: 'm1', metadata: { user_id: 'u1' } }).metadata).toBeNull()
    expect(slimGraphMemory({ id: 'm1', metadata: null }).metadata).toBeNull()
  })

  it('leaves every other memory field untouched', () => {
    const slim = slimGraphMemory({ id: 'm1', significance: 0.9, tags: ['a'], created_at: 't' })
    expect(slim).toMatchObject({ id: 'm1', significance: 0.9, tags: ['a'], created_at: 't' })
  })
})
