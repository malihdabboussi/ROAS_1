import { describe, expect, it } from 'vitest'
import {
  notificationDetailActionLabel,
  notificationSourceActionLabel,
  resolveNotificationOpenTarget,
} from './notification-open-target'
import type { UserNotification } from './types'

function notification(patch: Partial<UserNotification>): UserNotification {
  return {
    id: 'notification-1',
    user_id: 'user-1',
    org_id: 'org-1',
    type: 'space_task_mention',
    title: 'You were mentioned',
    body: 'Please review this.',
    mission_id: null,
    action_url: null,
    read_at: null,
    channel_sent: {},
    metadata: null,
    inbox_bucket: 'primary',
    snoozed_until: null,
    cleared_at: null,
    created_at: '2026-07-26T12:00:00.000Z',
    ...patch,
  }
}

describe('notification open target', () => {
  it('resolves Space task details separately from the source URL', () => {
    const row = notification({
      action_url: '/spaces?space=space-1&item=task-1',
    })

    expect(resolveNotificationOpenTarget(row)).toEqual({
      type: 'space_task',
      spaceId: 'space-1',
      itemId: 'task-1',
    })
    expect(notificationDetailActionLabel(row)).toBe('Open task details')
    expect(notificationSourceActionLabel(row)).toBe('View in Space')
  })

  it('resolves mission-backed notifications to native mission details', () => {
    const row = notification({
      type: 'mission_blocked',
      mission_id: 'mission-1',
      action_url: '/mission-control?mission=mission-1',
    })

    expect(resolveNotificationOpenTarget(row)).toEqual({
      type: 'mission',
      missionId: 'mission-1',
      orgId: 'org-1',
    })
    expect(notificationDetailActionLabel(row)).toBe('Open mission details')
    expect(notificationSourceActionLabel(row)).toBe('View in Mission Control')
  })

  it('keeps ordinary destinations as source-only actions', () => {
    const row = notification({
      type: 'human_dm_message',
      action_url: '/team?dm=user-2',
    })

    expect(resolveNotificationOpenTarget(row)).toEqual({
      type: 'external_url',
      url: '/team?dm=user-2',
    })
    expect(notificationDetailActionLabel(row)).toBeNull()
    expect(notificationSourceActionLabel(row)).toBe('Open conversation')
  })

  it('keeps Brain suggestion decisions inside their dedicated controls', () => {
    const row = notification({
      type: 'brain_cross_suggestion',
      action_url: '/home',
    })

    expect(resolveNotificationOpenTarget(row)).toBeNull()
    expect(notificationDetailActionLabel(row)).toBeNull()
    expect(notificationSourceActionLabel(row)).toBeNull()
  })
})
