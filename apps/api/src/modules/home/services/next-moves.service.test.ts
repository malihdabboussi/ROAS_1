import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextMovesService } from './next-moves.service'

describe('NextMovesService', () => {
  const repository = {
    listSnoozedKeys: vi.fn(),
    recordEvents: vi.fn(),
    isAssignedTask: vi.fn(),
    upsertSnooze: vi.fn(),
  }
  const taskRollup = { list: vi.fn() }
  const service = new NextMovesService(repository as never, taskRollup as never)
  const supabase = {} as never
  const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'editor' } as never

  beforeEach(() => {
    vi.clearAllMocks()
    repository.isAssignedTask.mockResolvedValue(true)
  })

  it('returns enough recent unresolved call actions for the client See more control', async () => {
    taskRollup.list.mockResolvedValue([
      {
        id: 'action-1',
        title: 'Send the revised offer',
        space_id: 'space-1',
        space_title: 'Meetings',
        source_url: '/spaces?space=space-1&item=action-1',
        created_at: '2026-08-05T12:00:00.000Z',
        custom_data: {
          source_call: 'August 5 offer call',
          action_provenance: {
            source_kind: 'meeting_transcript',
            meeting_item_id: 'meeting-1',
          },
        },
      },
      {
        id: 'action-2',
        title: 'Confirm webinar pricing',
        space_id: 'space-1',
        space_title: 'Client work',
        source_url: '/spaces?space=space-1&item=action-2',
        created_at: '2026-08-04T12:00:00.000Z',
        custom_data: {},
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `extra-${index + 1}`,
        title: `Extra action ${index + 1}`,
        space_id: 'space-1',
        space_title: 'Client work',
        source_url: `/spaces?space=space-1&item=extra-${index + 1}`,
        created_at: '2026-08-03T12:00:00.000Z',
        custom_data: {},
      })),
    ])
    repository.listSnoozedKeys.mockResolvedValue(new Set(['next_move:action-2']))

    const result = await service.list(supabase, scope)

    expect(result.suggestions).toHaveLength(4)
    expect(result.suggestions[0]).toEqual(
      expect.objectContaining({
        id: 'action-1',
        source: expect.objectContaining({ type: 'meeting', title: 'August 5 offer call' }),
        prompt: expect.stringContaining('Send the revised offer'),
      }),
    )
    expect(taskRollup.list).toHaveBeenCalledWith(
      supabase,
      'user-1',
      expect.objectContaining({ view: 'my', focus: 'current' }),
      'org-1',
      'editor',
    )
    expect(repository.recordEvents).toHaveBeenCalledWith(
      supabase,
      scope,
      expect.arrayContaining([
        expect.objectContaining({ taskId: 'action-1', eventType: 'surfaced' }),
      ]),
    )
  })

  it('persists week snoozes and durable dismissals', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-10T12:00:00.000Z').getTime())

    await service.snooze(supabase, scope, 'action-1', 'week')
    await service.snooze(supabase, scope, 'action-2', 'dismiss')

    expect(repository.upsertSnooze).toHaveBeenNthCalledWith(
      1,
      supabase,
      scope,
      'next_move:action-1',
      '2026-08-17T12:00:00.000Z',
    )
    expect(repository.upsertSnooze).toHaveBeenNthCalledWith(
      2,
      supabase,
      scope,
      'next_move:action-2',
      '2036-08-07T12:00:00.000Z',
    )
    expect(repository.recordEvents).toHaveBeenNthCalledWith(1, supabase, scope, [
      { taskId: 'action-1', eventType: 'snoozed', sourceKind: null },
    ])
    expect(repository.recordEvents).toHaveBeenNthCalledWith(2, supabase, scope, [
      { taskId: 'action-2', eventType: 'dismissed', sourceKind: null },
    ])
  })

  it('records an explicit false-positive outcome and durably hides the task', async () => {
    await service.feedback(supabase, scope, 'action-1', 'false_positive')

    expect(repository.recordEvents).toHaveBeenCalledWith(supabase, scope, [
      { taskId: 'action-1', eventType: 'false_positive', sourceKind: null },
    ])
    expect(repository.upsertSnooze).toHaveBeenCalledWith(
      supabase,
      scope,
      'next_move:action-1',
      expect.any(String),
    )
  })

  it('rejects feedback for a task that is not assigned to the viewer', async () => {
    repository.isAssignedTask.mockResolvedValue(false)

    await expect(service.feedback(supabase, scope, 'action-1', 'accepted')).rejects.toThrow(
      'Assigned task not found',
    )
    expect(repository.recordEvents).not.toHaveBeenCalled()
  })
})
