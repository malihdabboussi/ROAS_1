import { describe, expect, it } from 'vitest'
import { diffUpdateActivity } from '../space-item-activity.helpers'

const BASE = {
  item_id: 'item-1',
  space_id: 'space-1',
  user_id: 'user-1',
  org_id: null,
}

const OLD_ITEM: Record<string, unknown> = {
  id: 'item-1',
  space_id: 'space-1',
  title: 'Original title',
  status: 'todo',
  priority: 'medium',
  assignee_type: 'unassigned',
  assignee_id: null,
  start_date: null,
  due_date: null,
  recurrence: null,
  notes: null,
  doc_body: null,
  sort_order: 0,
  parent_item_id: null,
  custom_data: {},
}

describe('diffUpdateActivity', () => {
  it('returns empty array when nothing changed', () => {
    expect(diffUpdateActivity(OLD_ITEM, {}, BASE)).toEqual([])
  })

  it('detects status_change', () => {
    const result = diffUpdateActivity(OLD_ITEM, { status: 'in_progress' }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].event_type).toBe('status_change')
    expect(result[0].payload).toEqual({ from: 'todo', to: 'in_progress' })
  })

  it('skips status_change when value is the same', () => {
    const result = diffUpdateActivity(OLD_ITEM, { status: 'todo' }, BASE)
    expect(result).toHaveLength(0)
  })

  it('detects assignee_change from type change', () => {
    const result = diffUpdateActivity(
      OLD_ITEM,
      { assignee_type: 'human', assignee_id: 'user-2' },
      BASE,
    )
    expect(result).toHaveLength(1)
    expect(result[0].event_type).toBe('assignee_change')
    expect(result[0].payload).toEqual({
      from: [{ type: 'unassigned', id: null }],
      to: {
        assignees: [],
        primary: { type: 'human', id: 'user-2' },
      },
    })
  })

  it('detects title field_change', () => {
    const result = diffUpdateActivity(OLD_ITEM, { title: 'New title' }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].event_type).toBe('field_change')
    expect(result[0].payload).toEqual({ field: 'title', from: 'Original title', to: 'New title' })
  })

  it('detects priority field_change', () => {
    const result = diffUpdateActivity(OLD_ITEM, { priority: 'high' }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].payload).toEqual({ field: 'priority', from: 'medium', to: 'high' })
  })

  it('detects due_date field_change', () => {
    const result = diffUpdateActivity(OLD_ITEM, { due_date: '2026-05-01T00:00:00Z' }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].payload).toEqual({ field: 'due_date', from: null, to: '2026-05-01T00:00:00Z' })
  })

  it('detects notes field_change and truncates long text', () => {
    const long = 'x'.repeat(500)
    const result = diffUpdateActivity(OLD_ITEM, { notes: long }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].event_type).toBe('field_change')
    expect(result[0].payload.field).toBe('notes')
    expect((result[0].payload.to as string).length).toBe(300)
  })

  it('detects doc_body field_change and truncates long text', () => {
    const long = 'x'.repeat(500)
    const result = diffUpdateActivity(OLD_ITEM, { doc_body: long }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].event_type).toBe('field_change')
    expect(result[0].payload.field).toBe('doc_body')
    expect((result[0].payload.to as string).length).toBe(300)
  })

  it('detects recurrence field_change with reversible values', () => {
    const result = diffUpdateActivity(OLD_ITEM, { recurrence: { frequency: 'daily' } }, BASE)
    expect(result).toHaveLength(1)
    expect(result[0].payload).toEqual({
      field: 'recurrence',
      from: null,
      to: { frequency: 'daily' },
    })
  })

  it('detects custom_data per-key changes', () => {
    const old = { ...OLD_ITEM, custom_data: { tags: ['a'], color: 'red' } }
    const result = diffUpdateActivity(
      old,
      { custom_data: { tags: ['a', 'b'], color: 'red' } },
      BASE,
    )
    expect(result).toHaveLength(1)
    expect(result[0].payload).toEqual({ field: 'tags', from: ['a'], to: ['a', 'b'] })
  })

  it('produces multiple entries for a multi-field update', () => {
    const result = diffUpdateActivity(
      OLD_ITEM,
      {
        status: 'done',
        priority: 'urgent',
        notes: 'Completed',
      },
      BASE,
    )
    expect(result).toHaveLength(3)
    const types = result.map((e) => e.event_type)
    expect(types).toContain('status_change')
    expect(types).toContain('field_change')
  })
})
