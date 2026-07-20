import { describe, expect, it, vi } from 'vitest'
import { PageGraderBrainSyncService } from '../page-grader-brain-sync.service'

describe('PageGraderBrainSyncService', () => {
  it('rejects webhook without signature', async () => {
    const service = new PageGraderBrainSyncService(
      { client: {} } as never,
      {} as never,
      {} as never,
      {} as never,
    )
    await expect(service.processWebhook('{}', '')).rejects.toThrow(/webhook signature/i)
  })

  it('rejects invalid JSON body', async () => {
    const service = new PageGraderBrainSyncService(
      { client: {} } as never,
      {} as never,
      {} as never,
      {} as never,
    )
    await expect(service.processWebhook('not-json', 'secret')).rejects.toThrow(/Invalid JSON/i)
  })

  it('skips catch-up when stored content_hash matches package hash', async () => {
    const brainImport = {
      importClientBrain: vi.fn(),
    }
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { content_hash: 'abc123hashvalue' },
      }),
    }
    const vault = {
      getSecret: vi.fn().mockResolvedValue('value'),
    }
    const svc = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [
                  {
                    user_id: 'user-1',
                    org_id: null,
                    metadata: {
                      webhook_secret: 'whsec',
                      client_scope_map: {
                        'client-1': {
                          campaign_id: 'campaign-1',
                          content_hash: 'abc123hashvalue',
                        },
                      },
                    },
                  },
                ],
                error: null,
              })),
            })),
          })),
        })),
      },
    }

    const service = new PageGraderBrainSyncService(
      svc as never,
      vault as never,
      pageGrader as never,
      brainImport as never,
    )

    const result = await service.catchUpMappedClients(10)
    expect(result).toMatchObject({ success: true, scanned: 1, skipped: 1, synced: 0 })
    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
  })
})
