import { afterEach, describe, expect, it, vi } from 'vitest'
import { CronService } from './cron.service'

function buildService() {
  const scheduler = { processDueSchedules: vi.fn().mockResolvedValue(undefined) }
  const service = new CronService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    scheduler as never,
    {} as never,
    {} as never,
  )
  return { scheduler, service }
}

describe('CronService space automation scheduling', () => {
  afterEach(() => {
    delete process.env.SPACE_AUTOMATION_IN_PROCESS_CRON_ENABLED
  })

  it('leaves schedule execution to the awaited cron endpoint by default', async () => {
    const { scheduler, service } = buildService()

    await service.processDueSpaceSchedules()

    expect(scheduler.processDueSchedules).not.toHaveBeenCalled()
  })

  it('runs the in-process scheduler on persistent hosts', async () => {
    process.env.SPACE_AUTOMATION_IN_PROCESS_CRON_ENABLED = '1'
    const { scheduler, service } = buildService()

    await service.processDueSpaceSchedules()

    expect(scheduler.processDueSchedules).toHaveBeenCalledTimes(1)
  })
})
