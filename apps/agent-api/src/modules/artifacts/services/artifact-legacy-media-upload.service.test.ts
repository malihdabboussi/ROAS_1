import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMediaUploadService } from './artifact-legacy-media-upload.service'

function makeDeps(overrides: { posterBuffer?: Buffer | null } = {}) {
  const inserted: Array<Record<string, unknown>> = []
  const uploadedPaths: string[] = []
  const repository = {
    uploadMediaObject: vi.fn(async (_client: unknown, input: { filePath: string }) => {
      uploadedPaths.push(input.filePath)
      return { error: null }
    }),
    createMediaSignedUrl: vi.fn(async (_client: unknown, filePath: string) => ({
      data: { signedUrl: `https://cdn.example.com/${filePath}` },
    })),
    createGeneratedMediaAsset: vi.fn(async (_client: unknown, payload: Record<string, unknown>) => {
      inserted.push(payload)
      return { data: { id: 'asset-1', ...payload }, error: null }
    }),
  }
  const posterService = {
    extractPosterFrame: vi.fn(async () =>
      'posterBuffer' in overrides ? overrides.posterBuffer : Buffer.from('poster'),
    ),
  }
  const target = {
    serviceClient: {},
    logger: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), warn: vi.fn() },
  }
  const service = new ArtifactLegacyMediaUploadService(repository as never, posterService as never)
  return { service, repository, posterService, target, inserted, uploadedPaths }
}

describe('ArtifactLegacyMediaUploadService video metadata', () => {
  it('stores a poster and duration on generated video assets', async () => {
    const { service, posterService, target, inserted, uploadedPaths } = makeDeps()

    const result = await service.uploadMediaFromBytes(
      target,
      Buffer.from('video-bytes'),
      'video/mp4',
      'video',
      'user-1',
      null,
      'A sunrise timelapse',
      'veo-3.1-fast',
      null,
      'space-1',
      null,
      undefined,
      undefined,
      8,
    )

    expect(result.success).toBe(true)
    expect(posterService.extractPosterFrame).toHaveBeenCalledTimes(1)
    expect(uploadedPaths.some((p) => p.includes('/videos/poster-') && p.endsWith('.jpg'))).toBe(
      true,
    )
    expect(inserted[0]).toEqual(
      expect.objectContaining({
        asset_type: 'video',
        duration_seconds: 8,
        poster_url: expect.stringContaining('/videos/poster-'),
        space_id: 'space-1',
      }),
    )
  })

  it('still succeeds without a poster when frame extraction fails', async () => {
    const { service, target, inserted } = makeDeps({ posterBuffer: null })

    const result = await service.uploadMediaFromBytes(
      target,
      Buffer.from('video-bytes'),
      'video/mp4',
      'video',
      'user-1',
      null,
      'A sunrise timelapse',
      'veo-3.1-fast',
    )

    expect(result.success).toBe(true)
    expect(inserted[0]).toEqual(
      expect.objectContaining({ asset_type: 'video', poster_url: null, duration_seconds: null }),
    )
  })

  it('adds no video metadata fields to image assets', async () => {
    const { service, posterService, target, inserted } = makeDeps()

    const result = await service.uploadMediaFromBytes(
      target,
      Buffer.from('image-bytes'),
      'image/png',
      'image',
      'user-1',
      null,
      'A logo',
      'gpt-5.4-image-2',
    )

    expect(result.success).toBe(true)
    expect(posterService.extractPosterFrame).not.toHaveBeenCalled()
    expect(inserted[0]).not.toHaveProperty('poster_url')
    expect(inserted[0]).not.toHaveProperty('duration_seconds')
  })
})
