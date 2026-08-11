import { describe, expect, it, vi } from 'vitest'
import {
  BillingCreditAlertService,
  composeCreditAlertMessage,
  crossedCreditAlertThresholds,
} from './billing-credit-alert.service'

describe('billing credit Slack alerts', () => {
  it.each([
    [69, 31, []],
    [70, 30, [70]],
    [90, 10, [70, 90]],
    [100, 0, [70, 90, 100]],
  ])('resolves thresholds for %i used and %i remaining', (used, remaining, expected) => {
    expect(crossedCreditAlertThresholds(used, remaining)).toEqual(expected)
  })

  it('formats the Viktor-style usage message with exact values', () => {
    expect(
      composeCreditAlertMessage({
        used: 56_078,
        remaining: 23_922,
        appUrl: 'https://app.roas.io',
      }),
    ).toBe(
      "Hey! Just a heads-up — you've used 70% of your monthly credits (56,078 of 80,000). You can <https://app.roas.io/home|manage your plan> to add more credits. Reply here if you'd like help choosing the right option.",
    )
  })

  it('sends each crossed threshold once and persists the Slack timestamp', async () => {
    const client = {}
    const repo = {
      listRecentlyUpdatedOrgLedgers: vi
        .fn()
        .mockResolvedValue([{ orgId: 'org-1', periodStart: '2026-08-01' }]),
      listOrgOwners: vi.fn().mockResolvedValue(['user-1']),
      findSlackUserId: vi.fn().mockResolvedValue('U1'),
      claim: vi.fn().mockResolvedValue(true),
      markSent: vi.fn().mockResolvedValue(undefined),
      markLowerThresholdsSatisfied: vi.fn().mockResolvedValue(undefined),
      releaseClaim: vi.fn().mockResolvedValue(undefined),
      getClient: vi.fn().mockReturnValue(client),
    }
    const credits = {
      getOrgBalance: vi.fn().mockResolvedValue({ totalUsed: 90, totalAvailable: 10 }),
    }
    const slack = {
      openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
      sendMessage: vi.fn().mockResolvedValue({ ts: '123.456' }),
    }
    const config = { get: vi.fn().mockReturnValue('https://app.roas.io') }
    const service = new BillingCreditAlertService(
      repo as never,
      credits as never,
      slack as never,
      config as never,
    )

    await expect(service.processDueAlerts(new Date('2026-08-11T12:00:00Z'))).resolves.toEqual({
      sent: 1,
    })
    expect(repo.claim).toHaveBeenCalledWith('org-1', 'user-1', '2026-08-01', 90)
    expect(repo.markSent).toHaveBeenCalledWith('org-1', 'user-1', '2026-08-01', 90, '123.456')
    expect(repo.markLowerThresholdsSatisfied).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      '2026-08-01',
      [70],
    )
  })

  it('releases a pending claim when Slack delivery fails', async () => {
    const repo = {
      listRecentlyUpdatedOrgLedgers: vi
        .fn()
        .mockResolvedValue([{ orgId: 'org-1', periodStart: '2026-08-01' }]),
      listOrgOwners: vi.fn().mockResolvedValue(['user-1']),
      findSlackUserId: vi.fn().mockResolvedValue('U1'),
      claim: vi.fn().mockResolvedValue(true),
      markSent: vi.fn(),
      markLowerThresholdsSatisfied: vi.fn(),
      releaseClaim: vi.fn().mockResolvedValue(undefined),
      getClient: vi.fn().mockReturnValue({}),
    }
    const service = new BillingCreditAlertService(
      repo as never,
      { getOrgBalance: vi.fn().mockResolvedValue({ totalUsed: 70, totalAvailable: 30 }) } as never,
      {
        openDm: vi.fn().mockResolvedValue({ channel_id: 'D1' }),
        sendMessage: vi.fn().mockRejectedValue(new Error('Slack unavailable')),
      } as never,
      { get: vi.fn().mockReturnValue('https://app.roas.io') } as never,
    )

    await expect(service.processDueAlerts()).resolves.toEqual({ sent: 0 })
    expect(repo.releaseClaim).toHaveBeenCalledWith('org-1', 'user-1', '2026-08-01', 70)
  })
})
