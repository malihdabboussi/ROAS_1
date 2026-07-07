import { afterEach, describe, expect, it, vi } from 'vitest'
import { HealthController } from './health.controller'

function makeSyncService() {
  return {
    getSyncStatus: vi.fn().mockReturnValue('ok'),
    isUserIdResolved: vi.fn().mockReturnValue(true),
    isSharedRuntime: vi.fn().mockReturnValue(false),
    getLastSyncResult: vi.fn().mockReturnValue(null),
  }
}

describe('HealthController runtime capabilities', () => {
  const originalBootProfile = process.env.AGENT_API_BOOT_PROFILE

  afterEach(() => {
    if (originalBootProfile === undefined) delete process.env.AGENT_API_BOOT_PROFILE
    else process.env.AGENT_API_BOOT_PROFILE = originalBootProfile
  })

  it('reports work capabilities for the full runtime profile', () => {
    delete process.env.AGENT_API_BOOT_PROFILE
    const controller = new HealthController(makeSyncService() as never)

    expect(controller.runtimeCapabilities()).toMatchObject({
      runtimeProfile: 'full',
      capabilities: {
        chat_runtime: true,
        work_runtime: true,
        openclaw_responses: true,
      },
    })
  })

  it('does not report work capabilities for the chat runtime profile', () => {
    process.env.AGENT_API_BOOT_PROFILE = 'runtime-chat'
    const controller = new HealthController(makeSyncService() as never)

    expect(controller.runtimeCapabilities()).toMatchObject({
      runtimeProfile: 'runtime-chat',
      capabilities: {
        chat_runtime: true,
        work_runtime: false,
        openclaw_responses: false,
      },
    })
  })

  it('reports shared mode as ready without machine-bound user identity', () => {
    const syncService = makeSyncService()
    syncService.isSharedRuntime.mockReturnValue(true)
    syncService.isUserIdResolved.mockReturnValue(false)
    const controller = new HealthController(syncService as never)

    expect(controller.runtimeCapabilities()).toMatchObject({
      mode: 'shared',
      ready: true,
      userIdResolved: false,
    })
    expect(controller.health()).toMatchObject({
      mode: 'shared',
      userId: 'request-scoped',
      sync: 'ok',
    })
  })
})
