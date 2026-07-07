import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { concurrentMap, getUploadedMediaAsset } from './presigned-client-upload'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('presigned client upload helpers', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
  })

  it('loads uploaded media assets and returns null for empty ids or failed reads', async () => {
    backendGetMock
      .mockResolvedValueOnce({
        id: 'asset-1',
        file_path: 'org/uploads/report.pdf',
        file_size: 42,
        mime_type: 'application/pdf',
        public_url: 'https://cdn.example.com/report.pdf',
        document_intelligence: {
          status: 'ready',
          strategy: 'native_text',
          text_quality: 'usable',
        },
      })
      .mockRejectedValueOnce(new Error('not found'))

    await expect(getUploadedMediaAsset('asset-1')).resolves.toEqual({
      id: 'asset-1',
      file_path: 'org/uploads/report.pdf',
      file_size: 42,
      mime_type: 'application/pdf',
      public_url: 'https://cdn.example.com/report.pdf',
      document_intelligence: {
        status: 'ready',
        strategy: 'native_text',
        text_quality: 'usable',
      },
    })
    await expect(getUploadedMediaAsset('')).resolves.toBeNull()
    await expect(getUploadedMediaAsset('missing')).resolves.toBeNull()

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/media/assets/asset-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/media/assets/missing')
  })

  it('returns settled results in input order for concurrent tasks', async () => {
    const results = await concurrentMap([1, 2, 3], 2, async (value) => {
      if (value === 2) throw new Error('bad item')
      return value * 10
    })

    expect(results[0]).toEqual({ status: 'fulfilled', value: 10 })
    expect(results[1]?.status).toBe('rejected')
    expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(Error)
    expect(results[2]).toEqual({ status: 'fulfilled', value: 30 })
  })
})
