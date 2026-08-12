import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMediaStatusService } from './artifact-legacy-media-status.service'

function makeTarget() {
  return {
    isMissionSessionKey: vi.fn(() => false),
    logger: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), warn: vi.fn() },
    parseAgentIdFromSessionKey: vi.fn(() => 'vibey'),
    parseConversationId: vi.fn(() => 'conversation-1'),
    requestContext: { get: vi.fn(() => ({ spaceId: 'space-ctx' })) },
    resolveOrgId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => ({})),
  }
}

describe('ArtifactLegacyMediaStatusService space attribution', () => {
  it('prefers the space_id stored on the job over request-context inference', async () => {
    const jobsService = {
      findMediaJobForUser: vi.fn(async () => ({
        id: 'job-1',
        status: 'succeeded',
        media_asset_id: 'asset-1',
        result_url: 'https://cdn.example.com/video.mp4',
        prompt: 'A sunrise timelapse',
        space_id: 'space-job',
      })),
    }
    const service = new ArtifactLegacyMediaStatusService(
      jobsService as never,
      {} as never,
      {} as never,
    )

    const result = await service.getVideoStatus(makeTarget(), { job_id: 'job-1' }, 'session-1')

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        status: 'succeeded',
        media_asset_id: 'asset-1',
        space_id: 'space-job',
      }),
    )
  })

  it('falls back to request-context space when the job has none', async () => {
    const jobsService = {
      findMediaJobForUser: vi.fn(async () => ({
        id: 'job-1',
        status: 'succeeded',
        media_asset_id: 'asset-1',
        result_url: 'https://cdn.example.com/video.mp4',
        prompt: 'A sunrise timelapse',
        space_id: null,
      })),
    }
    const service = new ArtifactLegacyMediaStatusService(
      jobsService as never,
      {} as never,
      {} as never,
    )

    const result = await service.getVideoStatus(makeTarget(), { job_id: 'job-1' }, 'session-1')

    expect(result).toEqual(expect.objectContaining({ success: true, space_id: 'space-ctx' }))
  })
})
