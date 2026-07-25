import { describe, expect, it } from 'vitest'
import type { FunnelElementTrace } from './comment-artifact-types'
import type { FunnelPageBundle } from './funnel-artifact-types'
import { applyFunnelDirectEdit } from './funnel-direct-edit'

const bundle = {
  entry_file: 'index.html',
  files: [
    {
      path: 'index.html',
      content:
        '<!doctype html><main><h1>Old headline</h1><img src="/old.jpg" alt="Old image"></main>',
      funnel_page_id: 'page-1',
    },
  ],
  shared_files: [],
} as unknown as FunnelPageBundle

function trace(overrides: Partial<FunnelElementTrace> = {}): FunnelElementTrace {
  return {
    funnel_id: 'funnel-1',
    funnel_page_id: 'page-1',
    anchor_id: null,
    dom_path: 'main > h1',
    tag_chain: ['main', 'h1'],
    text_snapshot: 'Old headline',
    bounds: null,
    slide_index: null,
    source_file: 'index.html',
    source_hint: '<h1>Old headline</h1>',
    ...overrides,
  }
}

describe('funnel direct edit', () => {
  it('replaces selected text and escapes HTML markup', () => {
    const result = applyFunnelDirectEdit(bundle, trace(), {
      type: 'text',
      value: 'New <headline>',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.content).toContain('New &lt;headline&gt;')
      expect(result.sourceHint).toBe('<h1>New &lt;headline&gt;</h1>')
    }
  })

  it('replaces a selected image source without changing another element', () => {
    const result = applyFunnelDirectEdit(
      bundle,
      trace({
        dom_path: 'main > img',
        tag_chain: ['main', 'img'],
        text_snapshot: null,
        source_hint: '<img src="/old.jpg" alt="Old image">',
        attributes: { src: '/old.jpg', alt: 'Old image', href: null },
      }),
      { type: 'attribute', name: 'src', value: 'https://cdn.example.com/new.jpg' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.content).toContain('src="https://cdn.example.com/new.jpg"')
      expect(result.content).toContain('alt="Old image"')
      expect(result.sourceHint).toContain('src="https://cdn.example.com/new.jpg"')
    }
  })

  it('adds missing alt text to a selected image', () => {
    const imageBundle = {
      ...bundle,
      files: [{ ...bundle.files[0]!, content: '<img src="/old.jpg">' }],
    } as FunnelPageBundle
    const result = applyFunnelDirectEdit(
      imageBundle,
      trace({
        dom_path: 'img',
        tag_chain: ['img'],
        text_snapshot: null,
        source_hint: '<img src="/old.jpg">',
      }),
      { type: 'attribute', name: 'alt', value: 'Product on a desk' },
    )

    expect(result.success).toBe(true)
    if (result.success) expect(result.content).toContain('alt="Product on a desk"')
  })

  it('refuses an attribute edit when the selected source hint is stale', () => {
    const result = applyFunnelDirectEdit(
      bundle,
      trace({ source_hint: '<img src="/missing.jpg">' }),
      { type: 'attribute', name: 'src', value: '/new.jpg' },
    )

    expect(result.success).toBe(false)
  })
})
