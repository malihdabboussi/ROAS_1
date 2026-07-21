import { describe, expect, it, vi } from 'vitest'
import { BrainImportJobsService } from '../brain-import-jobs.service'

describe('BrainImportJobsService managed Slack Person Brain routing', () => {
  it('queues a sender-filtered User Brain import owned by the mapping administrator', async () => {
    const service = new BrainImportJobsService(
      { get: vi.fn() } as never,
      undefined as never,
      undefined as never,
    )
    const enqueueJob = vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'queued' })
    ;(service as unknown as { enqueueJob: typeof enqueueJob }).enqueueJob = enqueueJob
    const mapping = {
      id: 'mapping-1',
      user_id: 'owner-1',
      org_id: 'org-1',
      slack_team_id: 'team-1',
      slack_channel_id: 'channel-1',
      slack_channel_name: 'client-acme',
      target_kind: 'campaign' as const,
      target_brain_id: null,
      target_campaign_id: 'campaign-1',
      cadence: 'daily',
    }

    await service.enqueueSlackPeriodImport(
      'owner-1',
      mapping,
      '1710000000.000000',
      '1710086400.000000',
      'org-1',
      {
        kind: 'managed_person',
        targetId: 'person-brain-1',
        brainId: 'person-brain-1',
        slackUserId: 'U123',
      },
    )

    expect(enqueueJob).toHaveBeenCalledWith(
      'owner-1',
      'slack_period_import',
      'Slack #client-acme managed_person fork',
      'slack:mapping-1:1710000000.000000:fork:managed_person:person-brain-1',
      expect.objectContaining({
        targetKind: 'user',
        targetBrainId: 'person-brain-1',
        senderFilterSlackUserId: 'U123',
        isFork: true,
      }),
      'org-1',
    )
  })

  it('normalizes recurring ISO cursors to Slack timestamps before queueing', async () => {
    const service = new BrainImportJobsService(
      { get: vi.fn() } as never,
      undefined as never,
      undefined as never,
    )
    const enqueueJob = vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'queued' })
    ;(service as unknown as { enqueueJob: typeof enqueueJob }).enqueueJob = enqueueJob

    await service.enqueueSlackPeriodImport(
      'owner-1',
      {
        id: 'mapping-1',
        user_id: 'owner-1',
        org_id: 'org-1',
        slack_team_id: 'team-1',
        slack_channel_id: 'channel-1',
        slack_channel_name: 'general',
        target_kind: 'user',
        target_brain_id: 'brain-owner',
        target_campaign_id: null,
        cadence: 'daily',
      },
      '2026-07-19T12:00:00.000Z',
      '2026-07-20T12:00:00.000Z',
      'org-1',
    )

    expect(enqueueJob).toHaveBeenCalledWith(
      'owner-1',
      'slack_period_import',
      'Slack #general daily',
      'slack:mapping-1:1784462400.000000',
      expect.objectContaining({
        periodStartTs: '1784462400.000000',
        periodEndTs: '1784548800.000000',
      }),
      'org-1',
    )
  })

  it('fans a mapped channel import into a managed Person Brain but skips ignored people', async () => {
    const inputRepository = {
      loadSlackMapping: vi.fn().mockResolvedValue({
        id: 'mapping-1',
        user_id: 'owner-1',
        org_id: 'org-1',
        slack_team_id: 'team-1',
        slack_channel_id: 'channel-1',
        slack_channel_name: 'client-acme',
        target_kind: 'campaign',
        target_brain_id: null,
        target_campaign_id: 'campaign-1',
        cadence: 'daily',
      }),
    }
    const service = new BrainImportJobsService(
      { get: vi.fn() } as never,
      undefined as never,
      undefined as never,
      undefined,
      inputRepository as never,
    )
    const enqueueSlackPeriodImport = vi.fn().mockResolvedValue({ jobId: 'job-person' })
    service.enqueueSlackPeriodImport = enqueueSlackPeriodImport
    ;(service as unknown as { getAdminClient: () => unknown }).getAdminClient = () => ({})
    const job = {
      user_id: 'owner-1',
      org_id: 'org-1',
    }
    const payload = {
      mappingId: 'mapping-1',
      periodStartTs: '1710000000.000000',
      periodEndTs: '1710086400.000000',
      targetKind: 'campaign',
    }

    await (service as unknown as { enqueueSlackForkJobs: Function }).enqueueSlackForkJobs(
      job,
      payload,
      new Map([
        [
          'U1',
          {
            contactId: null,
            contactRole: null,
            qualifiesForCustomerBrain: false,
            vibeyUserId: null,
            personBrainId: 'person-brain-1',
            relationshipKind: 'external',
          },
        ],
        [
          'U2',
          {
            contactId: null,
            contactRole: null,
            qualifiesForCustomerBrain: false,
            vibeyUserId: null,
            personBrainId: 'ignored-brain',
            relationshipKind: 'ignored',
          },
        ],
      ]),
    )

    expect(enqueueSlackPeriodImport).toHaveBeenCalledTimes(1)
    expect(enqueueSlackPeriodImport).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({ id: 'mapping-1' }),
      '1710000000.000000',
      '1710086400.000000',
      'org-1',
      {
        kind: 'managed_person',
        targetId: 'person-brain-1',
        brainId: 'person-brain-1',
        slackUserId: 'U1',
      },
    )
  })
})
