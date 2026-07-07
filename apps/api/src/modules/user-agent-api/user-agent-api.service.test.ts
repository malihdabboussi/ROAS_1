import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserAgentApiRepository } from './repositories/user-agent-api.repository'
import { UserAgentApiService } from './services/user-agent-api.service'

describe('UserAgentApiService', () => {
  const originalAgentApiUrl = process.env.AGENT_API_URL

  afterEach(() => {
    process.env.AGENT_API_URL = originalAgentApiUrl
    vi.restoreAllMocks()
  })

  it('uses local AGENT_API_URL without resolving a Fly machine', async () => {
    process.env.AGENT_API_URL = 'http://localhost:3003'
    const machinesService = { ensureRunning: vi.fn() }
    const service = createService(machinesService)

    await expect(service.resolveTarget('user_1')).resolves.toEqual({
      baseUrl: 'http://localhost:3003',
      machineId: null,
    })
    expect(machinesService.ensureRunning).not.toHaveBeenCalled()
  })

  it('routes shared Railway users without ensuring a Fly machine', async () => {
    process.env.AGENT_API_URL = 'https://vibey-runtimes.fly.dev'
    const machinesService = { ensureRunning: vi.fn() }
    const service = createService(machinesService, [
      {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://machine.example.com',
        fly_machine_status: 'suspended',
        agent_runtime_type: 'shared_railway',
        agent_runtime_url: 'https://railway-agent.vibey.test',
      },
    ])
    ;(service as any).client.fetch = vi.fn().mockResolvedValue(new Response('ok'))

    await expect(service.resolveTarget('user-1')).resolves.toEqual({
      baseUrl: 'https://railway-agent.vibey.test',
      machineId: null,
    })

    await service.invoke('user-1', '/api/artifacts/openclaw/responses', { method: 'POST' })

    expect(machinesService.ensureRunning).not.toHaveBeenCalled()
    expect((service as any).client.fetch).toHaveBeenCalledWith(
      { baseUrl: 'https://railway-agent.vibey.test', machineId: null },
      '/api/artifacts/openclaw/responses',
      { method: 'POST' },
      undefined,
    )
  })

  it('forces ensureRunning for suspended machines before invoking the agent-api', async () => {
    process.env.AGENT_API_URL = 'https://vibey-runtimes.fly.dev'
    const machinesService = {
      ensureRunning: vi.fn().mockResolvedValue({
        machine_id: 'machine-1',
        machine_url: 'https://machine.example.com',
        status: 'running',
      }),
    }
    const service = createService(machinesService, [
      {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://machine.example.com',
        fly_machine_status: 'suspended',
      },
      {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://machine.example.com',
        fly_machine_status: 'running',
      },
    ])
    ;(service as any).client.fetch = vi.fn().mockResolvedValue(new Response('ok'))

    await service.invoke('user-1', '/api/channel-chat', { method: 'POST' })

    expect(machinesService.ensureRunning).toHaveBeenCalledTimes(1)
    expect(machinesService.ensureRunning).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      requiredRuntime: 'chat',
    })
    expect((service as any).client.fetch).toHaveBeenCalledWith(
      { baseUrl: 'https://machine.example.com', machineId: 'machine-1' },
      '/api/channel-chat',
      { method: 'POST' },
      undefined,
    )
  })

  it('uses the ensured machine target returned by ensureRunning before invoking', async () => {
    process.env.AGENT_API_URL = 'https://vibey-runtimes.fly.dev'
    const machinesService = {
      ensureRunning: vi.fn().mockResolvedValue({
        machine_id: 'new-machine',
        machine_url: 'https://new.example.com',
        status: 'running',
      }),
    }
    const service = createService(machinesService, [
      {
        fly_machine_id: 'old-machine',
        fly_machine_url: 'https://old.example.com',
        fly_machine_status: 'suspended',
      },
    ])
    ;(service as any).client.fetch = vi.fn().mockResolvedValue(new Response('ok'))

    await service.invoke('user-1', '/api/channel-chat', { method: 'POST' })

    expect(machinesService.ensureRunning).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      requiredRuntime: 'chat',
    })
    expect((service as any).client.fetch).toHaveBeenCalledWith(
      { baseUrl: 'https://new.example.com', machineId: 'new-machine' },
      '/api/channel-chat',
      { method: 'POST' },
      undefined,
    )
  })

  it('forces ensureRunning even when DB status is running before invoking', async () => {
    process.env.AGENT_API_URL = 'https://vibey-runtimes.fly.dev'
    const machinesService = {
      ensureRunning: vi.fn().mockResolvedValue({
        machine_id: 'machine-1',
        machine_url: 'https://machine.example.com',
        status: 'running',
      }),
    }
    const service = createService(machinesService, [
      {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://machine.example.com',
        fly_machine_status: 'running',
      },
    ])
    ;(service as any).client.fetch = vi.fn().mockResolvedValue(new Response('ok'))

    await service.invoke('user-1', '/api/channel-chat', { method: 'POST' })

    expect(machinesService.ensureRunning).toHaveBeenCalledTimes(1)
    expect(machinesService.ensureRunning).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      requiredRuntime: 'chat',
    })
    expect((service as any).client.fetch).toHaveBeenCalledWith(
      { baseUrl: 'https://machine.example.com', machineId: 'machine-1' },
      '/api/channel-chat',
      { method: 'POST' },
      undefined,
    )
  })

  it('provisions through ensureRunning instead of invoking an unpinned Fly fallback', async () => {
    process.env.AGENT_API_URL = 'https://vibey-runtimes.fly.dev'
    const machinesService = {
      ensureRunning: vi.fn().mockResolvedValue({
        machine_id: 'machine-1',
        machine_url: 'https://vibey-runtimes.fly.dev',
        status: 'running',
      }),
    }
    const service = createService(machinesService, [
      {
        fly_machine_id: null,
        fly_machine_url: null,
        fly_machine_status: null,
      },
    ])
    ;(service as any).client.fetch = vi.fn().mockResolvedValue(new Response('ok'))

    await service.invoke('user-1', '/api/channel-chat', { method: 'POST' })

    expect(machinesService.ensureRunning).toHaveBeenCalledTimes(1)
    expect(machinesService.ensureRunning).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      requiredRuntime: 'chat',
    })
    expect((service as any).client.fetch).toHaveBeenCalledWith(
      { baseUrl: 'https://vibey-runtimes.fly.dev', machineId: 'machine-1' },
      '/api/channel-chat',
      { method: 'POST' },
      undefined,
    )
  })

  it('requests work runtime for non-chat agent-api paths', async () => {
    process.env.AGENT_API_URL = 'https://vibey-runtimes.fly.dev'
    const machinesService = {
      ensureRunning: vi.fn().mockResolvedValue({
        machine_id: 'machine-1',
        machine_url: 'https://machine.example.com',
        status: 'running',
      }),
    }
    const service = createService(machinesService, [
      {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://machine.example.com',
        fly_machine_status: 'running',
      },
    ])
    ;(service as any).client.fetch = vi.fn().mockResolvedValue(new Response('ok'))

    await service.invoke('user-1', '/api/artifacts/openclaw/responses', { method: 'POST' })

    expect(machinesService.ensureRunning).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      requiredRuntime: 'work',
    })
  })
})

function createService(
  machinesService: Record<string, unknown>,
  profileRows?: Array<Record<string, unknown>>,
) {
  const repository = new UserAgentApiRepository()
  if (profileRows) {
    repository.setServiceRoleClientForTesting(buildProfileClient(profileRows) as never)
  }
  return new UserAgentApiService(machinesService as never, repository)
}

function buildProfileClient(rows: Array<Record<string, unknown>>) {
  let index = 0
  const normalizedRows = rows.map((row) => ({
    ...row,
    fly_machine_id_staging: row.fly_machine_id,
    fly_machine_url_staging: row.fly_machine_url,
    fly_machine_status_staging: row.fly_machine_status,
    agent_runtime_type_staging: row.agent_runtime_type,
    agent_runtime_url_staging: row.agent_runtime_url,
  }))
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: normalizedRows[Math.min(index++, normalizedRows.length - 1)] ?? null,
          })),
        })),
      })),
    })),
  }
}
