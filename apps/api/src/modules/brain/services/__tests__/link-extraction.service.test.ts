import { BadRequestException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkExtractionService } from '../link-extraction.service'

describe('LinkExtractionService', () => {
  let service: LinkExtractionService
  let geminiOcr: { extractTextFromImage: ReturnType<typeof vi.fn> }
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    geminiOcr = { extractTextFromImage: vi.fn() }
    service = new LinkExtractionService(geminiOcr as any)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('extracts web page content via fetch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () =>
        '<html><head><title>Web Title</title></head><body><p>Hello world article content.</p></body></html>',
    })

    const result = await service.extract('https://example.com/post')

    expect(result.sourceType).toBe('website')
    expect(result.title).toBe('Web Title')
    expect(result.text).toContain('Hello world article content.')
  })

  it('extracts image URL content via Gemini OCR', async () => {
    geminiOcr.extractTextFromImage.mockResolvedValueOnce('Detected text from image')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    })

    const result = await service.extract('https://example.com/assets/slide.png')

    expect(geminiOcr.extractTextFromImage).toHaveBeenCalledTimes(1)
    expect(geminiOcr.extractTextFromImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/png',
      'https://example.com/assets/slide.png',
      undefined,
    )
    expect(result).toEqual({
      title: 'slide.png',
      text: 'Detected text from image',
      sourceType: 'website',
    })
  })

  it('throws on invalid url', async () => {
    await expect(service.extract('https://')).rejects.toBeInstanceOf(BadRequestException)
  })
})
