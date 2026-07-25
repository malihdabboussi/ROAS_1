import { describe, expect, it, vi } from 'vitest'
import { NotificationsInboxRepository } from '../repositories/notifications-inbox.repository'
import { NotificationsInboxService } from '../services/notifications-inbox.service'
import { MissionsNotificationsController } from './missions-notifications.controller'

type MockFunction = ReturnType<typeof vi.fn>
type MockQuery = {
  delete: MockFunction
  eq: MockFunction
  gt: MockFunction
  in: MockFunction
  is: MockFunction
  limit: MockFunction
  not: MockFunction
  or: MockFunction
  order: MockFunction
  select: MockFunction
  update: MockFunction
  then: Promise<unknown>['then']
}

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  let query: MockQuery
  query = {
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    gt: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    limit: vi.fn(() => query),
    not: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    then: resolved.then.bind(resolved),
  }
  return query
}

function createController() {
  return new MissionsNotificationsController(
    new NotificationsInboxService(new NotificationsInboxRepository()),
  )
}

const ORG_SCOPE = {
  userId: 'user-1',
  orgId: '11111111-1111-1111-1111-111111111111',
  orgRole: 'admin' as const,
}

describe('MissionsNotificationsController', () => {
  it('applies the Primary predicate and type filter to the scoped list query', async () => {
    const query = createQuery({ data: [{ id: 'notification-1' }], error: null })
    const supabase = { from: vi.fn(() => query) }

    await expect(
      createController().list(
        { id: 'user-1' },
        supabase as never,
        {
          limit: 25,
          unread_only: false,
          view: 'primary',
          types: ['space_task_mention'],
        },
        ORG_SCOPE,
      ),
    ).resolves.toEqual([{ id: 'notification-1' }])

    expect(query.is).toHaveBeenCalledWith('cleared_at', null)
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('snoozed_until.lte.'))
    expect(query.eq).toHaveBeenCalledWith('inbox_bucket', 'primary')
    expect(query.in).toHaveBeenCalledWith('type', ['space_task_mention'])
  })

  it('normalizes the grouped unread-count RPC response', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          { view: 'primary', count: 3 },
          { view: 'other', count: '2' },
          { view: 'later', count: 1 },
          { view: 'cleared', count: 0 },
        ],
        error: null,
      }),
    }

    await expect(
      createController().counts({ id: 'user-1' }, supabase as never, ORG_SCOPE),
    ).resolves.toEqual({ primary: 3, other: 2, later: 1, cleared: 0 })
  })

  it('snoozes within scope and restores the item from Cleared', async () => {
    const query = createQuery({ error: null })
    const supabase = { from: vi.fn(() => query) }
    const until = '2026-07-26T12:00:00.000Z'

    await expect(
      createController().snooze(
        { id: 'user-1' },
        supabase as never,
        { notificationId: '7d749789-15e3-4932-ad56-bc45e04992b0' },
        { until },
        ORG_SCOPE,
      ),
    ).resolves.toEqual({ ok: true })

    expect(query.update).toHaveBeenCalledWith({
      snoozed_until: until,
      cleared_at: null,
    })
    expect(query.eq).toHaveBeenCalledWith('org_id', ORG_SCOPE.orgId)
  })
})
