import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { BillingCreditAlertInternalController } from './billing-credit-alert-internal.controller'

describe('BillingCreditAlertInternalController', () => {
  it('requires the cron secret', async () => {
    const alerts = { processDueAlerts: vi.fn() }
    const controller = new BillingCreditAlertInternalController(
      alerts as never,
      { get: vi.fn().mockReturnValue('secret') } as never,
    )
    await expect(controller.processDue('Bearer wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(alerts.processDueAlerts).not.toHaveBeenCalled()
  })

  it('processes alerts for an authorized cron request', async () => {
    const alerts = { processDueAlerts: vi.fn().mockResolvedValue({ sent: 1 }) }
    const controller = new BillingCreditAlertInternalController(
      alerts as never,
      { get: vi.fn().mockReturnValue('secret') } as never,
    )
    await expect(controller.processDue('Bearer secret')).resolves.toEqual({ sent: 1 })
  })
})
