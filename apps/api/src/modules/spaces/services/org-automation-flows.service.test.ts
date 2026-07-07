import { describe, expect, it, vi } from 'vitest'
import { OrgAutomationFlowsService } from './org-automation-flows.service'

function createSupabase() {
  const campaignQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [{ id: 'campaign-a', name: 'Campaign A' }],
      error: null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
    campaignQuery,
  }
}

describe('OrgAutomationFlowsService', () => {
  it('groups Flow installations into one reusable Flow definition card', async () => {
    const definitionsRepo = {
      listInstallationsForOrg: vi.fn().mockResolvedValue([
        {
          id: 'install-a',
          automation_id: 'automation-a',
          version_id: 'version-1',
          enabled: true,
          validation_status: 'healthy',
          validation_errors: [],
          created_at: '2026-06-24T09:00:00.000Z',
          updated_at: '2026-06-24T09:00:00.000Z',
          flow_definitions: {
            id: 'definition-1',
            name: 'Lead follow-up',
            description: 'Reusable lead flow',
            status: 'active',
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment' }],
          },
          space_automations: {
            id: 'automation-a',
            name: 'Lead follow-up',
            description: 'Space A install',
            enabled: true,
            is_draft: false,
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment' }],
            created_at: '2026-06-24T09:00:00.000Z',
            updated_at: '2026-06-24T09:00:00.000Z',
          },
          spaces: {
            id: 'space-a',
            title: 'Hadassah Limassol',
            campaign_id: 'campaign-a',
          },
        },
        {
          id: 'install-b',
          automation_id: 'automation-b',
          version_id: 'version-1',
          enabled: false,
          validation_status: 'needs_setup',
          validation_errors: [{ field: 'status' }],
          created_at: '2026-06-24T09:05:00.000Z',
          updated_at: '2026-06-24T09:05:00.000Z',
          flow_definitions: {
            id: 'definition-1',
            name: 'Lead follow-up',
            description: 'Reusable lead flow',
            status: 'active',
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment' }],
          },
          space_automations: {
            id: 'automation-b',
            name: 'Lead follow-up',
            description: 'Space B install',
            enabled: false,
            is_draft: false,
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment' }],
            created_at: '2026-06-24T09:05:00.000Z',
            updated_at: '2026-06-24T09:05:00.000Z',
          },
          spaces: {
            id: 'space-b',
            title: 'Hadassah Nicosia',
            campaign_id: 'campaign-a',
          },
        },
      ]),
    }
    const service = new OrgAutomationFlowsService({} as never, definitionsRepo as never, {} as never)
    const supabase = createSupabase()

    const result = await service.listOrgFlows(supabase as never, 'org-1', {
      campaignId: 'campaign-a',
      spaceId: null,
    })

    expect(definitionsRepo.listInstallationsForOrg).toHaveBeenCalledWith(supabase, 'org-1', {
      campaignId: 'campaign-a',
      spaceId: null,
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'automation-a',
      flow_definition_id: 'definition-1',
      name: 'Lead follow-up',
      description: 'Reusable lead flow',
      enabled: true,
      is_draft: false,
      space_id: null,
      space_title: null,
      campaign_id: 'campaign-a',
      campaign_name: 'Campaign A',
      installation_count: 2,
      healthy_installation_count: 1,
      needs_setup_installation_count: 1,
      unknown_installation_count: 0,
    })
    expect(result[0].installations).toEqual([
      expect.objectContaining({
        id: 'automation-a',
        automation_id: 'automation-a',
        flow_installation_id: 'install-a',
        space_id: 'space-a',
        space_title: 'Hadassah Limassol',
        campaign_name: 'Campaign A',
        validation_status: 'healthy',
      }),
      expect.objectContaining({
        id: 'automation-b',
        automation_id: 'automation-b',
        flow_installation_id: 'install-b',
        space_id: 'space-b',
        space_title: 'Hadassah Nicosia',
        campaign_name: 'Campaign A',
        validation_status: 'needs_setup',
      }),
    ])
  })

  it('returns an existing concept space when one is already provisioned', async () => {
    const spacesRepo = { createSpace: vi.fn() }
    const service = new OrgAutomationFlowsService({} as never, {} as never, spacesRepo as never)
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'concept-space-1',
              title: 'Flow concepts',
              schema: { custom_data: { vibey_flows_concept_space: true } },
            },
          ],
          error: null,
        }),
      })),
    }

    await expect(
      service.ensureConceptSpace(supabase as never, 'org-1', 'user-1'),
    ).resolves.toEqual({
      space_id: 'concept-space-1',
      title: 'Flow concepts',
      created: false,
    })
    expect(spacesRepo.createSpace).not.toHaveBeenCalled()
  })

  it('creates a concept space when none exists', async () => {
    const spacesRepo = {
      createSpace: vi.fn().mockResolvedValue({
        id: 'concept-space-new',
        title: 'Flow concepts',
      }),
    }
    const service = new OrgAutomationFlowsService({} as never, {} as never, spacesRepo as never)
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    }

    await expect(
      service.ensureConceptSpace(supabase as never, 'org-1', 'user-1'),
    ).resolves.toEqual({
      space_id: 'concept-space-new',
      title: 'Flow concepts',
      created: true,
    })
    expect(spacesRepo.createSpace).toHaveBeenCalledWith(
      supabase,
      'user-1',
      expect.objectContaining({ title: 'Flow concepts' }),
      'org-1',
    )
  })
})
