import { describe, expect, it, vi } from 'vitest'
import { PageGraderAgencyWorkspaceService } from '../page-grader-agency-workspace.service'

describe('PageGraderAgencyWorkspaceService', () => {
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
          in: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({
              data: table === 'campaigns' ? [{ id: 'roas-campaign-1' }] : [{ id: 'space-general' }],
            }),
          })),
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
    const api = { updateWorkspaceEntity: vi.fn().mockResolvedValue({ campaign: { id: 'camp-1' } }) }
    const service = new PageGraderAgencyWorkspaceService(api as never, {} as never)
    await service.patchEntity('user-1', {
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
  })

  it('writes task status updates to the canonical Page Grader path', async () => {
    const api = { updateWorkspaceEntity: vi.fn().mockResolvedValue({ task: { id: 'task-1' } }) }
    const service = new PageGraderAgencyWorkspaceService(api as never, {} as never)
    await service.patchEntity('user-1', {
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
  })
})
