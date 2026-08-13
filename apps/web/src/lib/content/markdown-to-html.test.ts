import { describe, expect, it } from 'vitest'
import { markdownToHtml } from './markdown-to-html'

describe('markdownToHtml', () => {
  it('returns null for empty content', () => {
    expect(markdownToHtml(null)).toBeNull()
    expect(markdownToHtml(undefined)).toBeNull()
    expect(markdownToHtml('')).toBeNull()
  })

  it('keeps semantic html untouched', () => {
    expect(markdownToHtml('<section><h1>Ready</h1><p>Go</p></section>')).toBe(
      '<section><h1>Ready</h1><p>Go</p></section>',
    )
  })

  it('converts markdown with line breaks to html', () => {
    const html = markdownToHtml('# Title\nfirst\nsecond')

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('first<br>second')
  })

  it('unwraps markdown dumped into a pre block', () => {
    const html = markdownToHtml('<pre style="white-space:pre-wrap"># Title\n\n**Bold** line</pre>')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).not.toContain('<pre')
  })

  it('unwraps markdown left inside a single paragraph with br breaks', () => {
    const html = markdownToHtml(
      '<p># Title<br><br>## Section<br><br>Impact Elite sells **coaching**</p>',
    )
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<h2>Section</h2>')
    expect(html).toContain('<strong>coaching</strong>')
  })

  it('repairs markdown paragraphs inside otherwise-semantic recap html', () => {
    const html = markdownToHtml(
      '<h1>Recap</h1><section><h2>Summary</h2><p>## Key Takeaways<br><br>- **Benefit:** Clear ownership</p></section>',
    )
    expect(html).toContain('<h2>Key Takeaways</h2>')
    expect(html).toContain('<strong>Benefit:</strong>')
    expect(html).not.toContain('## Key Takeaways')
  })
})
