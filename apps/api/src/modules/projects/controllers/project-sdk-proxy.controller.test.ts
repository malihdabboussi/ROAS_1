import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deriveProjectSessionKey } from '@vibey/api-shared'
import { ProjectsRepository } from '../repositories/projects.repository'
import { ProjectSdkProxyService } from '../services/project-sdk-proxy.service'
import { ProjectSdkProxyController } from './project-sdk-proxy.controller'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

function createResponse() {
  const res = {
    headersSent: false,
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    setHeader: vi.fn(() => res),
    send: vi.fn(() => res),
    write: vi.fn(() => true),
    end: vi.fn(() => {
      res.headersSent = true
      return res
    }),
  }
  return res
}

function createProjectRepoQuery(project: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    update: vi.fn(() => query),
    single: vi.fn().mockResolvedValue({ data: project, error: null }),
    then: vi.fn((resolve: () => void) => {
      resolve()
      return Promise.resolve()
    }),
  }
  return query
}

function createController(project: unknown = { id: 'project-1' }) {
  const projectQuery = createProjectRepoQuery(project)
  const supabase = {
    from: vi.fn(() => projectQuery),
  }
  mocks.createClient.mockReturnValue(supabase)
  const sandboxService = {
    ensureRunning: vi.fn().mockResolvedValue({
      tunnelUrl: 'https://sandbox.example.com',
      sandboxId: 'sandbox-1',
      status: 'running',
    }),
  }
  const projectsRepository = new ProjectsRepository({ applyScope: vi.fn() } as never)
  const sdkProxyService = new ProjectSdkProxyService(sandboxService as never, projectsRepository)
  const controller = new ProjectSdkProxyController(sdkProxyService)
  return { controller, sandboxService, supabase, projectQuery }
}

function createRequest(
  headers: Record<string, string> = {},
  originalUrl = '/api/sdk-proxy/project-1',
) {
  return {
    method: 'GET',
    headers,
    originalUrl,
  }
}

describe('ProjectSdkProxyController', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://supabase.example.com'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    process.env.VIBEY_SESSION_KEY = 'root-secret'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('sandbox ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.VIBEY_SESSION_KEY
  })

  it('rejects missing project session key before database lookup or sandbox start', async () => {
    const { controller, sandboxService } = createController()
    const res = createResponse()

    await controller.proxyRoot('project-1', createRequest() as never, res as never)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid session key' })
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(sandboxService.ensureRunning).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('rejects a session key derived for a different project', async () => {
    const { controller, sandboxService } = createController()
    const res = createResponse()
    const wrongProjectKey = deriveProjectSessionKey('project-2', 'root-secret')

    await controller.proxyRoot(
      'project-1',
      createRequest({ 'x-vibey-session-key': wrongProjectKey }) as never,
      res as never,
      wrongProjectKey,
    )

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid session key' })
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(sandboxService.ensureRunning).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns service unavailable when Supabase service env is missing', async () => {
    delete process.env.SUPABASE_URL
    const { controller, sandboxService } = createController()
    const res = createResponse()
    const projectKey = deriveProjectSessionKey('project-1', 'root-secret')

    await controller.proxyRoot(
      'project-1',
      createRequest({ 'x-vibey-session-key': projectKey }) as never,
      res as never,
      projectKey,
    )

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' })
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(sandboxService.ensureRunning).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns not found when the project repo row is missing', async () => {
    const { controller, sandboxService } = createController(null)
    const res = createResponse()
    const projectKey = deriveProjectSessionKey('project-1', 'root-secret')

    await controller.proxyRoot(
      'project-1',
      createRequest({ 'x-vibey-session-key': projectKey }) as never,
      res as never,
      projectKey,
    )

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' })
    expect(sandboxService.ensureRunning).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('allows a valid x-vibey-session-key and proxies to the requested project sandbox', async () => {
    const { controller, sandboxService } = createController()
    const res = createResponse()
    const projectKey = deriveProjectSessionKey('project-1', 'root-secret')

    await controller.proxyWithPath(
      'project-1',
      createRequest(
        { 'x-vibey-session-key': projectKey, accept: 'text/plain' },
        '/api/sdk-proxy/project-1/api/health?ok=1',
      ) as never,
      res as never,
      projectKey,
    )

    expect(sandboxService.ensureRunning).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://sandbox.example.com/api/health?ok=1',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.write).toHaveBeenCalled()
    expect(res.end).toHaveBeenCalled()
  })

  it('allows the existing SDK artifact x-session-key header when it is project-bound', async () => {
    const { controller, sandboxService } = createController()
    const res = createResponse()
    const projectKey = deriveProjectSessionKey('project-1', 'root-secret')

    await controller.proxyWithPath(
      'project-1',
      createRequest(
        { 'x-session-key': projectKey, accept: 'text/plain' },
        '/api/sdk-proxy/project-1/api/artifacts',
      ) as never,
      res as never,
    )

    expect(sandboxService.ensureRunning).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://sandbox.example.com/api/artifacts',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
