import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationSchedulerInternalController } from './space-automation-scheduler-internal.controller'

describe('SpaceAutomationSchedulerInternalController', () => {
  it('rejects requests without the configured cron secret', async () => {
    const scheduler = { processDueSchedules: vi.fn() }
    const config = { get: vi.fn().mockReturnValue('cron-secret') }
    const controller = new SpaceAutomationSchedulerInternalController(
      scheduler as never,
      config as never,
    )

    await expect(controller.processDue('Bearer wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(scheduler.processDueSchedules).not.toHaveBeenCalled()
  })

  it('processes due schedules for an authorized Vercel cron wakeup', async () => {
    const scheduler = { processDueSchedules: vi.fn().mockResolvedValue(undefined) }
    const config = { get: vi.fn().mockReturnValue('cron-secret') }
    const controller = new SpaceAutomationSchedulerInternalController(
      scheduler as never,
      config as never,
    )

    await expect(controller.processDue('Bearer cron-secret')).resolves.toEqual({ processed: true })
    expect(scheduler.processDueSchedules).toHaveBeenCalledTimes(1)
  })
})
