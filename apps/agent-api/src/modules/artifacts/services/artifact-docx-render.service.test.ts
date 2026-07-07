import { describe, expect, it } from 'vitest'
import { ArtifactDocxRenderService } from './artifact-docx-render.service'

describe('ArtifactDocxRenderService', () => {
  const service = new ArtifactDocxRenderService()

  it('normalizes docx filenames', () => {
    expect(service.normalizeDocxFileName('Launch Brief.docx', 'Ignored')).toBe('launch-brief.docx')
    expect(service.normalizeDocxFileName(undefined, 'Launch Brief')).toBe('launch-brief.docx')
  })

  it('detects html content when markdown format is declared', () => {
    expect(service.detectHtmlContent('<h1>Report</h1>', 'markdown')).toBe('html')
    expect(service.detectHtmlContent('# Report', 'markdown')).toBe('markdown')
  })

  it('generates docx bytes from markdown with GFM tables', async () => {
    const bytes = await service.generateDocxBytes({
      title: 'Report',
      content: '# Report\n\n| Field | Value |\n| ----- | ----- |\n| A | 1 |',
      contentFormat: 'markdown',
    })

    expect(bytes.length).toBeGreaterThan(0)
  })

  it('generates docx bytes from html and text', async () => {
    const htmlBytes = await service.generateDocxBytes({
      title: 'HTML Report',
      content: '<h1>Report</h1><p>Body</p>',
      contentFormat: 'html',
    })
    const textBytes = await service.generateDocxBytes({
      title: 'Text Report',
      content: 'First paragraph\n\nSecond paragraph',
      contentFormat: 'text',
    })

    expect(htmlBytes.length).toBeGreaterThan(0)
    expect(textBytes.length).toBeGreaterThan(0)
  })
})
