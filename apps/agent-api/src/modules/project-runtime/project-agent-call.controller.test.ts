import { describe, expect, it, vi } from 'vitest'
import { ProjectAgentCallController } from './controllers/project-agent-call.controller'

function createResponse() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

describe('ProjectAgentCallController', () => {
  it('validates the session key against the requested project id before calling an agent', async () => {
    const service = {
      validateSessionKey: vi.fn().mockReturnValue(false),
      callAgent: vi.fn(),
    }
    const controller = new ProjectAgentCallController(service as never)
    const res = createResponse()

    await controller.agentCall(
      'project-2',
      'key-derived-for-project-1',
      { agent_key: 'vibey', message: 'hello' },
      res as never,
    )

    expect(service.validateSessionKey).toHaveBeenCalledWith(
      'project-2',
      'key-derived-for-project-1',
    )
    expect(service.callAgent).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
