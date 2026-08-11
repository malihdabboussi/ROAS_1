import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceAutomationSchedulerInternalController } from './space-automation-scheduler-internal.controller'

describe('SpaceAutomationSchedulerInternalController', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('dispatches a Vercel cron wakeup through a normal authenticated request', async () => {
    const scheduler = { processDueSchedules: vi.fn() }
    const config = {
      get: vi.fn((key: string) =>
        key === 'CRON_SECRET' ? 'cron-secret' : 'https://api.example.com/',
      ),
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new SpaceAutomationSchedulerInternalController(
      scheduler as never,
      config as never,
    )

    await expect(controller.dispatchDue('Bearer cron-secret')).resolves.toEqual({
      dispatched: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/internal/space-automations/process-due',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer cron-secret' }),
      }),
    )
    expect(scheduler.processDueSchedules).not.toHaveBeenCalled()
  })

  it('surfaces a failed execution dispatch', async () => {
    const scheduler = { processDueSchedules: vi.fn() }
    const config = {
      get: vi.fn((key: string) =>
        key === 'CRON_SECRET' ? 'cron-secret' : 'https://api.example.com',
      ),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    const controller = new SpaceAutomationSchedulerInternalController(
      scheduler as never,
      config as never,
    )

    await expect(controller.dispatchDue('Bearer cron-secret')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})
