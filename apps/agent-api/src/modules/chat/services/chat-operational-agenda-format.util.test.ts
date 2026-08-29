import { describe, expect, it } from 'vitest'
import { formatOperationalAgenda } from './chat-operational-agenda-format.util'

describe('formatOperationalAgenda', () => {
  it('keeps the daily agenda bounded while preserving the full open-task count', () => {
    const tasks = Array.from({ length: 12 }, (_, index) => ({
      title: `Task ${index + 1}`,
      priority_label: index === 0 ? 'High' : 'Medium',
      status_label: 'To Do',
      space_title: 'CEO HQ',
    }))
    const output = formatOperationalAgenda([
      {
        name: 'list_tasks',
        label: 'Retrieving your open assigned tasks',
        status: 'completed',
        result: { success: true, tasks, total_count: 12 },
      },
      {
        name: 'list_calendar_events',
        label: "Retrieving today's meetings",
        status: 'completed',
        result: {
          success: true,
          events: [{ title: 'Team sync', all_day: true }],
        },
      },
    ])

    expect(output).toContain('## Open tasks — focus now (10 of 12)')
    expect(output).toContain('**Task 1**')
    expect(output).toContain('**Task 10**')
    expect(output).not.toContain('**Task 11**')
    expect(output).toContain('2 more open tasks are available in My Tasks.')
    expect(output).toContain("## Today's meetings")
    expect(output).toContain('**Team sync** — All day')
  })

  it('separates stale commitments from current focus instead of flooding the agenda', () => {
    const tasks = [
      {
        title: 'Introduce Shannon to Adley',
        due_date: '2026-08-31T00:00:00.000Z',
        status_label: 'To action',
        space_title: 'Meetings',
      },
      ...Array.from({ length: 34 }, (_, index) => ({
        title: `Historical action ${index + 1}`,
        due_date: '2026-07-29T00:00:00.000Z',
        status_label: 'To action',
        space_title: 'Meetings',
        custom_data: {
          action_lifecycle: { review_state: 'needs_review', review_reason: 'overdue' },
        },
      })),
    ]

    const output = formatOperationalAgenda(
      [
        {
          name: 'list_tasks',
          label: 'Retrieving your open assigned tasks',
          status: 'completed',
          result: { success: true, tasks, total_count: 35 },
        },
      ],
      new Date('2026-08-29T19:00:00.000Z'),
    )

    expect(output).toContain('## Open tasks — focus now (1 of 35)')
    expect(output).toContain('**Introduce Shannon to Adley**')
    expect(output).toContain('## Needs review (34)')
    expect(output).toContain('**Historical action 1**')
    expect(output).toContain('**Historical action 3**')
    expect(output).not.toContain('**Historical action 4**')
    expect(output).toContain('Confirm **Done** or **Keep open** in My Tasks')
  })

  it('shows only the next meetings and reports the remainder of the requested window', () => {
    const events = Array.from({ length: 11 }, (_, index) => ({
      title: `Meeting ${index + 1}`,
      start: `2026-09-0${Math.floor(index / 3) + 1}T1${index % 3}:00:00.000Z`,
    }))
    const output = formatOperationalAgenda([
      {
        name: 'list_calendar_events',
        label: 'Retrieving your upcoming meetings',
        status: 'completed',
        result: { success: true, events },
      },
    ])

    expect(output).toContain('## Upcoming meetings (next 8 of 11)')
    expect(output).toContain('**Meeting 8**')
    expect(output).not.toContain('**Meeting 9**')
    expect(output).toContain('3 more meetings are in this window.')
  })

  it('preserves a failed action explanation instead of inventing results', () => {
    const output = formatOperationalAgenda([
      {
        name: 'list_tasks',
        label: 'Retrieving your open assigned tasks',
        status: 'failed',
        error: 'Assigned-task query is unavailable.',
      },
    ])

    expect(output).toBe('## Open tasks\n\nAssigned-task query is unavailable.')
  })

  it('labels a tomorrow-only calendar window accurately', () => {
    const output = formatOperationalAgenda([
      {
        name: 'list_calendar_events',
        label: "Retrieving tomorrow's meetings",
        status: 'completed',
        result: { success: true, events: [] },
      },
    ])

    expect(output).toBe("## Tomorrow's meetings\n\nNo meetings are scheduled in this window.")
  })
})
