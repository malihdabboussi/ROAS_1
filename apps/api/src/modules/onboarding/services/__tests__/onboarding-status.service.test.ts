import { describe, expect, it, vi } from 'vitest'
import { OnboardingRepository } from '../../repositories/onboarding.repository'
import { OnboardingStatusService } from '../onboarding-status.service'

function profileSupabase(row: Record<string, unknown> | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })),
  }
}

function makeService(input?: { state?: string; ready?: boolean; orgOnboarded?: boolean }) {
  const machinesService = {
    flyRuntimeApp: 'vibey-runtimes',
    probeReadyEndpoint: vi.fn().mockResolvedValue(input?.ready ?? false),
    provision: vi.fn().mockResolvedValue({ status: 'running' }),
    ensureRunning: vi.fn().mockResolvedValue({ status: 'running' }),
  }
  const flyState = {
    getMachineState: vi.fn().mockResolvedValue(input?.state ?? 'started'),
  }
  const agentOperations = {
    checkOrgOnboardingStatus: vi.fn().mockResolvedValue({ onboarded: input?.orgOnboarded ?? true }),
    onboardFirstAgent: vi.fn().mockResolvedValue({ ok: true }),
  }
  const service = new OnboardingStatusService(
    machinesService as never,
    flyState as never,
    agentOperations as never,
    new OnboardingRepository(),
  )
  return { service, machinesService, flyState, agentOperations }
}

describe('OnboardingStatusService', () => {
  it('does not report ready until Fly state and ready endpoint both pass', async () => {
    const { service } = makeService({ state: 'started', ready: false })
    const supabase = profileSupabase({
      fly_machine_id: 'machine-1',
      fly_runtime_app: 'vibey-runtimes',
    })

    await expect(
      service.getStatus(supabase as never, 'user-1', {
        userId: 'user-1',
        orgId: null,
        orgRole: null,
      }),
    ).resolves.toMatchObject({
      overall: 'working',
      current_step: 'running_final_check',
      runtime: { ready: false, machine_id: 'machine-1', state: 'started' },
      retry_action: 'ensure_running',
    })
  })

  it('reports ready after Fly state and ready endpoint pass', async () => {
    const { service } = makeService({ state: 'started', ready: true })
    const supabase = profileSupabase({
      fly_machine_id: 'machine-1',
      fly_runtime_app: 'vibey-runtimes',
    })

    await expect(
      service.getStatus(supabase as never, 'user-1', {
        userId: 'user-1',
        orgId: null,
        orgRole: null,
      }),
    ).resolves.toMatchObject({
      overall: 'ready',
      current_step: 'running_final_check',
      runtime: { ready: true, machine_id: 'machine-1', state: 'started' },
      retry_action: null,
    })
  })

  it('reports ready for a shared Railway runtime without checking Fly', async () => {
    const { service, flyState, machinesService } = makeService({ state: 'started', ready: false })
    const supabase = profileSupabase({
      fly_machine_id: null,
      agent_runtime_type: 'shared_railway',
      agent_runtime_url: 'https://railway-agent.vibey.test',
    })

    await expect(
      service.getStatus(supabase as never, 'user-1', {
        userId: 'user-1',
        orgId: null,
        orgRole: null,
      }),
    ).resolves.toMatchObject({
      overall: 'ready',
      current_step: 'running_final_check',
      runtime: { ready: true, machine_id: null, state: 'shared_railway' },
      retry_action: null,
    })
    expect(flyState.getMachineState).not.toHaveBeenCalled()
    expect(machinesService.probeReadyEndpoint).not.toHaveBeenCalled()
  })

  it('calls provision when retrying a missing runtime', async () => {
    const { service, machinesService } = makeService()
    const supabase = profileSupabase(null)

    await service.retry(supabase as never, 'user-1', {
      userId: 'user-1',
      orgId: null,
      orgRole: null,
    })

    expect(machinesService.provision).toHaveBeenCalledWith(supabase, 'user-1')
  })
})
