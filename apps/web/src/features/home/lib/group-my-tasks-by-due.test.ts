import { describe, expect, it } from 'vitest'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import {
  classifyMyTaskDueBucket,
  filterMyTasksBySearch,
  groupMyTasksByDue,
} from './group-my-tasks-by-due'

function item(
  partial: Pick<YourTurnItem, 'id' | 'title'> & Partial<YourTurnItem>,
): YourTurnItem {
  return {
    kind: 'space_item',
    status: 'inbox',
    assignee_user_id: 'u1',
    org_id: null,
    mission_id: null,
    space_id: 's1',
    suggestion_state: null,
    due_at: null,
    source_url: null,
    preview: null,
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: null,
    ...partial,
  }
}

describe('group-my-tasks-by-due', () => {
  // Local calendar anchors so classification is stable across CI timezones.
  const now = new Date(2026, 6, 16, 15, 0, 0)
  const yesterday = new Date(2026, 6, 15, 12, 0, 0).toISOString()
  const todayMorning = new Date(2026, 6, 16, 9, 0, 0).toISOString()
  const nextWeek = new Date(2026, 6, 20, 12, 0, 0).toISOString()

  it('classifies overdue / today / upcoming / no due', () => {
    expect(classifyMyTaskDueBucket(yesterday, now)).toBe('overdue')
    expect(classifyMyTaskDueBucket(todayMorning, now)).toBe('today')
    expect(classifyMyTaskDueBucket(nextWeek, now)).toBe('upcoming')
    expect(classifyMyTaskDueBucket(null, now)).toBe('no_due')
  })

  it('groups and orders sections', () => {
    const groups = groupMyTasksByDue(
      [
        item({ id: '1', title: 'Later', due_at: nextWeek }),
        item({ id: '2', title: 'Old', due_at: yesterday }),
        item({ id: '3', title: 'Today A', due_at: todayMorning }),
        item({ id: '4', title: 'Undated' }),
        item({
          id: '5',
          title: 'Suggestion',
          kind: 'suggestion',
          due_at: yesterday,
        }),
      ],
      now,
    )
    expect(groups.map((g) => g.id)).toEqual(['overdue', 'today', 'upcoming', 'no_due'])
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['2'])
    expect(groups.find((g) => g.id === 'today')!.items.map((i) => i.id)).toEqual(['3'])
  })

  it('filters by search', () => {
    const rows = [
      item({ id: '1', title: 'FIFA vlog', preview: 'World Cup' }),
      item({ id: '2', title: 'Podcast shoots' }),
    ]
    expect(filterMyTasksBySearch(rows, 'fifa').map((i) => i.id)).toEqual(['1'])
    expect(filterMyTasksBySearch(rows, 'cup').map((i) => i.id)).toEqual(['1'])
  })
})
