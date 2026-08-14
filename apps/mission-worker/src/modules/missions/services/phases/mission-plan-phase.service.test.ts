import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionPhaseSupportService } from './mission-phase-support.service'
import { MissionPlanPhaseService, requiresAgencyTeamEnsure } from './mission-plan-phase.service'

describe('MissionPlanPhaseService plan callback', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it('ensures the agency team before planning a client strategy mission', () => {
    expect(requiresAgencyTeamEnsure('client-strategy')).toBe(true)
  })

  it('aborts and rejects a stalled plan callback instead of leaving the mission in Planning', async () => {
    vi.useFakeTimers()
    const configService = {
      get: vi.fn((key: string) => (key === 'missionApi.requestTimeoutMs' ? 20 : undefined)),
    }
    const support = {
      withTimeout: MissionPhaseSupportService.prototype.withTimeout,
    }
    const service = new MissionPlanPhaseService(
      configService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      support as never,
      {} as never,
    )
    let callbackSignal: AbortSignal | undefined
    global.fetch = vi.fn((_url, init) => {
      callbackSignal = init?.signal ?? undefined
      return new Promise<Response>(() => {})
    }) as typeof fetch

    const callback = service['postPlanCallback']('https://api.test/internal/plan', 'token', {
      mission_id: 'mission-1',
    })
    const assertion = expect(callback).rejects.toThrow('Plan creation API timed out after 20ms')

    await vi.advanceTimersByTimeAsync(20)
    await assertion

    expect(callbackSignal?.aborted).toBe(true)
  })
})
