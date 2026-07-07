import { describe, expect, it } from 'vitest'
import { assembleFunnelHtml, extractFunnelBundleHeadMeta } from './assemble-funnel-html'
import type { FunnelPageBundle } from './resolve-funnel-bundle'

function makeBundle(overrides?: Partial<FunnelPageBundle>): FunnelPageBundle {
  return {
    files: [
      {
        path: 'index.html',
        content:
          '<!doctype html><html><head><title>Free Guide</title><meta name="description" content="Get the guide" /><link rel="stylesheet" href="styles.css"></head><body><h1>Hello</h1><img src="assets/logo.png" /><script src="page.js"></script></body></html>',
        mime_type: 'text/html',
        role: 'entry',
        funnel_page_id: 'page-1',
      },
      {
        path: 'styles.css',
        content: '.hero { background: url(assets/logo.png); }',
        mime_type: 'text/css',
        role: 'style',
        funnel_page_id: 'page-1',
      },
      {
        path: 'page.js',
        content: 'console.log("hi")',
        mime_type: 'text/javascript',
        role: 'script',
        funnel_page_id: 'page-1',
      },
    ],
    sharedFiles: [
      {
        path: 'shared/styles.css',
        content: ':root { --color-primary: #10b981; }',
        mime_type: 'text/css',
        role: 'style',
        funnel_page_id: null,
      },
      {
        path: 'shared/nav.html',
        content: '<header><a href="/">Home</a></header>',
        mime_type: 'text/html',
        role: 'source',
        funnel_page_id: null,
      },
    ],
    assets: [
      {
        path: 'assets/logo.png',
        mime_type: 'image/png',
        role: 'image',
        url: 'https://cdn/logo.png',
      },
    ],
    hasEntry: true,
    ...overrides,
  }
}

describe('assembleFunnelHtml', () => {
  it('extracts body, inlines scripts, rewrites assets, and collects CSS', () => {
    const assembled = assembleFunnelHtml(makeBundle())
    expect(assembled).not.toBeNull()
    expect(assembled!.bodyHtml).toContain('<h1>Hello</h1>')
    expect(assembled!.bodyHtml).not.toContain('<head')
    expect(assembled!.bodyHtml).toContain('https://cdn/logo.png')
    expect(assembled!.bodyHtml).toContain('data-vibey-source="page.js"')
    expect(assembled!.bodyHtml).toContain('console.log("hi")')
    // Shared CSS first, then page CSS, both asset-rewritten.
    expect(assembled!.css.indexOf('--color-primary')).toBeLessThan(assembled!.css.indexOf('.hero'))
    expect(assembled!.css).toContain('https://cdn/logo.png')
    expect(assembled!.title).toBe('Free Guide')
    expect(assembled!.description).toBe('Get the guide')
    expect(assembled!.navHtml).toContain('<header>')
    expect(assembled!.footerHtml).toBeNull()
  })

  it('returns null without an index.html entry', () => {
    const assembled = assembleFunnelHtml(makeBundle({ files: [], hasEntry: false }))
    expect(assembled).toBeNull()
  })

  it('renders fragment entries without a body wrapper', () => {
    const assembled = assembleFunnelHtml(
      makeBundle({
        files: [
          {
            path: 'index.html',
            content: '<section class="slide"><h1>Fragment</h1></section>',
            mime_type: 'text/html',
            role: 'entry',
            funnel_page_id: 'page-1',
          },
        ],
      }),
    )
    expect(assembled!.bodyHtml).toContain('<h1>Fragment</h1>')
    expect(assembled!.title).toBeNull()
  })
})

describe('extractFunnelBundleHeadMeta', () => {
  it('reads title and description from the entry head', () => {
    expect(extractFunnelBundleHeadMeta(makeBundle())).toEqual({
      title: 'Free Guide',
      description: 'Get the guide',
    })
  })

  it('returns nulls when no entry exists', () => {
    expect(extractFunnelBundleHeadMeta(makeBundle({ files: [] }))).toEqual({
      title: null,
      description: null,
    })
  })
})
