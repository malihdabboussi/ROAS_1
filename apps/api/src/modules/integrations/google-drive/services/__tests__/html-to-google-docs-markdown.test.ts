import { describe, expect, it } from 'vitest'
import { htmlToGoogleDocsMarkdown } from '../html-to-google-docs-markdown'

describe('htmlToGoogleDocsMarkdown', () => {
  it('converts headings, marks, lists, and tables used by space docs', () => {
    const html = `<!DOCTYPE html>
<html><body>
<h1>WEB#4 — Market Research</h1>
<p><strong>Client:</strong> Impact Elite Coaching</p>
<ul><li>Buyer language</li><li><em>Patterns</em></li></ul>
<table>
  <tr><th>Service</th><th>Outcome</th></tr>
  <tr><td><code>ads_intelligence</code></td><td>Blocked</td></tr>
</table>
<p>See <a href="https://example.com">source</a>.</p>
</body></html>`

    expect(htmlToGoogleDocsMarkdown(html)).toBe(
      [
        '# WEB#4 — Market Research',
        '',
        '**Client:** Impact Elite Coaching',
        '',
        '- Buyer language',
        '- *Patterns*',
        '',
        '| Service | Outcome |',
        '| --- | --- |',
        '| `ads_intelligence` | Blocked |',
        '',
        'See [source](https://example.com).',
      ].join('\n'),
    )
  })
})
