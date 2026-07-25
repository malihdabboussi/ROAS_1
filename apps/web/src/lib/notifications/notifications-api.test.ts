import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearNotification,
  fetchNotifications,
  moveNotificationBucket,
  snoozeNotification,
} from './notifications-api'

const mocks = vi.hoisted(() => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => mocks)

describe('notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.backendGet.mockResolvedValue([])
    mocks.backendPost.mockResolvedValue({ ok: true })
  })

  it('serializes Inbox list filters into the dedicated notifications route', async () => {
    await fetchNotifications({
      limit: 25,
      unreadOnly: true,
      view: 'later',
      types: ['space_task_mention', 'human_dm_message'],
    })

    expect(mocks.backendGet).toHaveBeenCalledWith(
      '/api/missions/notifications?limit=25&unread_only=true&view=later&types=space_task_mention%2Chuman_dm_message',
    )
  })

  it('uses the triage mutation endpoints', async () => {
    await moveNotificationBucket('notification-1', 'other')
    await snoozeNotification('notification-1', '2026-07-26T12:00:00.000Z')
    await clearNotification('notification-1')

    expect(mocks.backendPost).toHaveBeenNthCalledWith(
      1,
      '/api/missions/notifications/notification-1/bucket',
      { bucket: 'other' },
    )
    expect(mocks.backendPost).toHaveBeenNthCalledWith(
      2,
      '/api/missions/notifications/notification-1/snooze',
      { until: '2026-07-26T12:00:00.000Z' },
    )
    expect(mocks.backendPost).toHaveBeenNthCalledWith(
      3,
      '/api/missions/notifications/notification-1/clear',
      {},
    )
  })
})
