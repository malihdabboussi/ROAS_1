import { afterEach, describe, expect, it, vi } from 'vitest'
import { deriveProjectSessionKey } from '@vibey/api-shared'
import { ProjectRuntimeRepository } from './repositories/project-runtime.repository'
import { ProjectAgentCallService } from './services/project-agent-call.service'

function createService() {
  return new ProjectAgentCallService(
    new ProjectRuntimeRepository({ client: { from: vi.fn() } } as never),
    {} as never,
    {} as never,
    {} as never,
  )
}

describe('ProjectAgentCallService session validation', () => {
  afterEach(() => {
    delete process.env.VIBEY_SESSION_KEY
  })

  it('accepts a project-bound key only for the matching project', () => {
    process.env.VIBEY_SESSION_KEY = 'root-secret'
    const service = createService()
    const projectOneKey = deriveProjectSessionKey('project-1', 'root-secret')

    expect(service.validateSessionKey('project-1', projectOneKey)).toBe(true)
    expect(service.validateSessionKey('project-2', projectOneKey)).toBe(false)
    expect(service.validateSessionKey('project-1', 'root-secret')).toBe(false)
  })
})
