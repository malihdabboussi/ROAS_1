import { describe, expect, it, vi } from 'vitest'
import { extractText, getDocumentProxy } from 'unpdf'
import { DocumentExtractionService } from '../document-extraction.service'

vi.mock('unpdf', () => ({
  extractText: vi.fn(),
  getDocumentProxy: vi.fn(),
}))

describe('DocumentExtractionService', () => {
  const createService = (geminiOcr: {
    extractTextFromImage: ReturnType<typeof vi.fn>
    extractTextFromDocument?: ReturnType<typeof vi.fn>
  }) => new DocumentExtractionService(geminiOcr as any, { report: vi.fn() } as any)

  it('OCRs low-signal native PDF text instead of returning watermark text', async () => {
    const geminiOcr = {
      extractTextFromImage: vi.fn(),
      extractTextFromDocument: vi.fn().mockResolvedValue('Actual OCR text from scanned pages'),
    }
    const service = createService(geminiOcr)
    vi.mocked(getDocumentProxy).mockResolvedValueOnce({ numPages: 10 } as any)
    vi.mocked(extractText).mockResolvedValueOnce({
      text: Array.from({ length: 10 }, () => 'Made with Vibey').join('\n'),
    } as any)

    const result = await service.extractText(Buffer.from([1, 2, 3]), 'application/pdf', 'scan.pdf')

    expect(geminiOcr.extractTextFromDocument).toHaveBeenCalledWith(
      expect.any(Buffer),
      'application/pdf',
      'scan.pdf',
      undefined,
    )
    expect(result).toBe('Actual OCR text from scanned pages')
  })

  const createImageOnlyService = (geminiOcr: { extractTextFromImage: ReturnType<typeof vi.fn> }) =>
    new DocumentExtractionService(geminiOcr as any, { report: vi.fn() } as any)

  it('routes image files to Gemini OCR', async () => {
    const geminiOcr = { extractTextFromImage: vi.fn().mockResolvedValue('OCR text') }
    const service = createImageOnlyService(geminiOcr)

    const result = await service.extractText(Buffer.from([1, 2, 3]), 'image/png', 'scan.png')

    expect(geminiOcr.extractTextFromImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/png',
      'scan.png',
      undefined,
    )
    expect(result).toBe('OCR text')
  })

  it('routes image extension with octet-stream to Gemini OCR', async () => {
    const geminiOcr = { extractTextFromImage: vi.fn().mockResolvedValue('OCR text') }
    const service = createImageOnlyService(geminiOcr)

    const result = await service.extractText(
      Buffer.from([1, 2, 3]),
      'application/octet-stream',
      'scan.jpeg',
    )

    expect(geminiOcr.extractTextFromImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/jpeg',
      'scan.jpeg',
      undefined,
    )
    expect(result).toBe('OCR text')
  })

  it('throws for unsupported file types', async () => {
    const geminiOcr = { extractTextFromImage: vi.fn() }
    const service = createImageOnlyService(geminiOcr)

    await expect(
      service.extractText(Buffer.from([1]), 'application/zip', 'archive.zip'),
    ).rejects.toThrow('Unsupported document type')
  })

  it('extracts spreadsheet text from macro-enabled Excel files', async () => {
    const geminiOcr = { extractTextFromImage: vi.fn() }
    const service = createImageOnlyService(geminiOcr)
    const mod = await import('xlsx')
    const XLSX = mod.default ?? mod
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Revenue'],
      ['Acme', 1200],
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const result = await service.extractText(
      buffer,
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'revenue.xlsm',
    )

    expect(result).toContain('--- Sheet: Sheet1 ---')
    expect(result).toContain('Acme')
  })
})
