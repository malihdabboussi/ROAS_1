import { describe, expect, it } from 'vitest'
import { AgentRuntimeService } from './agent-runtime.service'

describe('AgentRuntimeService Dream Ops sessions', () => {
  it('builds the dedicated Dream Ops session key and lane', () => {
    const service = new AgentRuntimeService()

    expect(
      service.buildDreamOpsSessionKey({
        gatewayAgentId: 'org-org-1-hr',
        userId: 'user-1',
        runId: 'run-1',
        orgId: 'org-1',
      }),
    ).toBe('agent:org-org-1-hr:dream_ops:hr:user-1:run-1::org:org-1')

    expect(service.buildDreamOpsLane({ orgId: 'org-1', userId: 'user-1', runId: 'run-1' })).toBe(
      'dream_ops:org-1:user-1:run-1',
    )
  })
})
