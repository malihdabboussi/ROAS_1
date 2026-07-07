import { afterEach, describe, expect, it, vi } from 'vitest'

describe('DocumentParserService low-signal PDF handling', () => {
  afterEach(() => {
    vi.doUnmock('pdf-parse')
    vi.resetModules()
  })

  it('OCRs non-empty low-signal PDF text', async () => {
    vi.doMock('pdf-parse', () => ({
      default: vi.fn().mockResolvedValue({
        text: Array.from({ length: 8 }, () => 'Made with Vibey').join('\n'),
      }),
    }))
    const { DocumentParserService } = await import('../document-parser.service')
    const ocr = {
      extractTextFromDocument: vi.fn().mockResolvedValue(
        [
          'OCR extracted a real scanned proposal with implementation details for a customer onboarding project.',
          'The document includes milestones, risks, budget notes, owner names, procurement context, launch timing, and approval requirements.',
          'It also lists customer segments, product assumptions, support dependencies, delivery phases, and follow-up actions.',
        ].join('\n'),
      ),
    }
    const service = new DocumentParserService(ocr as never)
    const parsed = await (
      service as unknown as {
        parsePdf: (
          buffer: Buffer,
          filename?: string,
          billing?: unknown,
          pageCount?: number,
        ) => Promise<{ text: string; documentIntelligence: { strategy: string } }>
      }
    ).parsePdf(Buffer.from('pdf'), 'scan.pdf', undefined, 8)

    expect(ocr.extractTextFromDocument).toHaveBeenCalled()
    expect(parsed.text).toContain('real scanned proposal')
    expect(parsed.documentIntelligence.strategy).toBe('ocr')
  })
})
