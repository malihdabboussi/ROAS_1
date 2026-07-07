import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { AgentSyncController } from './agent-sync.controller'

const syncResult = {
  synced: 3,
  expected: 3,
  failed: [],
  retried: 0,
  retriedOk: 0,
  healthy: true,
}

const inspection = {
  agentId: 'agent-1',
  exists: true,
  workspace: '/agents/agent-1',
  expectedWorkspace: '/agents/agent-1',
  workspaceValid: true,
  identityFiles: {
    'SOUL.md': true,
    'ROLE.md': true,
    'IDENTITY.md': true,
  },
  vibeyApiSkillFiles: {
    'SKILL.md': true,
    'ALLOWED_ACTIONS.json': true,
  },
  vibeyApiSkillReady: true,
  requiredSkillFiles: {},
  ready: true,
  reasons: [],
}

function makeController() {
  const syncService = {
    syncAll: vi.fn(),
    syncOrgAgent: vi.fn().mockResolvedValue(syncResult),
    syncAgent: vi.fn().mockResolvedValue(syncResult),
    getAgentsBaseDir: vi.fn().mockReturnValue('/agents'),
  }
  const readinessService = {
    invalidateRuntime: vi.fn(),
    ensureRuntimeReady: vi.fn().mockResolvedValue({
      ready: true,
      repaired: false,
      inspection,
    }),
  }
  const gateway = {
    inspectAgentRuntime: vi.fn().mockResolvedValue(inspection),
    ensureAgent: vi.fn(),
  }
  const instructionAudit = {
    audit: vi.fn(),
  }
  const instructionRepair = {
    repairPlatformVibeyApiSkills: vi.fn(),
    repairPlatformToolsDefinitions: vi.fn(),
  }
  const controller = new AgentSyncController(
    syncService as never,
    readinessService as never,
    gateway as never,
    instructionAudit as never,
    instructionRepair as never,
    new AgentRuntimeService(),
  )

  return { controller, syncService, readinessService, gateway }
}

describe('AgentSyncController', () => {
  const originalRuntimeMode = process.env.AGENT_RUNTIME_MODE

  afterEach(() => {
    if (originalRuntimeMode === undefined) delete process.env.AGENT_RUNTIME_MODE
    else process.env.AGENT_RUNTIME_MODE = originalRuntimeMode
  })

  it('includes runtime inspection for org sync when requested', async () => {
    const { controller, syncService, readinessService, gateway } = makeController()

    const result = await controller.syncAgent('pixel', {
      user_id: 'user-1',
      org_id: 'org-1',
      inspect: true,
    })

    expect(syncService.syncOrgAgent).toHaveBeenCalledWith('org-1', 'pixel')
    expect(readinessService.invalidateRuntime).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'pixel',
      gatewayAgentId: 'org-org-1-pixel',
    })
    expect(gateway.inspectAgentRuntime).toHaveBeenCalledWith('org-org-1-pixel')
    expect(result).toEqual({ ok: true, ...syncResult, inspection })
  })

  it('includes runtime inspection for personal sync when requested', async () => {
    const { controller, syncService, readinessService, gateway } = makeController()

    const result = await controller.syncAgent('pixel', {
      user_id: 'user-1',
      inspect: true,
    })

    expect(syncService.syncAgent).toHaveBeenCalledWith('pixel', 'user-1')
    expect(readinessService.invalidateRuntime).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: null,
      agentKey: 'pixel',
      gatewayAgentId: 'pixel',
    })
    expect(gateway.inspectAgentRuntime).toHaveBeenCalledWith('pixel')
    expect(result).toEqual({ ok: true, ...syncResult, inspection })
  })

  it('uses user-scoped personal runtime id for inspected sync in shared mode', async () => {
    process.env.AGENT_RUNTIME_MODE = 'shared'
    const { controller, syncService, readinessService, gateway } = makeController()
    const userId = '00000000-0000-4000-8000-000000000001'

    const result = await controller.syncAgent('pixel', {
      user_id: userId,
      inspect: true,
    })

    expect(syncService.syncAgent).toHaveBeenCalledWith('pixel', userId)
    expect(readinessService.invalidateRuntime).toHaveBeenCalledWith({
      userId,
      orgId: null,
      agentKey: 'pixel',
      gatewayAgentId: `user-${userId}-pixel`,
    })
    expect(gateway.inspectAgentRuntime).toHaveBeenCalledWith(`user-${userId}-pixel`)
    expect(result).toEqual({ ok: true, ...syncResult, inspection })
  })

  it('keeps existing sync response when inspection is not requested', async () => {
    const { controller, gateway } = makeController()

    const result = await controller.syncAgent('pixel', { user_id: 'user-1' })

    expect(gateway.inspectAgentRuntime).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, ...syncResult })
  })

  it('ensures runtime readiness using the caller-provided gateway agent id', async () => {
    const { controller, readinessService } = makeController()

    const result = await controller.ensureAgentReady('atlas', {
      user_id: 'user-1',
      org_id: 'org-1',
      gateway_agent_id: 'org-org-1-atlas',
    })

    expect(readinessService.ensureRuntimeReady).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'atlas',
      gatewayAgentId: 'org-org-1-atlas',
    })
    expect(result).toEqual({
      ok: true,
      ready: true,
      repaired: false,
      inspection,
    })
  })

  it('normalizes plain personal ensure-ready ids in shared runtime mode', async () => {
    process.env.AGENT_RUNTIME_MODE = 'shared'
    const { controller, readinessService } = makeController()
    const userId = '00000000-0000-4000-8000-000000000001'

    const result = await controller.ensureAgentReady('atlas', {
      user_id: userId,
      gateway_agent_id: 'atlas',
    })

    expect(readinessService.ensureRuntimeReady).toHaveBeenCalledWith({
      userId,
      orgId: null,
      agentKey: 'atlas',
      gatewayAgentId: `user-${userId}-atlas`,
    })
    expect(result).toEqual({
      ok: true,
      ready: true,
      repaired: false,
      inspection,
    })
  })
})
