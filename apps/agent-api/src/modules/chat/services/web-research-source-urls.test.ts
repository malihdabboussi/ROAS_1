import { describe, expect, it } from 'vitest'
import { extractWebResearchSourceUrls } from './web-research-source-urls'

describe('extractWebResearchSourceUrls', () => {
  it('collects search result URLs and fetch args', () => {
    expect(
      extractWebResearchSourceUrls('web_search', {
        results: [
          { title: 'Market report', url: 'https://example.com/report' },
          { title: 'Dup', url: 'https://example.com/report' },
        ],
      }),
    ).toEqual([{ url: 'https://example.com/report', title: 'Market report' }])

    expect(
      extractWebResearchSourceUrls(
        'web_fetch',
        { url: 'https://example.com/page' },
        { url: 'https://example.com/page' },
      ),
    ).toEqual([{ url: 'https://example.com/page', title: 'https://example.com/page' }])
  })

  it('ignores non-research tools', () => {
    expect(
      extractWebResearchSourceUrls('search_campaign_brain', {
        results: [{ url: 'https://example.com' }],
      }),
    ).toEqual([])
  })
})
