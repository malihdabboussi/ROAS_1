import { describe, expect, it, vi } from 'vitest'
import { SlackBrainMappingService } from './slack-brain-mapping.service'

describe('SlackBrainMappingService backfillPersonBrains', () => {
  it('provisions non-portal Person Brains and queues each enabled mapped channel', async () => {
    const mappings = [
      {
        id: 'mapping-1',
        user_id: 'owner-1',
        org_id: 'org-1',
        slack_team_id: 'team-1',
        slack_channel_id: 'channel-1',
        slack_channel_name: 'client-acme',
        target_kind: 'campaign' as const,
        target_brain_id: null,
        target_campaign_id: 'campaign-1',
        cadence: 'daily' as const,
        last_synced_at: null,
        last_message_ts: null,
        enabled: true,
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'mapping-disabled',
        user_id: 'owner-1',
        org_id: 'org-1',
        slack_team_id: 'team-1',
        slack_channel_id: 'channel-2',
        slack_channel_name: 'private',
        target_kind: 'user' as const,
        target_brain_id: 'brain-owner',
        target_campaign_id: null,
        cadence: 'daily' as const,
        last_synced_at: null,
        last_message_ts: null,
        enabled: false,
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z',
      },
    ]
    const mappingsRepo = { list: vi.fn().mockResolvedValue(mappings) }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb', metadata: {} }),
    }
    const brainImportJobs = {
      enqueueSlackPeriodImport: vi
        .fn()
        .mockResolvedValue({ jobId: 'job-1', status: 'queued', deduped: false }),
    }
    const peopleRepo = {
      listPeople: vi.fn().mockResolvedValue([
        {
          id: 'person-external',
          vibey_user_id: null,
          person_brain_id: null,
          relationship_kind: 'external',
        },
        {
          id: 'person-portal',
          vibey_user_id: 'portal-user',
          person_brain_id: null,
          relationship_kind: 'internal',
        },
        {
          id: 'person-ignored',
          vibey_user_id: null,
          person_brain_id: null,
          relationship_kind: 'ignored',
        },
      ]),
    }
    const peopleBrains = {
      createManagedPersonBrain: vi
        .fn()
        .mockResolvedValue({ id: 'brain-external', name: 'External Person Brain' }),
    }
    const service = new SlackBrainMappingService(
      mappingsRepo as never,
      slackRepo as never,
      {} as never,
      {} as never,
      brainImportJobs as never,
      peopleRepo as never,
      peopleBrains as never,
    )

    const result = await service.backfillPersonBrains(
      {} as never,
      'owner-1',
      'org-1',
      30,
      new Date('2026-07-20T12:00:00.000Z'),
    )

    expect(peopleBrains.createManagedPersonBrain).toHaveBeenCalledTimes(1)
    expect(peopleBrains.createManagedPersonBrain).toHaveBeenCalledWith(expect.anything(), {
      personId: 'person-external',
      orgId: 'org-1',
      ownerId: 'owner-1',
    })
    expect(brainImportJobs.enqueueSlackPeriodImport).toHaveBeenCalledTimes(1)
    expect(brainImportJobs.enqueueSlackPeriodImport).toHaveBeenCalledWith(
      'owner-1',
      mappings[0],
      '1781956800.000000',
      '1784548800.000000',
      'org-1',
    )
    expect(result).toEqual({
      provisioned_person_brains: 1,
      mapped_channels: 1,
      queued_jobs: 1,
      deduped_jobs: 0,
      lookback_days: 30,
    })
  })
})
