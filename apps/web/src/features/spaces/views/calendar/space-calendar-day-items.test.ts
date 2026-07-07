import { describe, expect, it } from 'vitest'
import type { SpaceItem } from '../../types'
import { itemsScheduledOnDay } from './space-calendar-day-items'

function item(id: string, dueDate: unknown): SpaceItem {
  return {
    id,
    space_id: 'space-1',
    title: id,
    status: 'todo',
    due_date: typeof dueDate === 'string' ? dueDate : null,
    start_date: null,
    parent_item_id: null,
    sort_order: 0,
    custom_data: {
      due_date: dueDate,
    },
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  } as unknown as SpaceItem
}

describe('itemsScheduledOnDay', () => {
  it('keeps rows scheduled on the selected calendar day only', () => {
    const rows = [
      item('same-day-midnight', '2026-06-21'),
      item('same-day-time', '2026-06-21T14:30:00.000Z'),
      item('other-day', '2026-06-22T09:00:00.000Z'),
      item('empty', ''),
      item('non-string', 123),
    ]

    const result = itemsScheduledOnDay(rows, 'due_date', new Date('2026-06-21T08:00:00.000Z'))

    expect(result.map((row) => row.id)).toEqual(['same-day-midnight', 'same-day-time'])
  })
})
