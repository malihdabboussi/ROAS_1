import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaRepository } from '../../repositories/media.repository'
import { MediaReaderService } from '../media-reader.service'

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  createSignedUrl: vi.fn(),
  download: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.maybeSingle,
    }),
    storage: {
      from: () => ({
        createSignedUrl: mocks.createSignedUrl,
        download: mocks.download,
      }),
    },
  }),
}))

function createService() {
  const repository = new MediaRepository({
    get: vi.fn((key: string) =>
      key === 'SUPABASE_URL' ? 'https://supabase.example.com' : 'service-role',
    ),
  } as never)
  return new MediaReaderService(repository)
}

describe('MediaReaderService', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.createSignedUrl.mockReset()
    mocks.download.mockReset()
  })

  it('returns signed URLs for existing media assets', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'asset-1',
        bucket_name: 'media',
        file_path: 'user-1/file.pdf',
      },
      error: null,
    })
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed.pdf' },
    })
    const service = createService()

    await expect(service.getSignedUrl('asset-1', 60)).resolves.toBe(
      'https://storage.example.com/signed.pdf',
    )
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('user-1/file.pdf', 60)
  })

  it('downloads an asset buffer with asset metadata', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'asset-1',
        bucket_name: 'media',
        file_path: 'user-1/file.txt',
        mime_type: 'text/plain',
        original_filename: 'file.txt',
        name: 'Fallback name',
      },
      error: null,
    })
    mocks.download.mockResolvedValue({
      data: new Blob(['hello']),
      error: null,
    })
    const service = createService()

    const result = await service.downloadBuffer('asset-1')

    expect(result?.buffer.toString('utf8')).toBe('hello')
    expect(result?.mimeType).toBe('text/plain')
    expect(result?.filename).toBe('file.txt')
    expect(mocks.download).toHaveBeenCalledWith('user-1/file.txt')
  })
})
