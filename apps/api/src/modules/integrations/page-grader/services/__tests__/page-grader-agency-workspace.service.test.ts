import { describe, expect, it, vi } from 'vitest'
import { PageGraderAgencyWorkspaceService } from '../page-grader-agency-workspace.service'

describe('PageGraderAgencyWorkspaceService', () => {
  it('returns the Page Grader client workspace before an unmapped Brain import', async () => {
    const api = {
      getClientWorkspace: vi.fn().mockResolvedValue({
        client: { id: 'client-1', name: 'New Client' },
        campaigns: [],
        tasks: [{ id: 'task-1', title: 'Welcome call' }],
        requests: [],
      }),
      getClientScopeMap: vi.fn().mockResolvedValue({}),
    }
    const brainImport = { importClientBrain: vi.fn() }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)

    const result = await service.getClient(
      {} as never,
      'user-1',
      { orgId: 'org-1' } as never,
      'client-1',
      { sync: false },
    )

    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      client: { id: 'client-1' },
      tasks: [{ id: 'task-1' }],
      mapping: null,
      campaign_spaces: [],
    })
  })

  it('lists unmapped campaigns without waiting for a Brain import when sync is disabled', async () => {
    const api = {
      listClientCampaigns: vi.fn().mockResolvedValue([
        {
          id: 'campaign-1',
          client_id: 'client-1',
          name: 'Launch',
        },
      ]),
      getClientScopeMap: vi.fn().mockResolvedValue({}),
    }
    const brainImport = { importClientBrain: vi.fn() }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)

    const result = await service.listCampaigns({} as never, 'user-1', { orgId: 'org-1' } as never, {
      sync: false,
    })

    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
    expect(result.campaigns).toEqual([
      expect.objectContaining({ id: 'campaign-1', roas_space_id: null }),
    ])
  })

  it('lists launches without waiting for Space mapping when sync is disabled', async () => {
    const api = {
      listLaunches: vi.fn().mockResolvedValue([
        {
          id: 'campaign-1:launch:2026-08-20',
          kind: 'launch',
          day_key: '2026-08-20',
          name: 'Fall Launch',
          campaign_id: 'campaign-1',
          client_id: 'client-1',
        },
      ]),
      getClientScopeMap: vi.fn().mockResolvedValue({}),
    }
    const brainImport = { importClientBrain: vi.fn() }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)

    const result = await service.listLaunches({} as never, 'user-1', { orgId: 'org-1' } as never, {
      sync: false,
    })

    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
    expect(api.getClientScopeMap).not.toHaveBeenCalled()
    expect(result.launches).toEqual([
      expect.objectContaining({
        id: 'campaign-1:launch:2026-08-20',
        roas_space_id: null,
      }),
    ])
  })

  it('bootstraps unmapped clients through the Brain import', async () => {
    const api = {
      listClients: vi.fn().mockResolvedValue({
        clients: [{ id: 'client-1', name: 'Clogged Club' }],
        client_scope_map: {},
      }),
      getClientScopeMap: vi.fn().mockResolvedValue({
        'client-1': { campaign_id: 'roas-campaign-1', space_id: 'space-general' },
      }),
    }
    const brainImport = { importClientBrain: vi.fn().mockResolvedValue({ success: true }) }
    const supabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => {
            const result = {
              data: table === 'campaigns' ? [{ id: 'roas-campaign-1' }] : [{ id: 'space-general' }],
              is: vi.fn(),
            }
            result.is.mockResolvedValue({ data: result.data })
            return result
          }),
        })),
      })),
    }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)
    const result = await service.listClients(
      supabase as never,
      'user-1',
      { orgId: 'org-1' } as never,
      {
        sync: true,
      },
    )
    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      supabase,
      'user-1',
      { client_id: 'client-1', campaignName: 'Clogged Club' },
      'org-1',
    )
    expect(result.clients[0]?.mapping).toMatchObject({
      campaign_id: 'roas-campaign-1',
      campaign_exists: true,
      general_space_exists: true,
    })
  })

  it('writes campaign updates to the canonical Page Grader path', async () => {
    const api = {
      updateWorkspaceEntity: vi.fn().mockResolvedValue({
        campaign: { id: 'camp-1' },
        roas_push: { pushed: false },
      }),
    }
    const brainImport = { importClientBrain: vi.fn().mockResolvedValue({ success: true }) }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)
    await service.patchEntity({} as never, 'user-1', { orgId: 'org-1' } as never, {
      clientId: 'client-1',
      kind: 'campaign',
      entityId: 'camp-1',
      patch: { event_date: '2026-09-01' },
    })
    expect(api.updateWorkspaceEntity).toHaveBeenCalledWith(
      'user-1',
      '/clients/client-1/campaigns/camp-1',
      { event_date: '2026-09-01' },
    )
    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      {},
      'user-1',
      { client_id: 'client-1' },
      'org-1',
    )
  })

  it('mirrors campaign overview tasks before returning clickable ROAS task ids', async () => {
    const api = {
      getCampaignOverview: vi.fn().mockResolvedValue({
        campaign: { id: 'page-grader-campaign-1' },
        tasks: [{ id: 'task-1', campaign_id: 'page-grader-campaign-1' }],
      }),
      getClientScopeMap: vi.fn().mockResolvedValue({
        'client-1': { campaign_id: 'roas-campaign-1', space_id: 'general-space' },
      }),
    }
    const taskSync = {
      syncWorkspaceTasks: vi.fn().mockResolvedValue({
        itemIds: new Map([['task-1', 'space-item-1']]),
        synced: 1,
        skipped: 0,
        errors: [],
      }),
    }
    const service = new PageGraderAgencyWorkspaceService(
      api as never,
      {} as never,
      taskSync as never,
    )
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'campaign-space-1',
                title: 'Launch',
                schema: {
                  custom_data: { page_grader_campaign_id: 'page-grader-campaign-1' },
                },
              },
            ],
            error: null,
          }),
        })),
      })),
    }

    const result = await service.getCampaignOverview(
      supabase as never,
      'user-1',
      { orgId: 'org-1' } as never,
      'client-1',
      'page-grader-campaign-1',
    )

    expect(taskSync.syncWorkspaceTasks).toHaveBeenCalledWith(
      supabase,
      'user-1',
      { orgId: 'org-1' },
      'client-1',
      [{ id: 'task-1', campaign_id: 'page-grader-campaign-1' }],
      { campaign_id: 'roas-campaign-1', space_id: 'general-space' },
      [
        {
          page_grader_campaign_id: 'page-grader-campaign-1',
          space_id: 'campaign-space-1',
          space_title: 'Launch',
        },
      ],
    )
    expect(result.tasks).toEqual([
      expect.objectContaining({ id: 'task-1', roas_space_item_id: 'space-item-1' }),
    ])
    expect(result.task_sync).toEqual({ synced: 1, skipped: 0, errors: [] })
  })

  it('does not duplicate a successful Page Grader Brain webhook', async () => {
    const api = {
      updateWorkspaceEntity: vi.fn().mockResolvedValue({
        client: { id: 'client-1' },
        roas_push: { pushed: true },
      }),
    }
    const brainImport = { importClientBrain: vi.fn() }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)
    const result = await service.patchEntity({} as never, 'user-1', { orgId: 'org-1' } as never, {
      clientId: 'client-1',
      kind: 'client',
      patch: { friendly_name: 'Clogged Club' },
    })
    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
    expect(result.brain_sync).toEqual({ status: 'webhook_dispatched' })
  })

  it('writes task status updates to the canonical Page Grader path', async () => {
    const api = { updateWorkspaceEntity: vi.fn().mockResolvedValue({ task: { id: 'task-1' } }) }
    const brainImport = { importClientBrain: vi.fn() }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)
    await service.patchEntity({} as never, 'user-1', { orgId: 'org-1' } as never, {
      clientId: 'client-1',
      kind: 'task',
      entityId: 'task-1',
      patch: { status: 'completed' },
    })
    expect(api.updateWorkspaceEntity).toHaveBeenCalledWith(
      'user-1',
      '/clients/client-1/tasks/task-1',
      { status: 'completed' },
    )
    expect(brainImport.importClientBrain).not.toHaveBeenCalled()
  })

  it('uses the canonical Brain import to refresh client campaign Spaces', async () => {
    const api = {
      getClientWorkspace: vi.fn().mockResolvedValue({
        client: { id: 'client-1', name: 'Clogged Club' },
        campaigns: [{ id: 'page-grader-campaign-1', name: 'Launch' }],
      }),
      getClientScopeMap: vi.fn().mockResolvedValue({
        'client-1': { campaign_id: 'roas-campaign-1', space_id: 'space-general' },
      }),
    }
    const brainImport = {
      importClientBrain: vi.fn().mockResolvedValue({
        campaignSpaces: [
          {
            page_grader_campaign_id: 'page-grader-campaign-1',
            space_id: 'space-campaign-1',
            title: 'Launch',
          },
        ],
      }),
    }
    const service = new PageGraderAgencyWorkspaceService(api as never, brainImport as never)
    const result = await service.getClient(
      {} as never,
      'user-1',
      { orgId: 'org-1' } as never,
      'client-1',
    )

    expect(brainImport.importClientBrain).toHaveBeenCalledWith(
      {},
      'user-1',
      { client_id: 'client-1', campaignName: 'Clogged Club' },
      'org-1',
    )
    expect(result.campaign_spaces).toEqual([
      {
        page_grader_campaign_id: 'page-grader-campaign-1',
        space_id: 'space-campaign-1',
        space_title: 'Launch',
      },
    ])
  })
})
