import { describe, expect, it, vi } from 'vitest'
import { MediaIndexerService } from '../media-indexer.service'

const embedding = Array.from({ length: 768 }, () => 0.01)

describe('MediaIndexerService', () => {
  it('does not chunk low-signal native PDF text and stores OCR text instead', async () => {
    const asset = {
      id: 'asset-ocr',
      user_id: 'user-1',
      org_id: null,
      campaign_id: null,
      name: 'scan.pdf',
      original_filename: 'scan.pdf',
      mime_type: 'application/pdf',
    }
    const reader = {
      getAssetMetadata: vi.fn().mockResolvedValue(asset),
      downloadBuffer: vi.fn().mockResolvedValue({ buffer: Buffer.from('pdf-binary') }),
      countPdfPages: vi.fn().mockResolvedValue(10),
      extractPdfText: vi
        .fn()
        .mockResolvedValue(Array.from({ length: 10 }, () => 'Made with Vibey').join('\n')),
      getPagesFromPdf: vi.fn(),
    }
    const mediaRepository = {
      updateAssetIndex: vi.fn().mockResolvedValue({ error: null }),
      deleteAssetChunks: vi.fn().mockResolvedValue({ error: null }),
      insertAssetChunks: vi.fn().mockResolvedValue({ error: null }),
    }
    const documentExtraction = {
      extractText: vi.fn().mockResolvedValue(
        [
          'This scanned PDF contains real customer interview notes from enterprise buyers.',
          'It includes pricing objections, onboarding requirements, support constraints, and launch risks.',
          'Stakeholders discussed implementation owners, timeline tradeoffs, budget approval, procurement steps, and measurement plans.',
          'The summary should focus on user problems, market timing, sales enablement, customer success, and next actions.',
        ].join('\n\n'),
      ),
    }
    const config = { get: vi.fn().mockReturnValue('gemini-key') }
    const errorReporter = { report: vi.fn() }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: embedding } }),
    } as Response)
    const service = new MediaIndexerService(
      config as never,
      reader as never,
      mediaRepository as never,
      errorReporter as never,
      documentExtraction as never,
    )

    await service.indexAsset('asset-ocr')

    expect(reader.getPagesFromPdf).not.toHaveBeenCalled()
    expect(documentExtraction.extractText).toHaveBeenCalled()
    const readyPatch = mediaRepository.updateAssetIndex.mock.calls.at(-1)?.[1]
    expect(readyPatch.text_layer).toContain('real customer interview notes')
    expect(readyPatch.text_layer).not.toContain('Made with Vibey')
    expect(readyPatch.document_intelligence.strategy).toBe('ocr')
    expect(mediaRepository.insertAssetChunks).toHaveBeenCalled()
    expect(mediaRepository.insertAssetChunks.mock.calls[0]?.[0][0].content).toContain(
      'real customer interview notes',
    )

    fetchSpy.mockRestore()
  })
})
