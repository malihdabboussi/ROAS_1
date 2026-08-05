import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SlackSyncService } from './slack-sync.service'

describe('SlackSyncService', () => {
  const insert = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    insert.mockResolvedValue({ error: null })
  })

  it('enqueues Slack period jobs with numeric Slack timestamps', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'slack_brain_mappings') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: 'map-1',
                      user_id: 'user-1',
                      org_id: 'org-1',
                      slack_team_id: 'T1',
                      slack_channel_id: 'C1',
                      slack_channel_name: 'client',
                      target_kind: 'user',
                      target_brain_id: 'brain-1',
                      target_campaign_id: null,
                      cadence: 'daily',
                      last_synced_at: '2026-08-04T18:53:39.445+00:00',
                      created_at: '2026-08-01T00:00:00.000Z',
                      enabled: true,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'user_integrations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: { access_token: 'xoxb-test', metadata: {} },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert,
      }
    })

    const service = new SlackSyncService({ getClient: () => ({ from }) } as never)
    const enqueued = await service.enqueueDueMappings()

    expect(enqueued).toBe(1)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupe_key: 'slack:map-1:1785869619.000000',
        payload: expect.objectContaining({
          periodStartTs: '1785869619.000000',
          periodEndTs: expect.stringMatching(/^\d+\.000000$/),
        }),
      }),
    )
  })
})
