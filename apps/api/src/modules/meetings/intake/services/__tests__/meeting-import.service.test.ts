import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeFathomMeetingSource } from '../../../providers/fathom-meeting-source'
import type { TranscriptProvider } from '../../../providers/transcript-provider.contract'
import { MeetingImportService } from '../meeting-import.service'

const scope = { userId: 'user_1', orgId: 'org_1' } as never
const supabase = {} as never
const event = {
  id: 'rec_1',
  title: 'Call',
  transcript: [{ speaker: { display_name: 'A' }, text: 'hello' }],
}

describe('MeetingImportService', () => {
  let provider: TranscriptProvider
  let registry: { get: ReturnType<typeof vi.fn>; resolve: ReturnType<typeof vi.fn> }
  let repository: Record<string, ReturnType<typeof vi.fn>>
  let importJobs: Record<string, ReturnType<typeof vi.fn>>
  let brainPermissions: { assertCanTrainBrain: ReturnType<typeof vi.fn> }
  let service: MeetingImportService

  beforeEach(() => {
    provider = {
      identity: {
        id: 'fathom',
        auth: 'oauth2',
        manifest: { displayName: 'Fathom', personalOnly: true, logoKey: 'fathom' },
      },
      pull: { fetch: vi.fn().mockResolvedValue(normalizeFathomMeetingSource(event)) },
      normalize: normalizeFathomMeetingSource,
    }
    registry = { get: vi.fn(() => provider), resolve: vi.fn(async () => provider) }
    repository = {
      getServiceClient: vi.fn(() => ({ admin: true })),
      findConnectionForUser: vi.fn().mockResolvedValue({
        id: 'conn_1',
        userId: 'user_1',
        orgId: null,
        provider: 'fathom',
        status: 'connected',
        metadata: {},
      }),
    }
    importJobs = {
      enqueueMeetingTranscriptImport: vi
        .fn()
        .mockResolvedValue({ jobId: 'job_1', status: 'queued' }),
      enqueueCampaignMeetingImport: vi.fn().mockResolvedValue({ jobId: 'job_2', status: 'queued' }),
    }
    brainPermissions = { assertCanTrainBrain: vi.fn().mockResolvedValue(undefined) }
    service = new MeetingImportService(
      registry as never,
      repository as never,
      importJobs as never,
      brainPermissions as never,
    )
  })

  it('fetches through the adapter and queues the generic brain job without the raw body', async () => {
    const result = await service.importToBrain({
      provider: 'fathom',
      userId: 'user_1',
      scope,
      supabase,
      externalId: 'rec_1',
      targetBrain: 'user',
    })
    expect(result).toEqual({ success: true, jobId: 'job_1', status: 'queued' })
    expect(provider.pull!.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_1', orgId: 'org_1' }),
      'rec_1',
      null,
    )
    const [userId, input, orgId] = importJobs.enqueueMeetingTranscriptImport.mock.calls[0]!
    expect(userId).toBe('user_1')
    expect(orgId).toBe('org_1')
    expect(input.source).toEqual(
      expect.objectContaining({ provider: 'fathom', externalRecordingId: 'rec_1' }),
    )
    expect(input.source).not.toHaveProperty('raw')
    expect(input.targetBrain).toBe('user')
  })

  it('queues a campaign meeting job when a campaign id is given', async () => {
    await service.importToBrain({
      provider: 'fathom',
      userId: 'user_1',
      scope,
      supabase,
      externalId: 'rec_1',
      campaignId: '11111111-1111-1111-1111-111111111111',
      domain: 'strategy',
    })
    expect(importJobs.enqueueCampaignMeetingImport).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        campaignId: '11111111-1111-1111-1111-111111111111',
        domain: 'strategy',
      }),
      'org_1',
    )
    expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
  })

  it('checks train permission when a brain id is targeted', async () => {
    await service.importToBrain({
      provider: 'fathom',
      userId: 'user_1',
      scope,
      supabase,
      externalId: 'rec_1',
      brainId: '22222222-2222-2222-2222-222222222222',
    })
    expect(brainPermissions.assertCanTrainBrain).toHaveBeenCalledWith(
      supabase,
      'user_1',
      scope,
      '22222222-2222-2222-2222-222222222222',
    )
  })

  it('rejects when the provider is not connected, cannot fetch, or the meeting has no transcript', async () => {
    repository.findConnectionForUser.mockResolvedValueOnce(null)
    await expect(
      service.importToBrain({
        provider: 'fathom',
        userId: 'user_1',
        scope,
        supabase,
        externalId: 'rec_1',
      }),
    ).rejects.toThrow(/not connected/)

    registry.resolve.mockResolvedValueOnce({ ...provider, pull: undefined })
    await expect(
      service.importToBrain({
        provider: 'fathom',
        userId: 'user_1',
        scope,
        supabase,
        externalId: 'rec_1',
      }),
    ).rejects.toThrow(/cannot fetch/)
    ;(provider.pull!.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      normalizeFathomMeetingSource({ id: 'rec_2', title: 'Silent' }),
    )
    await expect(
      service.importToBrain({
        provider: 'fathom',
        userId: 'user_1',
        scope,
        supabase,
        externalId: 'rec_2',
      }),
    ).rejects.toThrow(/no transcript/)
    expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
  })
})
