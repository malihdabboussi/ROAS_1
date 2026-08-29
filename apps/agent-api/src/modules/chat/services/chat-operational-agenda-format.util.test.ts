import { describe, expect, it } from 'vitest'
import { formatOperationalAgenda } from './chat-operational-agenda-format.util'

describe('formatOperationalAgenda', () => {
  it('renders every assigned task and meeting without an evidence cap', () => {
    const tasks = Array.from({ length: 9 }, (_, index) => ({
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
        result: { success: true, tasks, total_count: 9 },
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

    expect(output).toContain('## Open tasks (9)')
    expect(output).toContain('**Task 1**')
    expect(output).toContain('**Task 9**')
    expect(output).toContain("## Today's meetings")
    expect(output).toContain('**Team sync** — All day')
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
