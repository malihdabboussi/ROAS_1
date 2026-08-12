import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextMovesService } from './next-moves.service'

describe('NextMovesService', () => {
  const repository = {
    listCandidates: vi.fn(),
    listSnoozedKeys: vi.fn(),
    upsertSnooze: vi.fn(),
  }
  const service = new NextMovesService(repository as never)
  const supabase = {} as never
  const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'editor' } as never

  beforeEach(() => vi.clearAllMocks())

  it('returns enough recent unresolved call actions for the client See more control', async () => {
    repository.listCandidates.mockResolvedValue([
      {
        id: 'action-1',
        title: 'Send the revised offer',
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        meetingTitle: 'August 5 offer call',
        meetingDate: '2026-08-05T12:00:00.000Z',
      },
      {
        id: 'action-2',
        title: 'Confirm webinar pricing',
        spaceId: 'space-1',
        meetingItemId: 'meeting-2',
        meetingTitle: 'Webinar planning',
        meetingDate: '2026-08-04T12:00:00.000Z',
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `extra-${index + 1}`,
        title: `Extra action ${index + 1}`,
        spaceId: 'space-1',
        meetingItemId: `extra-meeting-${index + 1}`,
        meetingTitle: 'More planning',
        meetingDate: '2026-08-03T12:00:00.000Z',
      })),
    ])
    repository.listSnoozedKeys.mockResolvedValue(new Set(['next_move:action-2']))

    const result = await service.list(supabase, scope)

    expect(result.suggestions).toHaveLength(4)
    expect(result.suggestions[0]).toEqual(
      expect.objectContaining({
        id: 'action-1',
        source: expect.objectContaining({ title: 'August 5 offer call' }),
        prompt: expect.stringContaining('Send the revised offer'),
      }),
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
  })
})
