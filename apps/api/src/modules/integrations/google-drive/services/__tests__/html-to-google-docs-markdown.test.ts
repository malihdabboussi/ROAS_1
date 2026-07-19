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

  it('keeps TipTap hard breaks as separate lines so field labels do not collapse', () => {
    const html = `<p><strong>Webinar title:</strong> Make This Your Year<br><strong>Webinar date:</strong> Tuesday, July 22 · 10am PT<br><strong>Event:</strong> The LAB</p>
<p><strong>Subject line:</strong> We're doing something we've never done before<br><strong>Preview:</strong> Four operators. One room.</p>
<div><strong>Contents:</strong><br>1. Webinar Title<br>2. Email + SMS</div>`

    expect(htmlToGoogleDocsMarkdown(html)).toBe(
      [
        '**Webinar title:** Make This Your Year',
        '',
        '**Webinar date:** Tuesday, July 22 · 10am PT',
        '',
        '**Event:** The LAB',
        '',
        "**Subject line:** We're doing something we've never done before",
        '',
        '**Preview:** Four operators. One room.',
        '',
        '**Contents:**',
        '',
        '1. Webinar Title',
        '',
        '2. Email + SMS',
      ].join('\n'),
    )
  })
})