import { describe, expect, it } from 'vitest'
import { decideSlackDelivery } from '../slack-team-delivery-policy'

const action = {
  id: 'action-1',
  action_kind: 'message',
  target_member_id: 'person-1',
  metadata: { signal_finding: 'A normal team win', confidence: 0.95 },
}
const recipient = { id: 'person-1', relationship_kind: 'internal', delivery_mode: 'active' }

describe('Slack Team delivery policy', () => {
  it('keeps deterministic safety gates ahead of cadence', () => {
    expect(
      decideSlackDelivery({
        deliveryMode: 'active',
        personIds: ['person-1'],
        quietHoursActive: true,
        action: action as never,
        recipient,
        kind: 'team_win',
        cadence: { enabled: true },
      }).reason,
    ).toBe('quiet_hours')
    expect(
      decideSlackDelivery({
        deliveryMode: 'active',
        personIds: ['person-1'],
        quietHoursActive: false,
        action: action as never,
        recipient: { ...recipient, relationship_kind: 'external' },
        kind: 'team_win',
        cadence: { enabled: true },
      }).reason,
    ).toBe('recipient_not_internal')
  })

  it('defers ordinary work without dismissing it outside the EOD window', () => {
    expect(
      decideSlackDelivery({
        deliveryMode: 'active',
        personIds: ['person-1'],
        quietHoursActive: false,
        action: action as never,
        recipient,
        kind: 'team_win',
        now: new Date('2026-08-10T20:00:00Z'),
        timezone: 'America/Los_Angeles',
        cadence: { enabled: true },
      }),
    ).toMatchObject({ canSend: false, reason: 'cadence_deferred' })
  })

  it('keeps personal moments active-only and allowlisted', () => {
    expect(
      decideSlackDelivery({
        deliveryMode: 'shadow',
        personIds: ['person-1'],
        quietHoursActive: false,
        action: action as never,
        recipient,
        kind: 'personal_moment',
        cadence: { enabled: true },
      }).reason,
    ).toBe('flow_shadow')
  })
})
