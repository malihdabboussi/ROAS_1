import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MeetingActionReconciliationController } from './meeting-action-reconciliation.controller'

describe('MeetingActionReconciliationController', () => {
  it('requires the cron secret before running reconciliation', async () => {
    const reconciliation = { reconcile: vi.fn() }
    const controller = new MeetingActionReconciliationController(
      reconciliation as never,
      {
        get: vi.fn().mockReturnValue('secret'),
      } as never,
    )

    expect(() => controller.run('Bearer wrong')).toThrow(UnauthorizedException)
    expect(reconciliation.reconcile).not.toHaveBeenCalled()
  })

  it('runs an authorized reconciliation', async () => {
    const result = { checked: 3, marked: 1, unchanged: 2 }
    const reconciliation = { reconcile: vi.fn().mockResolvedValue(result) }
    const controller = new MeetingActionReconciliationController(
      reconciliation as never,
      {
        get: vi.fn().mockReturnValue('secret'),
      } as never,
    )

    await expect(controller.run('Bearer secret')).resolves.toEqual(result)
  })
})
