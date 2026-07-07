import { describe, expect, it, vi } from 'vitest'
import { AgentManagementService } from './agent-management.service'

function makeService(opts?: { syncReady?: boolean; syncHealthy?: boolean }) {
  const agentReady = { agent_key: 'pixel', sync_status: 'ready' }
  const agentFailed = { agent_key: 'pixel', sync_status: 'failed' }
  const missionsRepository = {
    updateAgentSyncStatus: vi.fn(),
    getAgent: vi
      .fn()
      .mockResolvedValueOnce({ agent_key: 'pixel', sync_status: 'syncing' })
      .mockImplementation(() => (opts?.syncReady === false ? agentFailed : agentReady)),
  }
  const missionAgentGatewayService = {
    triggerAgentSkillsSyncDetailed: vi.fn().mockResolvedValue({
      ok: true,
      synced: 3,
      expected: 3,
      failed: [],
      retried: 0,
      retriedOk: 0,
      healthy: opts?.syncHealthy ?? true,
      inspection: {
        ready: opts?.syncReady ?? true,
        reasons: opts?.syncReady === false ? ['missing_SOUL.md'] : [],
      },
    }),
    getServiceRoleClient: vi.fn(),
  }
  const service = new AgentManagementService(
    missionsRepository as never,
    missionAgentGatewayService as never,
    {} as never,
    {} as never,
    {} as never,
  )
  vi.spyOn(service, 'assertCanManageAgent').mockResolvedValue(undefined)

  return { service, missionsRepository, missionAgentGatewayService }
}

describe('AgentManagementService repairAgentSetup', () => {
  it('marks setup ready when sync and runtime inspection are healthy', async () => {
    const { service, missionsRepository, missionAgentGatewayService } = makeService()
    const supabase = {} as never

    const result = await service.repairAgentSetup(supabase, 'user-1', 'pixel', 'org-1')

    expect(service.assertCanManageAgent).toHaveBeenCalledWith(supabase, 'user-1', 'pixel', 'org-1')
    expect(missionAgentGatewayService.triggerAgentSkillsSyncDetailed).toHaveBeenCalledWith(
      'user-1',
      'pixel',
      'org-1',
      true,
    )
    expect(missionsRepository.updateAgentSyncStatus).toHaveBeenNthCalledWith(
      1,
      supabase,
      'user-1',
      'pixel',
      'syncing',
      'org-1',
    )
    expect(missionsRepository.updateAgentSyncStatus).toHaveBeenNthCalledWith(
      2,
      supabase,
      'user-1',
      'pixel',
      'ready',
      'org-1',
    )
    expect(result).toMatchObject({ ok: true, repaired: true, sync_status: 'ready' })
  })

  it('marks setup failed when runtime inspection is not ready', async () => {
    const { service, missionsRepository } = makeService({ syncReady: false })
    const supabase = {} as never

    const result = await service.repairAgentSetup(supabase, 'user-1', 'pixel', 'org-1')

    expect(missionsRepository.updateAgentSyncStatus).toHaveBeenNthCalledWith(
      2,
      supabase,
      'user-1',
      'pixel',
      'failed',
      'org-1',
    )
    expect(result).toMatchObject({
      ok: false,
      repaired: false,
      sync_status: 'failed',
      reasons: ['missing_SOUL.md', 'runtime_not_ready'],
    })
  })
})

describe('AgentManagementService agent state operations', () => {
  it('lists the current user state rows for agents', async () => {
    const rows = [{ agent_id: 'agent-1', is_favorite: true, updated_at: '2026-06-16T08:00:00Z' }]
    const stateQuery = {
      data: rows,
      error: null,
      select: vi.fn(function (this: unknown) {
        return this
      }),
      eq: vi.fn(function (this: unknown) {
        return this
      }),
    }
    const supabase = {
      from: vi.fn(() => stateQuery),
    }
    const missionsRepository = {
      listAgentUserState: vi.fn().mockResolvedValue(rows),
    }
    const service = new AgentManagementService(
      missionsRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await expect(service.listAgentUserState(supabase as never, 'user-1')).resolves.toEqual(rows)
  })

  it('upserts user state after resolving the scoped agent row', async () => {
    const saved = { agent_id: 'agent-1', is_favorite: true, updated_at: '2026-06-16T08:00:00Z' }
    const registryQuery = {
      select: vi.fn(function (this: unknown) {
        return this
      }),
      eq: vi.fn(function (this: unknown) {
        return this
      }),
      is: vi.fn(function (this: unknown) {
        return this
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'agent-1' }, error: null }),
    }
    const stateQuery = {
      upsert: vi.fn(function (this: unknown) {
        return this
      }),
      select: vi.fn(function (this: unknown) {
        return this
      }),
      single: vi.fn().mockResolvedValue({ data: saved, error: null }),
    }
    const supabase = {
      from: vi.fn((table: string) => (table === 'agents_registry' ? registryQuery : stateQuery)),
    }
    const missionsRepository = {
      findAgentRegistryIdInScope: vi.fn().mockResolvedValue('agent-1'),
      upsertAgentUserState: vi.fn().mockResolvedValue(saved),
    }
    const service = new AgentManagementService(
      missionsRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await expect(
      service.upsertAgentUserState(supabase as never, 'user-1', 'pixel', 'org-1', {
        is_favorite: true,
      }),
    ).resolves.toEqual(saved)
  })
})

describe('AgentManagementService gateway registration', () => {
  it('passes stored agent definitions into the runtime gateway registration', async () => {
    const definitionRows = [{ file_name: 'SOUL.md', content: '# Pixel' }]
    const definitionsQuery = {
      data: definitionRows,
      error: null,
      select: vi.fn(function (this: unknown) {
        return this
      }),
      eq: vi.fn(function (this: unknown) {
        return this
      }),
    }
    const serviceSupabase = { from: vi.fn(() => definitionsQuery) }
    const missionsRepository = {
      listOrgAgents: vi.fn().mockResolvedValue([
        { agent_key: 'pixel', name: 'Pixel' },
        { agent_key: 'hr', name: 'Jaime' },
      ]),
      listAgentDefinitionsForGatewayRegistration: vi.fn().mockResolvedValue(definitionRows),
    }
    const missionAgentGatewayService = {
      getServiceRoleClient: vi.fn(() => serviceSupabase),
      registerAgentInGateway: vi.fn().mockResolvedValue(true),
    }
    const service = new AgentManagementService(
      missionsRepository as never,
      missionAgentGatewayService as never,
      {} as never,
      {} as never,
      {} as never,
    )

    const result = await service.registerAllAgentsInGateway({} as never, 'user-1')

    expect(result).toMatchObject({ ok: true, total: 2, registered: 2 })
    expect(missionAgentGatewayService.registerAgentInGateway).toHaveBeenCalledWith(
      'user-1',
      'pixel',
      'Pixel',
      definitionRows,
    )
    expect(missionAgentGatewayService.registerAgentInGateway).not.toHaveBeenCalledWith(
      'user-1',
      'hr',
      expect.anything(),
      expect.anything(),
    )
  })
})
