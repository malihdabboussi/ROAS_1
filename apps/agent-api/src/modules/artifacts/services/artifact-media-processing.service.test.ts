import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactMediaProcessingService } from './artifact-media-processing.service'

function makeTarget() {
  const mediaAssetRows: Array<Record<string, unknown>> = []
  const persistMissionDeliverable = vi.fn(async () => ({
    success: true,
    deliverable_id: 'deliverable-1',
  }))
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
    isMissionSessionKey: vi.fn(() => false),
    parseAgentIdFromSessionKey: vi.fn(() => 'lux'),
    persistMissionDeliverable,
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
    resolveMissionContext: vi.fn(async () => ({
      missionId: 'mission-1',
      campaignId: 'campaign-1',
      orgId: 'org-1',
    })),
    resolveOrgId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
    serviceClient,
    storageBucket,
  }
}

describe('ArtifactMediaProcessingService data access behavior', () => {
  it('renders and registers deterministic Validate Messaging statics as native campaign media', async () => {
    const service = new ArtifactMediaProcessingService()
    const target = makeTarget()

    const result = await service.getHandlers(target).process_media(
      {
        operation: 'render_validate_messaging',
        space_id: 'space-1',
        brand_color: '#FFEA00',
        lines: [
          {
            text: 'If you are a top-producing lender, your income should not have a ceiling.',
            highlight: 'top-producing lender',
          },
        ],
      },
      'session-1',
    )

    expect(result).toMatchObject({
      success: true,
      operation: 'render_validate_messaging',
      count: 3,
      space_id: 'space-1',
      media_assets: expect.arrayContaining([
        expect.objectContaining({
          media_asset_id: 'asset-1',
          name: 'Static 1 — Light',
        }),
      ]),
    })
    expect(target.storageBucket.upload).toHaveBeenCalledTimes(3)
    expect(target.storageBucket.upload).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^user-1\/images\/.*\.png$/),
      expect.objectContaining({ 0: 0x89, 1: 0x50, 2: 0x4e, 3: 0x47 }),
      { contentType: 'image/png', upsert: false },
    )
    expect(target.mediaAssetRows).toHaveLength(3)
    expect(target.mediaAssetRows[0]).toEqual({
      table: 'media_assets',
      payload: expect.objectContaining({
        name: 'Static 1 — Light',
        campaign_id: 'campaign-1',
        space_id: 'space-1',
        asset_type: 'image',
        source_model: 'deterministic-renderer',
        source_prompt: 'If you are a top-producing lender, your income should not have a ceiling.',
      }),
    })
  })

  it('uploads processed media and persists a generated media asset row', async () => {
    const service = new ArtifactMediaProcessingService()
    vi.spyOn(service as any, 'opTrim').mockImplementation(async (_input, tempRoot: string) => {
      const outputPath = join(tempRoot, 'output.mp4')
      await writeFile(outputPath, Buffer.from('processed-video'))
      return { outputPath, outputFormat: 'mp4' }
    })
    const target = makeTarget()
    const progress = vi.fn()

    const result = await service
      .getHandlers(target)
      .process_media(
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

  it('renders an IG Story overlay through the deterministic server operation', async () => {
    const service = new ArtifactMediaProcessingService()
    vi.spyOn(service as any, 'opRenderIgStory').mockImplementation(
      async (_input, tempRoot: string) => {
        const outputPath = join(tempRoot, 'output.mp4')
        await writeFile(outputPath, Buffer.from('rendered-story-video'))
        return { outputPath, outputFormat: 'mp4' }
      },
    )
    const target = makeTarget()
    target.isMissionSessionKey.mockReturnValue(true)

    const result = await service.getHandlers(target).process_media(
      {
        operation: 'render_ig_story',
        url: 'https://example.com/source.mp4',
        pill_line: 'Free Training',
        headline_lines: [
          { text: 'Build launch-ready ads' },
          { text: 'without the production drag', highlighted: true },
        ],
        cta_line: 'Tap Below To Build Faster',
        emoji: '⏰',
      },
      'session-1',
    )

    expect(result).toMatchObject({
      success: true,
      operation: 'render_ig_story',
      media_asset_id: 'asset-1',
      deliverable_id: 'deliverable-1',
      format: 'mp4',
      width: 1080,
      height: 1920,
      duration_seconds: 10,
    })
    expect(target.persistMissionDeliverable).toHaveBeenCalledWith({
      missionId: 'mission-1',
      userId: 'user-1',
      campaignId: 'campaign-1',
      orgId: 'org-1',
      agentKey: 'lux',
      type: 'video',
      title: 'IG Story video',
      sourceAction: 'process_media',
      content: 'render_ig_story',
      fileUrl: 'https://cdn.example.com/processed.mp4',
      fileName: 'output.mp4',
      fileSize: 20,
      mimeType: 'video/mp4',
      metadata: {
        media_asset_id: 'asset-1',
        operation: 'render_ig_story',
        aspect_ratio: '9:16',
        width: 1080,
        height: 1920,
        duration_seconds: 10,
        media_generation_status: 'succeeded',
      },
    })
    expect(target.mediaAssetRows[0]).toEqual({
      table: 'media_assets',
      payload: expect.objectContaining({
        asset_type: 'video',
        campaign_id: 'campaign-1',
        tags: ['process-media-render_ig_story'],
      }),
    })
  })
})
