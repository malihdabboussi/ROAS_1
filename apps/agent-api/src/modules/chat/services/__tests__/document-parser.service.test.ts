import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentParserService } from '../document-parser.service'

describe('DocumentParserService', () => {
  let service: DocumentParserService

  beforeEach(() => {
    service = new DocumentParserService()
  })

  describe('parse - validation', () => {
    it('should reject files over 1GB', async () => {
      const bigBuffer = { length: 1024 * 1024 * 1024 + 1 } as Buffer
      await expect(service.parse(bigBuffer, 'big.pdf', 'application/pdf')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should return unknown file types without extraction', async () => {
      const buf = Buffer.from('test')
      const [result] = await service.parse(buf, 'file.exe', 'application/octet-stream')

      expect(result.filename).toBe('file.exe')
      expect(result.mimeType).toBe('application/octet-stream')
      expect(result.type).toBe('text')
      expect(result.sizeBytes).toBe(buf.length)
      expect(result.text).toBeUndefined()
    })
  })

  describe('parse - text files', () => {
    it('should parse plain text files', async () => {
      const content = 'Hello world, this is a test document.'
      const buf = Buffer.from(content)
      const [result] = await service.parse(buf, 'test.txt', 'text/plain')

      expect(result.type).toBe('text')
      expect(result.text).toBe(content)
      expect(result.filename).toBe('test.txt')
      expect(result.mimeType).toBe('text/plain')
      expect(result.preview).toBe(content)
    })

    it('should parse markdown files', async () => {
      const content = '# Hello\n\nThis is markdown.'
      const buf = Buffer.from(content)
      const [result] = await service.parse(buf, 'doc.md', 'text/markdown')

      expect(result.type).toBe('text')
      expect(result.text).toBe(content)
    })

    it('should parse data files as text', async () => {
      const cases = [
        ['data.json', 'application/json', '{"ok":true}'],
        ['config.yaml', 'application/x-yaml', 'enabled: true'],
        ['rows.tsv', 'text/tab-separated-values', 'name\tvalue\nAcme\t1'],
        ['feed.xml', 'application/xml', '<feed><item>Acme</item></feed>'],
      ] as const

      for (const [filename, mimeType, content] of cases) {
        const [result] = await service.parse(Buffer.from(content), filename, mimeType)

        expect(result.type).toBe('text')
        expect(result.text).toBe(content)
        expect(result.mimeType).toBe(mimeType)
      }
    })

    it('should truncate text longer than 50k chars', async () => {
      const content = 'x'.repeat(60000)
      const buf = Buffer.from(content)
      const [result] = await service.parse(buf, 'long.txt', 'text/plain')

      expect(result.text!.length).toBeLessThan(60000)
      expect(result.text).toContain('[...truncated')
    })
  })

  describe('parse - images', () => {
    it('should return dataUrl for PNG', async () => {
      const buf = Buffer.from('fake-png-data')
      const [result] = await service.parse(buf, 'image.png', 'image/png')

      expect(result.type).toBe('image')
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/)
      expect(result.text).toBeUndefined()
    })

    it('should return dataUrl for JPEG', async () => {
      const buf = Buffer.from('fake-jpg-data')
      const [result] = await service.parse(buf, 'photo.jpg', 'image/jpeg')

      expect(result.type).toBe('image')
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/)
    })

    it('should support all image types', async () => {
      const buf = Buffer.from('data')
      for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
        const [result] = await service.parse(buf, 'img', mime)
        expect(result.type).toBe('image')
      }
    })
  })

  describe('parse - supported text types', () => {
    it('should accept PDF mime type', async () => {
      // PDF parsing will fail without valid PDF content, but it should attempt
      const buf = Buffer.from('not a real pdf')
      await expect(service.parse(buf, 'doc.pdf', 'application/pdf')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should accept DOCX mime type', async () => {
      const buf = Buffer.from('not a real docx')
      await expect(
        service.parse(
          buf,
          'doc.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('should extract PPTX text through DocumentExtractionService', async () => {
      const extraction = {
        extractText: vi.fn().mockResolvedValue('Slide 1\nTitle\nBody copy'),
      }
      const pptxService = new DocumentParserService(undefined, extraction as any)
      const buf = Buffer.from('pptx-binary')

      const [result] = await pptxService.parse(
        buf,
        'deck.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )

      expect(extraction.extractText).toHaveBeenCalledWith(
        buf,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'deck.pptx',
        undefined,
      )
      expect(result.type).toBe('text')
      expect(result.text).toContain('Slide 1')
      expect(result.preview).toContain('Slide 1')
    })

    it('should parse macro-enabled Excel mime type', async () => {
      const mod = await import('xlsx')
      const XLSX = mod.default ?? mod
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Name', 'Revenue'],
        ['Acme', 1200],
      ])
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

      const [result] = await service.parse(
        buf,
        'revenue.xlsm',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
      )

      expect(result.type).toBe('text')
      expect(result.text).toContain('--- Sheet: Sheet1 ---')
      expect(result.text).toContain('Acme')
      expect(result.mimeType).toBe('application/vnd.ms-excel.sheet.macroEnabled.12')
    })
  })
})
