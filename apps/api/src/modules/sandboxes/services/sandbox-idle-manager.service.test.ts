import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SandboxIdleManagerService } from './sandbox-idle-manager.service'

describe('SandboxIdleManagerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('terminates each idle sandbox and reports checked and terminated counts', async () => {
    vi.stubEnv('SANDBOX_IDLE_THRESHOLD_MS', '900000')
    const idleProjects = [
      { id: 'project-1', modal_sandbox_id: 'sb-1' },
      { id: 'project-2', modal_sandbox_id: 'sb-2' },
    ]
    const client = {
      id: 'service-client',
    }
    const sandboxService = {
      terminate: vi.fn().mockResolvedValue(undefined),
    }
    const repository = {
      getServiceClient: vi.fn().mockReturnValue(client),
      listIdleProjects: vi.fn().mockResolvedValue(idleProjects),
    }
    const service = new SandboxIdleManagerService(sandboxService as never, repository as never)

    await expect(service.checkIdleSandboxes()).resolves.toEqual({ checked: 2, terminated: 2 })
    expect(repository.listIdleProjects).toHaveBeenCalledWith(expect.any(String))
    expect(sandboxService.terminate).toHaveBeenCalledWith(client, 'project-1')
    expect(sandboxService.terminate).toHaveBeenCalledWith(client, 'project-2')
  })
})
