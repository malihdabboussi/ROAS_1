import { describe, expect, it, vi } from 'vitest'
import type { OpenClawAgentRuntimeInspection } from '../../shared/services/openclaw-gateway.service'
import { AgentRuntimeReadinessService } from './agent-runtime-readiness.service'

function inspection(
  overrides: Partial<OpenClawAgentRuntimeInspection>,
): OpenClawAgentRuntimeInspection {
  return {
    agentId: 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas',
    exists: true,
    workspace: '/agents/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/atlas',
    expectedWorkspace: '/agents/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/atlas',
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
    ...overrides,
  }
}

describe('AgentRuntimeReadinessService', () => {
  it('runs one targeted org sync on readiness miss, then caches readiness', async () => {
    const syncService = {
      syncOrgAgent: vi.fn().mockResolvedValue({ healthy: true }),
      syncAgent: vi.fn(),
    }
    const gateway = {
      inspectAgentRuntime: vi
        .fn()
        .mockResolvedValueOnce(
          inspection({
            ready: false,
            workspaceValid: false,
            reasons: ['workspace_path_mismatch'],
          }),
        )
        .mockResolvedValueOnce(inspection({ ready: true })),
    }
    const service = new AgentRuntimeReadinessService(syncService as any, gateway as any)
    const input = {
      userId: 'user-1',
      orgId: '19847dc5-a29a-4684-87d0-4cf6560baa10',
      agentKey: 'atlas',
      gatewayAgentId: 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas',
    }

    const first = await service.ensureRuntimeReady(input)
    const second = await service.ensureRuntimeReady(input)

    expect(first.ready).toBe(true)
    expect(first.repaired).toBe(true)
    expect(second.ready).toBe(true)
    expect(second.repaired).toBe(false)
    expect(syncService.syncOrgAgent).toHaveBeenCalledTimes(1)
    expect(syncService.syncOrgAgent).toHaveBeenCalledWith(
      '19847dc5-a29a-4684-87d0-4cf6560baa10',
      'atlas',
    )
    expect(syncService.syncAgent).not.toHaveBeenCalled()
    expect(gateway.inspectAgentRuntime).toHaveBeenCalledTimes(2)
  })

  it('runs personal sync for personal agent readiness miss', async () => {
    const syncService = {
      syncOrgAgent: vi.fn(),
      syncAgent: vi.fn().mockResolvedValue({ healthy: true }),
    }
    const gateway = {
      inspectAgentRuntime: vi
        .fn()
        .mockResolvedValueOnce(inspection({ ready: false, reasons: ['missing_SOUL.md'] }))
        .mockResolvedValueOnce(inspection({ ready: true })),
    }
    const service = new AgentRuntimeReadinessService(syncService as any, gateway as any)

    await service.ensureRuntimeReady({
      userId: 'user-1',
      orgId: null,
      agentKey: 'atlas',
      gatewayAgentId: 'atlas',
    })

    expect(syncService.syncAgent).toHaveBeenCalledWith('atlas', 'user-1')
    expect(syncService.syncOrgAgent).not.toHaveBeenCalled()
  })

  it('runs personal sync for user-scoped personal gateway ids', async () => {
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const syncService = {
      syncOrgAgent: vi.fn(),
      syncAgent: vi.fn().mockResolvedValue({ healthy: true }),
    }
    const gateway = {
      inspectAgentRuntime: vi
        .fn()
        .mockResolvedValueOnce(inspection({ ready: false, reasons: ['missing_SOUL.md'] }))
        .mockResolvedValueOnce(inspection({ ready: true })),
    }
    const service = new AgentRuntimeReadinessService(syncService as any, gateway as any)

    await service.ensureRuntimeReady({
      userId,
      orgId: null,
      agentKey: 'atlas',
      gatewayAgentId: `user-${userId}-atlas`,
    })

    expect(syncService.syncAgent).toHaveBeenCalledWith('atlas', userId)
    expect(syncService.syncOrgAgent).not.toHaveBeenCalled()
    expect(gateway.inspectAgentRuntime).toHaveBeenCalledWith(`user-${userId}-atlas`, [])
  })

  it('throws after one failed repair attempt', async () => {
    const syncService = {
      syncOrgAgent: vi.fn().mockResolvedValue({ healthy: false }),
      syncAgent: vi.fn(),
    }
    const gateway = {
      inspectAgentRuntime: vi
        .fn()
        .mockResolvedValueOnce(inspection({ ready: false, reasons: ['missing_SOUL.md'] }))
        .mockResolvedValueOnce(inspection({ ready: false, reasons: ['missing_SOUL.md'] })),
    }
    const service = new AgentRuntimeReadinessService(syncService as any, gateway as any)

    await expect(
      service.ensureRuntimeReady({
        userId: 'user-1',
        orgId: '19847dc5-a29a-4684-87d0-4cf6560baa10',
        agentKey: 'atlas',
        gatewayAgentId: 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas',
      }),
    ).rejects.toThrow('runtime_not_ready')
    expect(syncService.syncOrgAgent).toHaveBeenCalledTimes(1)
  })

  it('repairs when required slash skill files are missing despite base readiness', async () => {
    const requiredSkillFiles = [
      {
        skillKey: 'kt-carousel-producer',
        kind: 'resource' as const,
        filePath: 'skills/kt-carousel-producer/references/kt-design-system.md',
      },
    ]
    const syncService = {
      syncOrgAgent: vi.fn().mockResolvedValue({ healthy: true }),
      syncAgent: vi.fn(),
      syncRequiredSkillsForAgent: vi.fn().mockResolvedValue(1),
    }
    const gateway = {
      inspectAgentRuntime: vi
        .fn()
        .mockResolvedValueOnce(
          inspection({
            ready: false,
            reasons: [
              'missing_skill_resource:kt-carousel-producer/skills/kt-carousel-producer/references/kt-design-system.md',
            ],
            requiredSkillFiles: {
              'kt-carousel-producer:skills/kt-carousel-producer/references/kt-design-system.md': false,
            },
          }),
        )
        .mockResolvedValueOnce(
          inspection({
            ready: true,
            requiredSkillFiles: {
              'kt-carousel-producer:skills/kt-carousel-producer/references/kt-design-system.md': true,
            },
          }),
        ),
    }
    const service = new AgentRuntimeReadinessService(syncService as any, gateway as any)

    await service.ensureRuntimeReady({
      userId: 'user-1',
      orgId: '19847dc5-a29a-4684-87d0-4cf6560baa10',
      agentKey: 'vibey',
      gatewayAgentId: 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey',
      requiredSkillFiles,
    })

    expect(syncService.syncOrgAgent).toHaveBeenCalledWith(
      '19847dc5-a29a-4684-87d0-4cf6560baa10',
      'vibey',
    )
    expect(syncService.syncRequiredSkillsForAgent).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: '19847dc5-a29a-4684-87d0-4cf6560baa10',
      agentKey: 'vibey',
      skillKeys: ['kt-carousel-producer'],
    })
    expect(gateway.inspectAgentRuntime).toHaveBeenCalledWith(
      'org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey',
      requiredSkillFiles,
    )
  })

  it('resetAll clears cached readiness and in-flight repair state', async () => {
    let releaseRepair!: () => void
    const syncService = {
      syncOrgAgent: vi.fn(),
      syncAgent: vi.fn(
        () =>
          new Promise((resolve) => {
            releaseRepair = () => resolve({ healthy: true })
          }),
      ),
    }
    const gateway = {
      inspectAgentRuntime: vi
        .fn()
        .mockResolvedValueOnce(inspection({ ready: true }))
        .mockResolvedValueOnce(inspection({ ready: false, reasons: ['missing_SOUL.md'] }))
        .mockResolvedValueOnce(inspection({ ready: true }))
        .mockResolvedValueOnce(inspection({ ready: true })),
    }
    const service = new AgentRuntimeReadinessService(syncService as any, gateway as any)
    const input = {
      userId: 'user-1',
      orgId: null,
      agentKey: 'atlas',
      gatewayAgentId: 'atlas',
    }

    await service.ensureRuntimeReady(input)
    const repair = service.ensureRuntimeReady({
      ...input,
      agentKey: 'vibey',
      gatewayAgentId: 'vibey',
    })
    await Promise.resolve()
    await Promise.resolve()
    service.resetAll()
    releaseRepair()
    await repair
    await service.ensureRuntimeReady(input)

    expect(gateway.inspectAgentRuntime).toHaveBeenCalledTimes(4)
    expect(syncService.syncAgent).toHaveBeenCalledTimes(1)
  })
})
