import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItemRealtimeChange } from '../types'

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

type RealtimeHandler = (payload: RealtimePayload) => void

type ChannelMock = {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  handlers: new Map<string, RealtimeHandler>(),
  lastChannel: null as ChannelMock | null,
  removeChannel: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

import { useSpacesStore } from '../store/use-spaces-store'
import { useSpaceItemsRealtime } from './use-space-items-realtime'

function createChannelMock(): ChannelMock {
  const channel: ChannelMock = {
    on: vi.fn((_event, config: { table?: string }, handler: RealtimeHandler) => {
      if (config.table) mocks.handlers.set(config.table, handler)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return channel
}

function seedActiveSpace() {
  useSpacesStore.setState({
    spaces: [
      {
        id: 'space-1',
        org_id: 'org-1',
        user_id: 'user-1',
        title: 'User Flows Testing',
        description: null,
        campaign_id: null,
        is_template: false,
        visibility: 'team',
        schema: {
          version: 1,
          fields: [
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              system: true,
              required: true,
              options: [{ id: 'todo', label: 'To Do', color: 'cyan' }],
            },
          ],
          views: [{ id: 'kanban', name: 'Board', type: 'kanban', group_by: 'status' }],
        },
        created_at: '2026-06-29T10:00:00.000Z',
        updated_at: '2026-06-29T10:00:00.000Z',
      },
    ],
    activeSpaceId: 'space-1',
    activeViewId: 'kanban',
    items: [],
    itemsLoadedForSpaceId: 'space-1',
    itemsLoadedForQueryKey: 'task',
  })
}

describe('useSpaceItemsRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.lastChannel = null
    mocks.channel.mockImplementation(() => {
      mocks.lastChannel = createChannelMock()
      return mocks.lastChannel
    })
    seedActiveSpace()
  })

  afterEach(() => {
    cleanup()
  })

  it('subscribes to item changes and active space schema updates', async () => {
    const onChange = vi.fn<(change: SpaceItemRealtimeChange) => void>()
    const { unmount } = renderHook(() => useSpaceItemsRealtime('space-1', onChange))

    await waitFor(() => expect(mocks.handlers.has('space_items')).toBe(true))
    expect(mocks.handlers.has('spaces')).toBe(true)
    expect(mocks.channel).toHaveBeenCalledWith('space_items:space-1')

    act(() => {
      mocks.handlers.get('space_items')?.({
        eventType: 'UPDATE',
        new: {
          id: 'item-1',
          space_id: 'space-1',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'Flow test',
          status: 'todo',
          priority: null,
          assignee_type: 'unassigned',
          assignee_id: null,
          assignees: [],
          start_date: null,
          due_date: null,
          recurrence: null,
          parent_item_id: null,
          recurrence_parent_id: null,
          description: null,
          notes: null,
          doc_body: null,
          source: 'manual',
          linked_mission_id: null,
          form_id: null,
          task_execution_status: null,
          is_private: false,
          share_link_enabled: false,
          share_token: null,
          sort_order: 0,
          custom_data: {},
          created_at: '2026-06-29T10:00:00.000Z',
          updated_at: '2026-06-29T10:01:00.000Z',
        },
        old: null,
      })
    })

    expect(onChange).toHaveBeenCalledWith({
      type: 'upsert',
      item: expect.objectContaining({ id: 'item-1', status: 'todo' }),
    })

    act(() => {
      mocks.handlers.get('spaces')?.({
        eventType: 'UPDATE',
        new: {
          id: 'space-1',
          schema: {
            version: 1,
            fields: [
              {
                id: 'status',
                name: 'Status',
                type: 'select',
                system: true,
                required: true,
                options: [
                  { id: 'todo', label: 'To Do', color: 'cyan' },
                  { id: 'bugged_flow', label: 'Bugged Flow', color: 'red' },
                ],
              },
            ],
            views: [{ id: 'kanban', name: 'Board', type: 'kanban', group_by: 'status' }],
          },
        },
        old: null,
      })
    })

    const statusField = useSpacesStore
      .getState()
      .spaces[0]?.schema.fields.find((field) => field.id === 'status')

    expect(statusField?.options?.map((option) => option.id)).toEqual(['todo', 'bugged_flow'])

    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.lastChannel)
  })
})
