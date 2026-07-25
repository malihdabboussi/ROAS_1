import { describe, expect, it } from 'vitest'
import { notificationInboxView } from './inbox-view-predicates'
import type { UserNotification } from './types'

function notification(patch: Partial<UserNotification>): UserNotification {
  return {
    id: '7d749789-15e3-4932-ad56-bc45e04992b0',
    user_id: 'user-1',
    org_id: null,
    type: 'mission_completed',
    title: 'Ready',
    body: null,
    mission_id: null,
    action_url: null,
    read_at: null,
    channel_sent: {},
    metadata: null,
    inbox_bucket: 'other',
    snoozed_until: null,
    cleared_at: null,
    created_at: '2026-07-25T12:00:00.000Z',
    ...patch,
  }
}

describe('notificationInboxView', () => {
  const now = new Date('2026-07-25T12:00:00.000Z')

  it('prioritizes cleared over snoozed and bucket state', () => {
    expect(
      notificationInboxView(
        notification({
          cleared_at: '2026-07-25T11:00:00.000Z',
          snoozed_until: '2026-07-26T12:00:00.000Z',
        }),
        now,
      ),
    ).toBe('cleared')
  })

  it('returns expired snoozes to their persisted bucket', () => {
    expect(
      notificationInboxView(
        notification({ inbox_bucket: 'primary', snoozed_until: '2026-07-25T11:59:59.000Z' }),
        now,
      ),
    ).toBe('primary')
  })
})
