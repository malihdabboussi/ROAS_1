import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageGraderApiService } from '../page-grader-api.service'
import { PageGraderSendWorkService } from '../page-grader-send-work.service'

describe('PageGraderApiService.sendWork', () => {
  const pageGrader = {
    createWork: vi.fn(),
    createDelegationPreview: vi.fn(),
    healthCheck: vi.fn(),
    listClients: vi.fn(),
    getClientMetaContext: vi.fn(),
  }
  const vault = {
    getSecret: vi.fn(),
    hasSecret: vi.fn(),
    storeSecret: vi.fn(),
    deleteSecret: vi.fn(),
  }
  const connections = {
    upsertConnection: vi.fn(),
    markPersonalDisconnected: vi.fn(),
    ensureAvailable: vi.fn(),
    getSimpleStatus: vi.fn(),
  }
  const spaces = {
    getItem: vi.fn(),
    updateItem: vi.fn(),
    getById: vi.fn().mockResolvedValue({ schema: { custom_data: {} } }),
  }
  const svc = {
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: null } }) } },
    },
  }
  const config = { get: vi.fn().mockReturnValue('https://app.roas.io') }

  let service: PageGraderApiService

  beforeEach(() => {
    vi.clearAllMocks()
    vault.getSecret.mockImplementation(async (_u: string, _p: string, label: string) => {
      if (label === 'base_url') return 'https://example.supabase.co/functions/v1/roas-api'
      if (label === 'api_key') return 'test-key'
      return null
    })
    const sendWorkService = new PageGraderSendWorkService(
      pageGrader as never,
      vault as never,
      spaces as never,
      svc as never,
      config as never,
    )
    service = new PageGraderApiService(
      pageGrader as never,
      vault as never,
      connections as never,
      svc as never,
      sendWorkService,
    )
  })

  it('labels the connection with its Page Grader host', async () => {
    pageGrader.healthCheck.mockResolvedValue({ ok: true })

    await service.connect('user-1', 'https://portal.example.com/', 'test-key')

    expect(connections.upsertConnection).toHaveBeenCalledWith(
      'page_grader',
      'user-1',
      expect.objectContaining({
        connection_label: 'portal.example.com',
        metadata: expect.objectContaining({ base_url_host: 'portal.example.com' }),
      }),
    )
  })

  it('creates a delegation preview with the connected Portal credentials', async () => {
    const preview = {
      delegation_id: 'delegation-1',
      confirm_url: 'https://portal.example.com/delegations/delegation-1',
      tasks: [],
      campaign_id: 'campaign-1',
    }
    pageGrader.createDelegationPreview.mockResolvedValue(preview)

    const result = await service.createDelegationPreview('user-1', {
      campaign_id: 'campaign-1',
      raw_text: '1. WHAT: Ship recap\nWHO: Dylan\nWHEN: 2026-08-28',
    })

    expect(pageGrader.createDelegationPreview).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      expect.objectContaining({ campaign_id: 'campaign-1' }),
    )
    expect(result).toEqual(preview)
  })

  it('preserves the client scope map and webhook secret when reconnecting', async () => {
    pageGrader.healthCheck.mockResolvedValue({ ok: true })
    const existingMetadata = {
      webhook_secret: 'pgwh_existing',
      client_scope_map: {
        'client-1': { campaign_id: 'campaign-1', space_id: 'space-1' },
      },
    }
    const secondEq = {
      is: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { metadata: existingMetadata } }),
      })),
    }
    const firstEq = { eq: vi.fn(() => secondEq) }
    svc.client.from.mockReturnValueOnce({
      select: vi.fn(() => ({ eq: vi.fn(() => firstEq) })),
    } as never)

    const result = await service.connect('user-1', 'https://portal.example.com/', 'test-key')

    expect(result.webhook_secret).toBe('pgwh_existing')
    expect(connections.upsertConnection).toHaveBeenCalledWith(
      'page_grader',
      'user-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          webhook_secret: 'pgwh_existing',
          client_scope_map: existingMetadata.client_scope_map,
        }),
      }),
    )
  })

  it('retries ClickUp via idempotent create when already sent', async () => {
    spaces.getItem.mockResolvedValue({
      id: 'item-1',
      title: 'Offer page',
      custom_data: {
        page_grader: {
          work_id: 'pg-1',
          work_url: 'https://portal.roas.io/launcher?task=pg-1',
        },
      },
      assignees: [],
    })
    pageGrader.createWork.mockResolvedValue({
      status: 200,
      work: {
        id: 'pg-1',
        kind: 'task_request',
        client_id: '11111111-1111-1111-1111-111111111111',
        url: 'https://app.clickup.com/t/abc',
        assignee_resolution: [],
      },
    })
    spaces.updateItem.mockResolvedValue({})

    const result = await service.sendWork({} as never, 'user-1', {
      client_id: '11111111-1111-1111-1111-111111111111',
      space_id: '22222222-2222-2222-2222-222222222222',
      space_item_ids: ['33333333-3333-3333-3333-333333333333'],
      task_type: 'design',
    })

    expect(pageGrader.createWork).toHaveBeenCalledOnce()
    expect(spaces.updateItem).toHaveBeenCalled()
    expect(result.results).toEqual([
      {
        space_item_id: '33333333-3333-3333-3333-333333333333',
        status: 'skipped_already_sent',
        work_id: 'pg-1',
        work_url: 'https://app.clickup.com/t/abc',
        clickup_task_id: undefined,
        clickup_task_url: undefined,
        assignee_resolution: [],
      },
    ])
  })

  it('creates work and writes custom_data.page_grader', async () => {
    spaces.getItem.mockResolvedValue({
      id: 'item-1',
      title: 'Draft offer page',
      notes: 'Need CTA',
      priority: 'high',
      due_date: '2026-07-20',
      tags: ['funnel'],
      assignees: [],
      custom_data: { fathom_url: 'https://fathom.video/x' },
      parent_item_id: null,
    })
    pageGrader.createWork.mockResolvedValue({
      status: 201,
      work: {
        id: 'work-9',
        kind: 'task',
        client_id: '11111111-1111-1111-1111-111111111111',
        url: 'https://portal.roas.io/launcher?task=work-9',
        assignee_resolution: [],
      },
    })
    spaces.updateItem.mockResolvedValue({})

    const result = await service.sendWork({} as never, 'user-1', {
      client_id: '11111111-1111-1111-1111-111111111111',
      note: 'Build ASAP',
      due_date: '2026-07-25',
      space_id: '22222222-2222-2222-2222-222222222222',
      space_item_ids: ['33333333-3333-3333-3333-333333333333'],
      work_kind: 'task_request',
      task_type: 'design',
      client_tag_id: 'impact_elite_coaching',
      client_tag_label: 'Impact Elite Coaching',
    })

    expect(pageGrader.createWork).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      expect.objectContaining({
        client_id: '11111111-1111-1111-1111-111111111111',
        note: 'Build ASAP',
        work: expect.objectContaining({
          title: 'Draft offer page',
          description: 'Need CTA',
          priority: 'high',
          kind: 'task_request',
          task_type: 'design',
          due_at: '2026-07-25',
          tags: ['impact_elite_coaching'],
        }),
      }),
    )
    const createPayload = pageGrader.createWork.mock.calls[0]?.[2] as {
      work?: { description?: string }
    }
    expect(createPayload.work?.description).not.toContain('Operator note:')
    expect(spaces.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      expect.objectContaining({
        due_date: '2026-07-25',
        notes: 'Need CTA\n\nOperator note: Build ASAP',
        custom_data: expect.objectContaining({
          page_grader: expect.objectContaining({
            work_id: 'work-9',
            client_id: '11111111-1111-1111-1111-111111111111',
          }),
        }),
      }),
      undefined,
      undefined,
    )
    expect(result.results[0]?.status).toBe('created')
    expect(createPayload.work).not.toHaveProperty('assignees')
  })

  it('sends the Portal campaign id and omits empty assignees so default rules apply', async () => {
    const campaignId = '99999999-9999-9999-9999-999999999999'
    spaces.getItem.mockResolvedValue({
      id: 'item-1',
      title: 'Redesign replay page',
      notes: 'Brief',
      priority: 'high',
      assignees: [],
      custom_data: {
        work_request: { page_grader_external_campaign_id: campaignId },
      },
      parent_item_id: null,
    })
    pageGrader.createWork.mockResolvedValue({
      status: 201,
      work: {
        id: 'work-10',
        kind: 'task_request',
        client_id: '11111111-1111-1111-1111-111111111111',
        url: 'https://portal.roas.io/launcher?task=work-10',
        assignee_resolution: [],
      },
    })
    spaces.updateItem.mockResolvedValue({})

    await service.sendWork({} as never, 'user-1', {
      client_id: '11111111-1111-1111-1111-111111111111',
      origin: 'page_grader',
      space_id: '22222222-2222-2222-2222-222222222222',
      space_item_ids: ['33333333-3333-3333-3333-333333333333'],
      task_type: 'funnel',
    })

    expect(pageGrader.createWork).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      expect.objectContaining({
        client_id: '11111111-1111-1111-1111-111111111111',
        campaign_id: campaignId,
        source: expect.objectContaining({ origin: 'page_grader' }),
        work: expect.not.objectContaining({ assignees: expect.anything() }),
      }),
    )
  })

  it('pages through all Page Grader clients for settings listing', async () => {
    pageGrader.listClients
      .mockResolvedValueOnce(
        Array.from({ length: 100 }, (_, i) => ({
          id: `c-${i}`,
          name: `Client ${i}`,
          status: 'active',
        })),
      )
      .mockResolvedValueOnce([
        { id: 'c-100', name: 'Client 100', status: 'active' },
        { id: 'c-101', name: 'Client 101', status: 'active' },
      ])
    svc.client.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'ui-1', metadata: {} },
              }),
            })),
          })),
        })),
      })),
    })

    const result = await service.listClients('user-1', {})

    expect(pageGrader.listClients).toHaveBeenCalledTimes(2)
    expect(pageGrader.listClients).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      { q: undefined, limit: 100, offset: 0, includeAllStatuses: true, includeInactive: true },
    )
    expect(pageGrader.listClients).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      { q: undefined, limit: 100, offset: 100, includeAllStatuses: true, includeInactive: true },
    )
    expect(result.clients).toHaveLength(102)
  })

  it('returns safe Page Grader Meta context through the stored connection', async () => {
    const metaContext = {
      client: { id: 'client-1', name: 'Acme' },
      connected: true,
      accounts: [{ ad_account_id: 'act_123', active: true }],
      recommended_ad_account_id: 'act_123',
      pages: [],
      pixels: [],
      campaigns: [],
      provenance: { source: 'page_grader', generated_at: '2026-07-19T20:00:00.000Z' },
    }
    pageGrader.getClientMetaContext.mockResolvedValue(metaContext)

    const result = await service.getClientMetaContext('user-1', 'client-1')

    expect(pageGrader.getClientMetaContext).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      'client-1',
    )
    expect(result).toEqual({ meta_context: metaContext })
  })
})
