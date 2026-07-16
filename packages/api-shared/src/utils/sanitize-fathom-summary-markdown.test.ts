import { describe, expect, it } from 'vitest'
import {
  looksLikeFathomSummaryMarkdown,
  repairBrokenMarkdownLinks,
  sanitizeFathomSummaryMarkdown,
  stripMarkdownEmphasis,
  unwrapFathomProseLinks,
} from './sanitize-fathom-summary-markdown'

describe('sanitize-fathom-summary-markdown', () => {
  it('repairs newlines inserted mid-URL in markdown links', () => {
    const broken = `[Dylan is manually managing ops](https://fathom.video/share/abc?
tab=summary&timestamp=800.0)`
    expect(repairBrokenMarkdownLinks(broken)).toBe(
      '[Dylan is manually managing ops](https://fathom.video/share/abc?tab=summary&timestamp=800.0)',
    )
  })

  it('unwraps Fathom prose takeaway links to plain text', () => {
    const md =
      '- [Dylan is manually managing the entire ops side](https://fathom.video/share/abc?tab=summary&timestamp=800.0)'
    expect(unwrapFathomProseLinks(md)).toBe('- Dylan is manually managing the entire ops side')
  })

  it('keeps short timestamp chips intact', () => {
    const md = 'Quote [3:20](https://fathom.video/calls/123?timestamp=200)'
    expect(unwrapFathomProseLinks(md)).toBe(md)
  })

  it('strips bold stars used as emphasis', () => {
    expect(stripMarkdownEmphasis('- **Professional Wins:** Haroon resolved')).toBe(
      '- Professional Wins: Haroon resolved',
    )
    expect(stripMarkdownEmphasis('- **Haroon:** Resolved a critical domain')).toBe(
      '- Haroon: Resolved a critical domain',
    )
  })

  it('sanitizes a full Fathom summary into readable plain text', () => {
    const raw = `## Key Takeaways

### Scaling Challenges & Operational Overhaul
- [Dylan is manually managing the entire ops side of the business — onboarding, billing, support, and fulfillment](https://fathom.video/share/xyz?
tab=summary&timestamp=800.0)
- **Nate's Framework:** Nate introduced a growth model

## Action Items
- Ship the onboarding checklist`

    expect(sanitizeFathomSummaryMarkdown(raw)).toBe(`Key Takeaways

Scaling Challenges & Operational Overhaul
- Dylan is manually managing the entire ops side of the business — onboarding, billing, support, and fulfillment
- Nate's Framework: Nate introduced a growth model

Action Items
- Ship the onboarding checklist`)
  })

  it('detects unsanitized Fathom summaries and leftover bold markdown', () => {
    expect(
      looksLikeFathomSummaryMarkdown('- [Takeaway](https://fathom.video/share/x?timestamp=1)'),
    ).toBe(true)
    expect(looksLikeFathomSummaryMarkdown('- **Professional Wins:** text')).toBe(true)
    expect(looksLikeFathomSummaryMarkdown('Normal task notes')).toBe(false)
  })

  it('returns empty for blank input', () => {
    expect(sanitizeFathomSummaryMarkdown(null)).toBe('')
    expect(sanitizeFathomSummaryMarkdown('   ')).toBe('')
  })
})
