import { describe, expect, it, vi } from 'vitest'
import { computePageGraderCampaignSpaceHash } from '../../../../brain/services/page-grader-campaign-space-sync'
import { PageGraderBrainSyncService } from '../page-grader-brain-sync.service'

describe('PageGraderBrainSyncService', () => {
  it('rejects webhook without signature', async () => {
    const service = new PageGraderBrainSyncService(
      { client: {} } as never,
      {} as never,
      {} as never,
      {} as never,
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
      {} as never,
      {} as never,
      {} as never,
    )
    await expect(service.processWebhook('not-json', 'secret')).rejects.toThrow(/Invalid JSON/i)
  })

  it('routes agenda prep through the explicitly mapped client campaign Brain', async () => {
    const precallPrep = {
      resolveMeetingsSpaceId: vi.fn().mockResolvedValue('meetings-space'),
      runForPageGraderClient: vi.fn().mockResolvedValue({
        calendar_event_id: 'pg-agenda:event',
        space_item_id: 'prep-1',
        title: 'Prep — Acme',
        status: 'pending',
        kind: 'created',
      }),
    }
    const service = new PageGraderBrainSyncService(
      { client: {} } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      precallPrep as never,
    )
    vi.spyOn(service as never, 'findOrBootstrapClientsByWebhookSecret' as never).mockResolvedValue([
      {
        userId: 'user-1',
        orgId: null,
        clientId: '11111111-1111-1111-1111-111111111111',
        entry: { campaign_id: 'campaign-client-acme' },
        webhookSecret: 'whsec',
      },
    ] as never)

    await service.processMeetingAgendaWebhook(
      JSON.stringify({
        client_id: '11111111-1111-1111-1111-111111111111',
        client_name: 'Acme',
        meeting_date: '2026-08-17T17:00:00.000Z',
        notes: 'Decide the launch owner.',
      }),
      'whsec',
    )

    expect(precallPrep.runForPageGraderClient).toHaveBeenCalledWith(
      expect.objectContaining({
        pageGraderClientId: '11111111-1111-1111-1111-111111111111',
        pageGraderCampaignId: 'campaign-client-acme',
        notes: 'Decide the launch owner.',
      }),
    )
  })

  it('rejects an agenda request for a client absent from the scope map', async () => {
    const service = new PageGraderBrainSyncService(
      { client: {} } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )
    vi.spyOn(service as never, 'findOrBootstrapClientsByWebhookSecret' as never).mockResolvedValue(
      [] as never,
    )

    await expect(
      service.processMeetingAgendaWebhook(
        JSON.stringify({
          client_id: '11111111-1111-1111-1111-111111111111',
          client_name: 'Unmapped client',
          meeting_date: '2026-08-17T17:00:00.000Z',
        }),
        'whsec',
      ),
    ).rejects.toThrow(/unmapped client/i)
  })

  it('bootstraps a valid connected client that is not yet in the scope map', async () => {
    const connectionRows = [
      {
        user_id: 'user-1',
        org_id: 'org-1',
        metadata: { webhook_secret: 'whsec', client_scope_map: {} },
      },
    ]
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.eq.mockReturnValueOnce(query).mockResolvedValueOnce({ data: connectionRows, error: null })
    const svc = { client: { from: vi.fn(() => query) } }
    const brainImport = { importClientBrain: vi.fn().mockResolvedValue({ success: true }) }
    const pageGraderApi = {
      listClients: vi.fn().mockResolvedValue({
        clients: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Clogged Club',
            display_name: 'Clogged Club',
          },
        ],
      }),
      getClientScopeMap: vi.fn().mockResolvedValue({
        '11111111-1111-1111-1111-111111111111': {
          campaign_id: '22222222-2222-2222-2222-222222222222',
          space_id: '33333333-3333-3333-3333-333333333333',
        },
      }),
    }
    const service = new PageGraderBrainSyncService(
      svc as never,
      {} as never,
      {} as never,
      brainImport as never,
      {} as never,
      pageGraderApi as never,
      {} as never,
    )

    const result = await (
      service as unknown as {
        findOrBootstrapClientsByWebhookSecret(
          secret: string,
          clientId: string,
          clientName?: string,
        ): Promise<Array<{ clientId: string; entry: { campaign_id: string } }>>
      }
    ).findOrBootstrapClientsByWebhookSecret(
      'whsec',
      '11111111-1111-1111-1111-111111111111',
      'Clogged Club',
    )

    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      svc.client,
      'user-1',
      {
        client_id: '11111111-1111-1111-1111-111111111111',
        campaignName: 'Clogged Club',
      },
      'org-1',
    )
    expect(result).toEqual([
      expect.objectContaining({
        clientId: '11111111-1111-1111-1111-111111111111',
        entry: expect.objectContaining({
          campaign_id: '22222222-2222-2222-2222-222222222222',
        }),
      }),
    ])
  })

  it('does not bootstrap a client UUID absent from the signed connection catalog', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.eq.mockReturnValueOnce(query).mockResolvedValueOnce({
      data: [
        {
          user_id: 'user-1',
          org_id: null,
          metadata: { webhook_secret: 'whsec', client_scope_map: {} },
        },
      ],
      error: null,
    })
    const brainImport = { importClientBrain: vi.fn() }
    const pageGraderApi = { listClients: vi.fn().mockResolvedValue({ clients: [] }) }
    const service = new PageGraderBrainSyncService(
      { client: { from: vi.fn(() => query) } } as never,
      {} as never,
      {} as never,
      brainImport as never,
      {} as never,
      pageGraderApi as never,
      {} as never,
    )

    const result = await (
      service as unknown as {
        findOrBootstrapClientsByWebhookSecret(secret: string, clientId: string): Promise<unknown[]>
      }
    ).findOrBootstrapClientsByWebhookSecret('whsec', '11111111-1111-1111-1111-111111111111')

    expect(result).toEqual([])
    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
  })

  it('writes a completed Page Grader work status back to the ROAS action ledger', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))
    const integrationRows = [
      {
        user_id: 'user-1',
        org_id: null,
        metadata: {
          webhook_secret: 'whsec',
          client_scope_map: {
            '11111111-1111-1111-1111-111111111111': { campaign_id: 'campaign-1' },
          },
        },
      },
    ]
    const from = vi.fn((table: string) => {
      if (table === 'user_integrations') {
        const query: Record<string, ReturnType<typeof vi.fn>> = {}
        query.select = vi.fn(() => query)
        query.eq = vi.fn(() => query)
        query.eq
          .mockReturnValueOnce(query)
          .mockResolvedValueOnce({ data: integrationRows, error: null })
        return query
      }
      if (table === 'space_items') {
        const query: Record<string, ReturnType<typeof vi.fn>> = {}
        query.select = vi.fn(() => query)
        query.eq = vi.fn(() => query)
        query.maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: '22222222-2222-2222-2222-222222222222',
            custom_data: {
              page_grader: {
                client_id: '11111111-1111-1111-1111-111111111111',
                work_id: '33333333-3333-3333-3333-333333333333',
              },
              action_ledger: {
                status: 'delegated',
                page_grader: { delegation_status: 'delegated' },
              },
            },
          },
          error: null,
        })
        query.update = update
        return query
      }
      throw new Error(`Unexpected table ${table}`)
    })
    const service = new PageGraderBrainSyncService(
      { client: { from } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )

    const result = await service.processWorkStatusWebhook(
      JSON.stringify({
        client_id: '11111111-1111-1111-1111-111111111111',
        space_item_id: '22222222-2222-2222-2222-222222222222',
        work_id: '33333333-3333-3333-3333-333333333333',
        clickup_task_id: 'cu-1',
        clickup_task_url: 'https://app.clickup.com/t/cu-1',
        status: 'complete',
        updated_at: '2026-07-21T06:00:00.000Z',
      }),
      'whsec',
    )

    expect(result).toMatchObject({ status: 'done' })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_data: expect.objectContaining({
          action_ledger: expect.objectContaining({
            status: 'done',
            page_grader: expect.objectContaining({
              clickup_status: 'complete',
              completed_at: '2026-07-21T06:00:00.000Z',
            }),
          }),
        }),
      }),
    )
  })

  it('skips catch-up when stored content_hash matches package hash', async () => {
    const pkg = { envelope: { content_hash: 'abc123hashvalue' }, client_campaigns: [] }
    const campaignSpaceHash = computePageGraderCampaignSpaceHash({ campaigns: [] })
    const brainImport = {
      importClientBrain: vi.fn(),
    }
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue(pkg),
      getClientMetaContext: vi.fn().mockResolvedValue(null),
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
                          campaign_space_hash: campaignSpaceHash,
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
      { hasCampaignKnowledge: vi.fn().mockResolvedValue(true) } as never,
      {} as never,
      {} as never,
    )

    const result = await service.catchUpMappedClients(10)
    expect(result).toMatchObject({ success: true, scanned: 1, skipped: 1, synced: 0 })
    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
  })

  it('force-repairs an empty campaign even when the stored hash matches', async () => {
    const brainImport = {
      importClientBrain: vi.fn().mockResolvedValue({
        brainImport: { status: 'succeeded', contentHash: 'abc123hashvalue' },
      }),
    }
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { content_hash: 'abc123hashvalue' },
      }),
      getClientMetaContext: vi.fn().mockResolvedValue(null),
    }
    const vault = { getSecret: vi.fn().mockResolvedValue('value') }
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
    const campaignKnowledge = { hasCampaignKnowledge: vi.fn().mockResolvedValue(false) }
    const service = new PageGraderBrainSyncService(
      svc as never,
      vault as never,
      pageGrader as never,
      brainImport as never,
      campaignKnowledge as never,
      {} as never,
      {} as never,
    )

    const result = await service.catchUpMappedClients(10)

    expect(result).toMatchObject({ success: true, scanned: 1, skipped: 0, synced: 1 })
    expect(campaignKnowledge.hasCampaignKnowledge).toHaveBeenCalledWith(svc.client, 'campaign-1')
    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      svc.client,
      'user-1',
      expect.objectContaining({ campaignId: 'campaign-1', force: true }),
      null,
      expect.objectContaining({ envelope: { content_hash: 'abc123hashvalue' } }),
      null,
      { skipBrainIngest: false },
    )
  })

  it('reconciles campaign Spaces without repeating an unchanged Brain ingest', async () => {
    const brainImport = {
      importClientBrain: vi.fn().mockResolvedValue({
        campaignSpaceHash: 'new-space-hash',
        brainImport: { skippedUnchanged: true, contentHash: 'abc123hashvalue' },
      }),
    }
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { content_hash: 'abc123hashvalue' },
        client_campaigns: [{ id: 'campaign-child-1', name: 'Launch' }],
      }),
      getClientMetaContext: vi.fn().mockResolvedValue(null),
    }
    const vault = { getSecret: vi.fn().mockResolvedValue('value') }
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
                      client_scope_map: {
                        'client-1': {
                          campaign_id: 'campaign-1',
                          content_hash: 'abc123hashvalue',
                          campaign_space_hash: null,
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
      { hasCampaignKnowledge: vi.fn().mockResolvedValue(true) } as never,
      {} as never,
      {} as never,
    )

    await service.catchUpMappedClients(1)

    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      svc.client,
      'user-1',
      expect.objectContaining({ client_id: 'client-1', force: false }),
      null,
      expect.any(Object),
      null,
      { skipBrainIngest: true },
    )
  })

  it('force-repairs an empty campaign when the mapping hash is missing', async () => {
    const brainImport = {
      importClientBrain: vi.fn().mockResolvedValue({
        brainImport: { status: 'succeeded', contentHash: 'abc123hashvalue' },
      }),
    }
    const pageGrader = {
      getClientBrainPackage: vi.fn().mockResolvedValue({
        envelope: { content_hash: 'abc123hashvalue' },
      }),
      getClientMetaContext: vi.fn().mockResolvedValue(null),
    }
    const vault = { getSecret: vi.fn().mockResolvedValue('value') }
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
                      client_scope_map: {
                        'client-1': {
                          campaign_id: 'campaign-1',
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
    const campaignKnowledge = { hasCampaignKnowledge: vi.fn().mockResolvedValue(false) }
    const service = new PageGraderBrainSyncService(
      svc as never,
      vault as never,
      pageGrader as never,
      brainImport as never,
      campaignKnowledge as never,
      {} as never,
      {} as never,
    )

    const result = await service.catchUpMappedClients(10)

    expect(result).toMatchObject({ success: true, scanned: 1, skipped: 0, synced: 1 })
    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      svc.client,
      'user-1',
      expect.objectContaining({ campaignId: 'campaign-1', force: true }),
      null,
      expect.objectContaining({ envelope: { content_hash: 'abc123hashvalue' } }),
      null,
      { skipBrainIngest: false },
    )
  })
})
