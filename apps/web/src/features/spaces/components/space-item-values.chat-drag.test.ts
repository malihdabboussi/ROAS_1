import { describe, expect, it } from 'vitest'
import type { SpaceItem } from '../types'
import { buildSpaceTaskChatDragPayload, listRowStatusField } from './space-item-values'

function makeItem(overrides: Partial<SpaceItem> = {}): SpaceItem {
  return {
    id: 'item-1',
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Offer strategy session',
    status: 'todo',
    priority: null,
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    description: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    notes: null,
    doc_body: null,
    source: 'fathom',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    sort_order: 0,
    custom_data: {},
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildSpaceTaskChatDragPayload', () => {
  it('builds id+label for application/x-vibey-artifact payloads', () => {
    expect(buildSpaceTaskChatDragPayload(makeItem())).toEqual({
      id: 'item-1',
      label: 'Offer strategy session',
    })
  })

  it('falls back to Task when title is empty', () => {
    expect(buildSpaceTaskChatDragPayload(makeItem({ title: '   ' })).label).toBe('Task')
  })
})

describe('listRowStatusField', () => {
  const status = { id: 'status', name: 'Status', type: 'select' as const }
  const callStatus = { id: 'call_status', name: 'Call status', type: 'select' as const }

  it('keeps the name-column dropdown even when Status is also a column', () => {
    expect(listRowStatusField([status])).toEqual(status)
  })

  it('uses Call status on Meetings so the name dropdown matches that column', () => {
    expect(listRowStatusField([status, callStatus])).toEqual(callStatus)
  })
})
