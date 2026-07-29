import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserNotification } from './types'
import { useInboxTriage } from './use-inbox-triage'

const mocks = vi.hoisted(() => ({
  clearNotification: vi.fn(),
  clearNotificationView: vi.fn(),
  fetchInboxTriageCounts: vi.fn(),
  fetchNotifications: vi.fn(),
  markNotificationsReadAll: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
  moveNotificationBucket: vi.fn(),
  snoozeNotification: vi.fn(),
  unclearNotification: vi.fn(),
  unsnoozeNotification: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('./notifications-api', () => ({
  clearNotification: mocks.clearNotification,
  clearNotificationView: mocks.clearNotificationView,
  fetchInboxTriageCounts: mocks.fetchInboxTriageCounts,
  fetchNotifications: mocks.fetchNotifications,
  markNotificationsReadAll: mocks.markNotificationsReadAll,
  markNotificationRead: mocks.markNotificationRead,
  markNotificationUnread: mocks.markNotificationUnread,
  moveNotificationBucket: mocks.moveNotificationBucket,
  snoozeNotification: mocks.snoozeNotification,
  unclearNotification: mocks.unclearNotification,
  unsnoozeNotification: mocks.unsnoozeNotification,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: null; isLoaded: boolean }) => unknown) =>
    selector({ activeOrgId: null, isLoaded: true }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}))

function notification(): UserNotification {
  return {
    id: '7d749789-15e3-4932-ad56-bc45e04992b0',
    user_id: 'user-1',
    org_id: null,
    type: 'space_task_mention',
    title: 'You were mentioned',
    body: null,
    mission_id: null,
    action_url: null,
    read_at: null,
    channel_sent: {},
    metadata: null,
    inbox_bucket: 'primary',
    snoozed_until: null,
    cleared_at: null,
    created_at: '2026-07-25T12:00:00.000Z',
  }
}

describe('useInboxTriage optimistic actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchNotifications.mockResolvedValue([notification()])
    mocks.fetchInboxTriageCounts.mockResolvedValue({
      primary: 1,
      system: 0,
      other: 0,
      later: 0,
      cleared: 0,
    })
    mocks.clearNotification.mockResolvedValue({ ok: true })
    mocks.clearNotificationView.mockResolvedValue({ ok: true })
    mocks.markNotificationsReadAll.mockResolvedValue({ ok: true })
  })

  it('moves a cleared row out of Primary and adjusts unread counts immediately', async () => {
    const { result } = renderHook(() => useInboxTriage())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    const row = result.current.notifications[0]!

    await act(async () => {
      await result.current.clear(row)
    })

    expect(result.current.notifications).toEqual([])
    expect(result.current.counts).toEqual({
      primary: 0,
      system: 0,
      other: 0,
      later: 0,
      cleared: 1,
    })
  })

  it('rolls the row and counts back when the request fails', async () => {
    mocks.clearNotification.mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useInboxTriage())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    const row = result.current.notifications[0]!

    await act(async () => {
      await result.current.clear(row)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.counts.primary).toBe(1)
    expect(result.current.counts.cleared).toBe(0)
    expect(mocks.toastError).toHaveBeenCalledOnce()
  })

  it('clears the active view in one optimistic action', async () => {
    const { result } = renderHook(() => useInboxTriage())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))

    await act(async () => {
      await result.current.clearCurrentView()
    })

    expect(result.current.notifications).toEqual([])
    expect(result.current.counts.primary).toBe(0)
    expect(result.current.counts.cleared).toBe(1)
    expect(mocks.clearNotificationView).toHaveBeenCalledWith('primary')
  })

  it('marks the loaded inbox and all unread counts read immediately', async () => {
    const { result } = renderHook(() => useInboxTriage())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))

    await act(async () => {
      await result.current.markAllRead()
    })

    expect(result.current.notifications[0]?.read_at).not.toBeNull()
    expect(result.current.counts).toEqual({
      primary: 0,
      system: 0,
      other: 0,
      later: 0,
      cleared: 0,
    })
    expect(mocks.markNotificationsReadAll).toHaveBeenCalledOnce()
  })
})
