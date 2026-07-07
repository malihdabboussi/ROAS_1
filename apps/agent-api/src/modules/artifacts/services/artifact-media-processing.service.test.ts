import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactMediaProcessingService } from './artifact-media-processing.service'

function makeTarget() {
  const mediaAssetRows: Array<Record<string, unknown>> = []
  const storageBucket = {
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: 'https://cdn.example.com/processed.mp4' },
      error: null,
    })),
    upload: vi.fn(async () => ({ error: null })),
  }
  const serviceClient = {
    from: vi.fn((table: string) => ({
      insert: vi.fn((payload: Record<string, unknown>) => {
        mediaAssetRows.push({ table, payload })
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'asset-1' }, error: null })),
          })),
        }
      }),
    })),
    storage: { from: vi.fn(() => storageBucket) },
  }
  return {
    getUserClient: vi.fn(async () => ({ from: vi.fn() })),
    mediaAssetRows,
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
    resolveOrgId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
    serviceClient,
    storageBucket,
  }
}

describe('ArtifactMediaProcessingService data access behavior', () => {
  it('uploads processed media and persists a generated media asset row', async () => {
    const service = new ArtifactMediaProcessingService()
    vi.spyOn(service as any, 'opTrim').mockImplementation(async (_input, tempRoot: string) => {
      const outputPath = join(tempRoot, 'output.mp4')
      await writeFile(outputPath, Buffer.from('processed-video'))
      return { outputPath, outputFormat: 'mp4' }
    })
    const target = makeTarget()
    const progress = vi.fn()

    const result = await service.getHandlers(target).process_media(
      { operation: 'trim', url: 'https://example.com/source.mp4', duration_seconds: 5 },
      'session-1',
      progress,
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        campaign_id: 'campaign-1',
        media_asset_id: 'asset-1',
        url: 'https://cdn.example.com/processed.mp4',
      }),
    )
    expect(target.storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/processed\/.*\.mp4$/),
      expect.any(Buffer),
      { contentType: 'video/mp4', upsert: false },
    )
    expect(target.mediaAssetRows[0]).toEqual({
      table: 'media_assets',
      payload: expect.objectContaining({
        user_id: 'user-1',
        bucket_name: 'media',
        campaign_id: 'campaign-1',
        asset_type: 'video',
        category: 'processed',
        source: 'generated',
        public_url: 'https://cdn.example.com/processed.mp4',
      }),
    })
    expect(progress).toHaveBeenCalledWith('Uploading processed media')
  })
})
