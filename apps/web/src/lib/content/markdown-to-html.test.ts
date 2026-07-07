import { describe, expect, it } from 'vitest'
import { markdownToHtml } from './markdown-to-html'

describe('markdownToHtml', () => {
  it('returns null for empty content', () => {
    expect(markdownToHtml(null)).toBeNull()
    expect(markdownToHtml(undefined)).toBeNull()
    expect(markdownToHtml('')).toBeNull()
  })

  it('keeps existing html untouched', () => {
    expect(markdownToHtml('<section><p>Ready</p></section>')).toBe(
      '<section><p>Ready</p></section>',
    )
  })

  it('converts markdown with line breaks to html', () => {
    const html = markdownToHtml('# Title\nfirst\nsecond')

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('first<br>second')
  })
})
