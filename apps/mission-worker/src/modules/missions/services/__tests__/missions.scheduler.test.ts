import { describe, expect, it, vi } from 'vitest'
import { MissionsScheduler } from '../missions.scheduler'

describe('MissionsScheduler', () => {
  it('runs recovery immediately and on its short dedicated interval', async () => {
    vi.useFakeTimers()
    const recovery = {
      detectStalledWork: vi.fn().mockResolvedValue(undefined),
      autoRetryFailed: vi.fn().mockResolvedValue(undefined),
    }
    const scheduler = new MissionsScheduler(
      { get: vi.fn().mockReturnValue(true) } as never,
      {
        runOperationalLoop: vi.fn().mockResolvedValue(new Set()),
        runSignalIntelligence: vi.fn().mockResolvedValue(undefined),
        maybeRunDigests: vi.fn().mockResolvedValue(undefined),
      } as never,
      recovery as never,
    )

    scheduler.onModuleInit()
    await vi.runAllTicks()
    expect(recovery.detectStalledWork).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(recovery.detectStalledWork).toHaveBeenCalledTimes(2)

    scheduler.onModuleDestroy()
    vi.useRealTimers()
  })
})
