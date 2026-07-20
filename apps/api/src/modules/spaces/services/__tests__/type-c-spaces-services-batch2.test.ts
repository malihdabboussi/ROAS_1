import { describe, expect, it, vi } from 'vitest'
import { AdsResearchSearchService } from '../ads-research-search.service'
import { SpaceNotificationsService } from '../space-notifications.service'
import { SpacePermissionsService } from '../space-permissions.service'
import { SpaceRecurrenceService } from '../space-recurrence.service'

describe('Type C Spaces service batch 2 baselines', () => {
  it('materializes due recurring items and releases the recurrence lock', async () => {
    const recurringRow = {
      id: 'item_1',
      space_id: 'space_1',
      org_id: 'org_1',
      user_id: 'user_1',
      title: 'Renew contract',
      status: 'todo',
      priority: 'high',
      assignee_type: 'human',
      assignee_id: 'user_2',
      assignees: [{ type: 'human', id: 'user_2' }],
      start_date: '2026-01-01T08:00:00.000Z',
      due_date: '2026-01-01T10:00:00.000Z',
      description: 'Check renewal',
      notes: 'Internal note',
      source: 'manual',
      sort_order: 10,
      linked_mission_id: null,
      recurrence: {
        frequency: 'daily',
        interval: 1,
        trigger: 'due_date',
        create_new_task: true,
        update_same_item: false,
        sync_to_due_date: true,
        end: { type: 'forever' },
        occurrences_created: 0,
        clone_include: { include_everything: true },
      },
      recurrence_parent_id: null,
      updated_at: '2026-01-01T09:00:00.000Z',
      custom_data: { tags: ['renewal'] },
      parent_item_id: null,
    }
    const createMaterializedInstance = vi.fn().mockResolvedValue(null)
    const updateRecurringItem = vi.fn().mockResolvedValue(null)
    const recurrenceRepo = {
      tryAcquireLock: vi.fn().mockResolvedValue({ acquired: true, errorMessage: null }),
      listRecurringItems: vi.fn().mockResolvedValue({ rows: [recurringRow], errorMessage: null }),
      findMaterializedInstance: vi.fn().mockResolvedValue(null),
      createMaterializedInstance,
      updateRecurringItem,
      releaseLock: vi.fn().mockResolvedValue(null),
    }
    const service = new SpaceRecurrenceService(recurrenceRepo as never)

    const result = await service.materializeDueRecurrences()

    expect(result).toEqual({ processed: 1, materialized: 1 })
    expect(recurrenceRepo.tryAcquireLock).toHaveBeenCalled()
    expect(recurrenceRepo.releaseLock).toHaveBeenCalled()
    expect(createMaterializedInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renew contract',
        status: 'todo',
        priority: 'high',
        recurrence_parent_id: 'item_1',
        due_date: '2026-01-02T10:00:00.000Z',
      }),
    )
    expect(updateRecurringItem).toHaveBeenCalledWith('item_1', {
      recurrence: expect.objectContaining({
        occurrences_created: 1,
        last_materialized_at: expect.any(String),
      }),
    })
  })

  it('refreshes an existing saved ad search without replacing the custom title', async () => {
    const existingQuery: Record<string, unknown> = {
      select: () => existingQuery,
      eq: () => existingQuery,
      ilike: () => existingQuery,
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'saved_1', mission_ids: ['mission_old'] }],
        error: null,
      }),
    }
    const savedRow = {
      id: 'saved_1',
      platform: 'meta',
      kind: 'topic',
      title: 'Custom title',
      query: 'ai tools',
      advertiser: null,
      filters: {},
      results: [],
      result_count: 0,
      mission_ids: ['mission_old', 'mission_new'],
      next_page_token: null,
      created_at: '2026-01-01T00:00:00.000Z',
      last_run_at: '2026-01-02T00:00:00.000Z',
    }
    const single = vi.fn().mockResolvedValue({ data: savedRow, error: null })
    const updateSelect: Record<string, unknown> = {
      eq: () => updateSelect,
      select: () => updateSelect,
      single,
    }
    const update = vi.fn(() => updateSelect)
    const supabase = {
      from: vi.fn().mockReturnValueOnce(existingQuery).mockReturnValueOnce({ update }),
    }
    const service = new AdsResearchSearchService({} as never, {} as never)

    const result = await service.createSavedSearch({
      supabase: supabase as never,
      userId: 'user_1',
      orgId: 'org_1',
      spaceId: 'space_1',
      platform: 'meta',
      kind: 'topic',
      title: 'Replacement title',
      query: 'ai tools',
      advertiser: null,
      filters: {},
      items: [],
      nextPageToken: null,
      missionId: 'mission_new',
    })

    expect(result).toEqual(savedRow)
    expect(update).toHaveBeenCalledWith(
      expect.not.objectContaining({
        title: expect.anything(),
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ mission_ids: ['mission_old', 'mission_new'] }),
    )
  })

  it('builds assignment notifications from activity rows', async () => {
    const insertNotifications = vi.fn().mockResolvedValue(undefined)
    const notificationsRepo = {
      listNotificationItemRows: vi.fn().mockResolvedValue([
        {
          id: 'item_1',
          title: 'Design kickoff',
          user_id: 'creator_1',
          space_id: 'space_1',
          assignees: [],
          assignee_type: 'unassigned',
          assignee_id: null,
        },
      ]),
      insertNotifications,
    }
    const service = new SpaceNotificationsService(notificationsRepo as never)

    await (
      service as unknown as { dispatchInternal: (activities: unknown[]) => Promise<void> }
    ).dispatchInternal([
      {
        event_type: 'assignee_change',
        item_id: 'item_1',
        user_id: 'actor_1',
        org_id: 'org_1',
        payload: {
          from: { assignees: [] },
          to: { assignees: [{ type: 'human', id: 'assignee_1' }] },
        },
      },
    ])

    expect(insertNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'assignee_1',
        org_id: 'org_1',
        type: 'space_task_assigned',
        title: 'Assigned: Design kickoff',
        action_url: '/spaces?space=space_1&item=item_1',
      }),
    ])
  })

  it('returns owner admin access without loading a broken item row', async () => {
    const spaceMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'space_1',
        org_id: 'org_1',
        user_id: 'owner_1',
        visibility: 'private',
        share_link_enabled: false,
        share_token: null,
      },
      error: null,
    })
    const from = vi.fn((table: string) => {
      if (table !== 'spaces') throw new Error(`Unexpected table read: ${table}`)
      const builder: Record<string, unknown> = {
        eq: () => builder,
        maybeSingle: spaceMaybeSingle,
      }
      return {
        select: () => builder,
      }
    })
    const service = new SpacePermissionsService()

    await expect(
      service.resolveEffectiveLevel(
        { from } as never,
        'owner_1',
        null,
        'space_1',
        'missing_item',
        'org_1',
      ),
    ).resolves.toBe('admin')
    expect(from).toHaveBeenCalledTimes(1)
  })
})
