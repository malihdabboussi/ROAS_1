import { describe, expect, it } from 'vitest'
import { decideSlackCadence, isSundayCheckInWindow } from '../slack-team-cadence'

describe('Slack Team cadence', () => {
  it('consolidates ordinary weekday work into the 5–6pm local window', () => {
    expect(
      decideSlackCadence({
        now: new Date('2026-08-10T20:00:00Z'),
        timezone: 'America/Los_Angeles',
        kind: 'team_win',
        metadata: {},
        config: { enabled: true },
      }),
    ).toMatchObject({ allowed: false, reason: 'cadence_deferred' })
    expect(
      decideSlackCadence({
        now: new Date('2026-08-11T00:30:00Z'),
        timezone: 'America/Los_Angeles',
        kind: 'team_win',
        metadata: {},
        config: { enabled: true },
      }),
    ).toEqual({ allowed: true, reason: 'weekday_eod' })
  })

  it('allows urgent weekday risks and only high-confidence urgent weekend risks', () => {
    expect(
      decideSlackCadence({
        now: new Date('2026-08-10T20:00:00Z'),
        timezone: 'America/Los_Angeles',
        kind: 'client_risk',
        metadata: { confidence: 0.82 },
        config: { enabled: true },
      }).allowed,
    ).toBe(true)
    expect(
      decideSlackCadence({
        now: new Date('2026-08-09T20:00:00Z'),
        timezone: 'America/Los_Angeles',
        kind: 'client_risk',
        metadata: { confidence: 0.89 },
        config: { enabled: true },
      }).allowed,
    ).toBe(false)
    expect(
      decideSlackCadence({
        now: new Date('2026-08-09T20:00:00Z'),
        timezone: 'America/Los_Angeles',
        kind: 'client_risk',
        metadata: { confidence: 0.95 },
        config: { enabled: true },
      }).allowed,
    ).toBe(true)
  })

  it('opens the Sunday ledger check-in window from 5–7pm local', () => {
    expect(isSundayCheckInWindow(new Date('2026-08-10T00:30:00Z'), 'America/Los_Angeles')).toBe(
      true,
    )
  })
})
