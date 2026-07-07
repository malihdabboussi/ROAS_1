import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '../types'

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
  backendGet: vi.fn(),
  channel: vi.fn(),
  fetchItemActivity: vi.fn(),
  fetchSubtasks: vi.fn(),
  handlers: new Map<string, RealtimeHandler>(),
  lastChannel: null as ChannelMock | null,
  removeChannel: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

vi.mock('../services/spaces.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/spaces.service')>()
  return {
    ...actual,
    fetchItemActivity: mocks.fetchItemActivity,
    fetchSubtasks: mocks.fetchSubtasks,
  }
})

import { useTaskDetailData } from './useTaskDetailData'

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

function buildItem(overrides: Partial<SpaceItem> = {}): SpaceItem {
  return {
    id: 'task-1',
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Parent task',
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
    updated_at: '2026-06-29T10:00:00.000Z',
    ...overrides,
  }
}

describe('useTaskDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.lastChannel = null
    mocks.fetchSubtasks.mockResolvedValue([])
    mocks.fetchItemActivity.mockResolvedValue([])
    mocks.backendGet.mockResolvedValue([])
    mocks.channel.mockImplementation(() => {
      mocks.lastChannel = createChannelMock()
      return mocks.lastChannel
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps the open task subtask panel in sync with space item changes', async () => {
    const parent = buildItem()
    const { result, unmount } = renderHook(() => useTaskDetailData(parent))

    await waitFor(() => expect(mocks.fetchSubtasks).toHaveBeenCalledWith('space-1', 'task-1'))
    expect(mocks.handlers.has('space_item_activity')).toBe(true)
    expect(mocks.handlers.has('space_items')).toBe(true)

    act(() => {
      mocks.handlers.get('space_items')?.({
        eventType: 'INSERT',
        new: buildItem({
          id: 'subtask-1',
          title: 'First subtask',
          parent_item_id: 'task-1',
        }) as unknown as Record<string, unknown>,
        old: null,
      })
    })

    expect(result.current.subtasks.map((subtask) => subtask.id)).toEqual(['subtask-1'])

    act(() => {
      mocks.handlers.get('space_items')?.({
        eventType: 'UPDATE',
        new: buildItem({
          id: 'subtask-1',
          title: 'Updated subtask',
          parent_item_id: 'task-1',
        }) as unknown as Record<string, unknown>,
        old: null,
      })
    })

    expect(result.current.subtasks[0]?.title).toBe('Updated subtask')

    act(() => {
      mocks.handlers.get('space_items')?.({
        eventType: 'UPDATE',
        new: buildItem({
          id: 'subtask-1',
          title: 'Moved subtask',
          parent_item_id: 'another-task',
        }) as unknown as Record<string, unknown>,
        old: null,
      })
    })

    expect(result.current.subtasks).toEqual([])

    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.lastChannel)
  })
})
