import { describe, expect, it, vi } from 'vitest'
import { OrgAutomationFlowsController } from './org-automation-flows.controller'

function createController() {
  const orgFlowsService = {
    listOrgFlows: vi.fn().mockResolvedValue([{ id: 'flow-1' }]),
    listPersonalFlows: vi.fn(),
    listOrgRuns: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
    listPersonalRuns: vi.fn(),
    ensureConceptSpace: vi.fn().mockResolvedValue({
      space_id: 'concept-space-1',
      title: 'Flow concepts',
      created: false,
    }),
  }
  const templatesRepo = {
    listActive: vi.fn().mockResolvedValue([{ template_key: 'daily-digest' }]),
  }
  const controller = new OrgAutomationFlowsController(
    orgFlowsService as never,
    templatesRepo as never,
  )
  const supabase = { from: vi.fn() }
  const scope = { orgId: 'org-1', orgRole: 'admin', userId: 'user-1' }
  return { controller, orgFlowsService, templatesRepo, scope, supabase, user: { id: 'user-1' } }
}

describe('OrgAutomationFlowsController', () => {
  it('lists org templates without a selected space', async () => {
    const { controller, templatesRepo, supabase } = createController()

    await expect(controller.listOrgTemplates(supabase as never)).resolves.toEqual([
      { template_key: 'daily-digest' },
    ])
    expect(templatesRepo.listActive).toHaveBeenCalledWith(supabase)
  })

  it('lists org runs with campaign and space filters', async () => {
    const { controller, orgFlowsService, scope, supabase, user } = createController()

    await expect(
      controller.listOrgRuns(
        user as never,
        supabase as never,
        'campaign-1',
        'space-1',
        scope as never,
      ),
    ).resolves.toEqual([{ id: 'run-1' }])
    expect(orgFlowsService.listOrgRuns).toHaveBeenCalledWith(supabase, 'org-1', {
      campaignId: 'campaign-1',
      spaceId: 'space-1',
    })
  })

  it('lists personal flows when org context is absent', async () => {
    const orgFlowsService = {
      listOrgFlows: vi.fn(),
      listPersonalFlows: vi.fn().mockResolvedValue([{ id: 'flow-personal' }]),
      listOrgRuns: vi.fn(),
      listPersonalRuns: vi.fn(),
      ensureConceptSpace: vi.fn(),
    }
    const templatesRepo = { listActive: vi.fn() }
    const controller = new OrgAutomationFlowsController(
      orgFlowsService as never,
      templatesRepo as never,
    )
    const supabase = { from: vi.fn() }
    const user = { id: 'user-1' }

    await expect(
      controller.listOrgFlows(
        user as never,
        supabase as never,
        undefined,
        undefined,
        { orgId: null } as never,
      ),
    ).resolves.toEqual([{ id: 'flow-personal' }])
    expect(orgFlowsService.listPersonalFlows).toHaveBeenCalledWith(supabase, 'user-1', {
      campaignId: null,
      spaceId: null,
    })
  })

  it('ensures a concept space for freeform flow building', async () => {
    const { controller, orgFlowsService, scope, supabase, user } = createController()

    await expect(
      controller.ensureConceptSpace(user as never, supabase as never, scope as never),
    ).resolves.toEqual({
      space_id: 'concept-space-1',
      title: 'Flow concepts',
      created: false,
    })
    expect(orgFlowsService.ensureConceptSpace).toHaveBeenCalledWith(supabase, 'org-1', 'user-1')
  })
})
