import { describe, expect, it } from 'vitest'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'
import {
  buildParentAndSubtaskStatusUpdates,
  isTerminalStatusId,
  listOpenSubtasks,
  shouldConfirmCompleteOpenSubtasks,
} from './complete-open-subtasks-on-status'

const statusField: FieldDef = {
  id: 'status',
  name: 'Status',
  type: 'select',
  options: [
    { id: 'logged', label: 'To action', color: 'slate', group: 'not_started' },
    { id: 'processing', label: 'Processing', color: 'cyan', group: 'active' },
    { id: 'closed', label: 'Done', color: 'emerald', group: 'closed' },
  ],
}

function item(partial: Partial<SpaceItem> & Pick<SpaceItem, 'id'>): SpaceItem {
  return {
    space_id: 'space-1',
    org_id: null,
    user_id: 'u1',
    title: 'Task',
    status: 'logged',
    priority: null,
    assignee_type: null,
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    description: null,
    notes: null,
    source: null,
    sort_order: 0,
    linked_mission_id: null,
    parent_item_id: null,
    custom_data: {},
    created_at: '',
    updated_at: '',
    ...partial,
  } as SpaceItem
}

describe('complete-open-subtasks-on-status', () => {
  it('detects terminal status ids from schema groups', () => {
    expect(isTerminalStatusId('closed', statusField)).toBe(true)
    expect(isTerminalStatusId('processing', statusField)).toBe(false)
  })

  it('lists only open direct subtasks', () => {
    const items = [
      item({ id: 'parent' }),
      item({ id: 'open', parent_item_id: 'parent', status: 'logged' }),
      item({ id: 'done', parent_item_id: 'parent', status: 'closed' }),
      item({ id: 'other', parent_item_id: 'other-parent', status: 'logged' }),
    ]
    expect(listOpenSubtasks(items, 'parent', statusField).map((i) => i.id)).toEqual(['open'])
  })

  it('confirms only for top-level parents moving to terminal with open children', () => {
    const parent = item({ id: 'parent' })
    const open = [item({ id: 'open', parent_item_id: 'parent' })]
    expect(
      shouldConfirmCompleteOpenSubtasks({
        parent,
        nextStatus: 'closed',
        openSubtasks: open,
        statusField,
      }),
    ).toBe(true)
    expect(
      shouldConfirmCompleteOpenSubtasks({
        parent: item({ id: 'sub', parent_item_id: 'parent' }),
        nextStatus: 'closed',
        openSubtasks: open,
        statusField,
      }),
    ).toBe(false)
    expect(
      shouldConfirmCompleteOpenSubtasks({
        parent,
        nextStatus: 'processing',
        openSubtasks: open,
        statusField,
      }),
    ).toBe(false)
    expect(
      shouldConfirmCompleteOpenSubtasks({
        parent,
        nextStatus: 'closed',
        openSubtasks: [],
        statusField,
      }),
    ).toBe(false)
  })

  it('builds parent-only or parent+children status updates', () => {
    expect(
      buildParentAndSubtaskStatusUpdates('p', { status: 'closed' }, ['a', 'b'], false),
    ).toEqual([{ itemId: 'p', payload: { status: 'closed' } }])
    expect(
      buildParentAndSubtaskStatusUpdates('p', { status: 'closed' }, ['a', 'b'], true),
    ).toEqual([
      { itemId: 'p', payload: { status: 'closed' } },
      { itemId: 'a', payload: { status: 'closed' } },
      { itemId: 'b', payload: { status: 'closed' } },
    ])
  })
})
