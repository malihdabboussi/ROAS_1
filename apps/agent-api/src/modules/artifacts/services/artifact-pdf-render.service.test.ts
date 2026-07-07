import { describe, expect, it } from 'vitest'
import { ArtifactPdfRenderService } from './artifact-pdf-render.service'

describe('ArtifactPdfRenderService', () => {
  it('normalizes PDF layout, theme, image URLs, and file names', () => {
    const service = new ArtifactPdfRenderService()

    expect(service.normalizePdfLayout('16:9')).toBe('16:9')
    expect(service.normalizePdfLayout('letter')).toBe('A4')
    expect(service.normalizePdfPadding(4, 'A4')).toBe(16)
    expect(service.normalizePdfPadding(140, '16:9')).toBe(96)
    expect(service.normalizePdfImageUrls([
      ' https://cdn.example/a.png ',
      'https://cdn.example/a.png',
      'ftp://skip.example/a.png',
    ])).toEqual(['https://cdn.example/a.png'])
    expect(service.normalizePdfTheme({ primary: '#000000', text: 'bad' })).toMatchObject({
      primary: '#000000',
      text: '#111827',
      background: '#FFFFFF',
    })
    expect(service.normalizePdfFileName(' Launch Plan!!.PDF ', 'Fallback')).toBe(
      'launch-planpdf.pdf',
    )
  })

  it('detects HTML content and extracts styled PDF blocks', () => {
    const service = new ArtifactPdfRenderService() as any

    expect(service.detectHtmlContent('<h1>Launch</h1><p>Body</p>', 'markdown')).toBe('html')
    expect(service.detectHtmlContent('# Launch', 'markdown')).toBe('markdown')
    expect(service.extractImageUrlsFromContent(
      '![hero](https://cdn.example/hero.png)\n<img src="https://cdn.example/card.jpg">',
      'html',
    )).toEqual(['https://cdn.example/card.jpg'])
    expect(service.toStyledPdfBlocks(
      '# Launch\n\nIntro\n\n- First\n\n| A | B |\n|---|---|\n| 1 | 2 |',
      'markdown',
    )).toEqual([
      { type: 'heading', level: 1, text: 'Launch' },
      { type: 'paragraph', text: 'Intro' },
      { type: 'bullet', text: 'First' },
      { type: 'table', text: '', rows: [['A', 'B'], ['1', '2']] },
    ])
  })
})
