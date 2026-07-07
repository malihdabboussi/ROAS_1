import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SkController } from './sk.controller'

const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' as const }

describe('SkController extract-text asset refs', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts text from a supplied asset_ref URL without requiring a multipart file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn(() => 'application/pdf') },
      arrayBuffer: vi.fn(async () => Buffer.from('pdf-bytes').buffer),
    })
    vi.stubGlobal('fetch', fetchMock)
    const documentExtraction = { extractText: vi.fn().mockResolvedValue('Extracted') }
    const controller = new SkController(
      {} as never,
      documentExtraction as never,
      {} as never,
    )

    await expect(
      controller.extractText({ id: 'user-1' }, undefined as never, scope, {
        filename: 'notes.pdf',
        mimeType: 'application/pdf',
        asset_ref: {
          kind: 'vibey_asset',
          asset_id: 'asset-1',
          bucket_name: 'media',
          file_path: 'user-1/documents/notes.pdf',
          url: 'https://cdn.example/notes.pdf',
          mime_type: 'application/pdf',
          asset_type: 'document',
          name: 'notes.pdf',
          original_filename: 'notes.pdf',
          file_size: 10,
          campaign_id: null,
          space_id: null,
          org_id: 'org-1',
          source: 'upload',
          source_surface: 'brain',
        },
      } as never),
    ).resolves.toEqual({ text: 'Extracted' })

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/notes.pdf')
    expect(documentExtraction.extractText).toHaveBeenCalledWith(
      expect.any(Buffer),
      'application/pdf',
      'notes.pdf',
      expect.objectContaining({ userId: 'user-1', orgId: 'org-1' }),
    )
  })

  it('rejects asset refs without a usable URL', async () => {
    const controller = new SkController({} as never, {} as never, {} as never)

    await expect(
      controller.extractText({ id: 'user-1' }, undefined as never, scope, {
        asset_ref: { kind: 'vibey_asset', asset_id: 'asset-1', url: null },
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
