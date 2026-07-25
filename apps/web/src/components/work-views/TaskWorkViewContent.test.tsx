import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TaskRollupItem } from '@/lib/tasks'
import { TaskWorkViewContent } from './TaskWorkViewContent'
import { WorkViewTabs } from './WorkViewTabs'

const task: TaskRollupItem = {
  id: 'task-1',
  title: 'Prepare launch brief',
  status: 'in_progress',
  due_at: '2026-07-26T12:00:00.000Z',
  assignee_user_id: null,
  assignees: [],
  space_id: 'space-1',
  space_title: 'Launch',
  campaign_id: 'campaign-1',
  campaign_name: 'Acme',
  program_id: 'program-1',
  program_name: 'Clients',
  source_url: '/spaces?space=space-1&item=task-1',
  created_at: '2026-07-25T12:00:00.000Z',
  updated_at: null,
}

describe('TaskWorkViewContent', () => {
  afterEach(cleanup)

  it('renders and opens a task from the List view', () => {
    const onOpenTask = vi.fn()
    render(
      <TaskWorkViewContent
        view="list"
        items={[task]}
        loading={false}
        emptyMessage="No tasks"
        onOpenTask={onOpenTask}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Prepare launch brief/ }))
    expect(onOpenTask).toHaveBeenCalledWith(task)
  })

  it('groups task cards by status in the Board view', () => {
    render(
      <TaskWorkViewContent
        view="board"
        items={[task]}
        loading={false}
        emptyMessage="No tasks"
        onOpenTask={vi.fn()}
      />,
    )

    expect(screen.getByText('In progress')).toBeTruthy()
    expect(screen.getByText('Prepare launch brief')).toBeTruthy()
  })

  it('groups dated tasks in the Calendar view', () => {
    render(
      <TaskWorkViewContent
        view="calendar"
        items={[task]}
        loading={false}
        emptyMessage="No tasks"
        onOpenTask={vi.fn()}
      />,
    )

    expect(screen.getByText('July 26')).toBeTruthy()
    expect(screen.getByText('Prepare launch brief')).toBeTruthy()
  })

  it('only renders the work views enabled by the parent scope', () => {
    render(<WorkViewTabs value="list" views={['list', 'calendar']} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'List' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Calendar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Board' })).toBeNull()
  })
})
