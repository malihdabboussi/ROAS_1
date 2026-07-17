import { describe, expect, it } from 'vitest'
import {
  looksLikeDeliverableHtml,
  resolveDeliverablePreviewHtml,
} from './DeliverableHtmlPreview'

describe('DeliverableHtmlPreview helpers', () => {
  it('detects HTML one-pagers from mission agents', () => {
    expect(looksLikeDeliverableHtml('<h1>THE PLAN</h1><p>Ready</p>')).toBe(true)
    expect(looksLikeDeliverableHtml('# Pre-Call Strategy Map\n\n**Client:** Acme')).toBe(false)
  })

  it('passes HTML through and converts markdown to HTML', () => {
    const html = '<h1>Strategy v2</h1><p>Locked</p>'
    expect(resolveDeliverablePreviewHtml(html)).toBe(html)
    const fromMd = resolveDeliverablePreviewHtml('# Hello\n\nWorld')
    expect(fromMd).toContain('<h1')
    expect(fromMd).toContain('Hello')
  })
})
