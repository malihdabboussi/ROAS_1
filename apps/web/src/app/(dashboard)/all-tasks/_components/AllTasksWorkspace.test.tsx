import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TaskRollupItem } from '@/lib/tasks'
import { AllTasksWorkspace } from './AllTasksWorkspace'

const item: TaskRollupItem = {
  id: 'task-1',
  title: 'Brief Anisa on the strategy glue expectations',
  status: 'todo',
  due_at: null,
  assignee_user_id: 'user-1',
  assignees: [],
  space_id: 'space-1',
  space_title: 'General',
  campaign_id: null,
  campaign_name: null,
  program_id: null,
  program_name: null,
  source_url: '/spaces?space=space-1&item=task-1',
  org_id: 'org-1',
  created_at: '2026-08-16T12:00:00.000Z',
  updated_at: null,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/all-tasks/components/AllTasksBoard', () => ({
  AllTasksBoard: ({ onOpenItem }: { onOpenItem?: (row: TaskRollupItem) => void }) => (
    <button type="button" onClick={() => onOpenItem?.(item)}>
      Open rollup task
    </button>
  ),
}))

vi.mock('@/features/home/components/HomeTaskDetailHost', () => ({
  HomeTaskDetailHost: ({
    item: openItem,
    presentation,
    onClose,
  }: {
    item: { title: string }
    presentation?: string
    onClose: () => void
  }) => (
    <div>
      <p>{openItem.title}</p>
      <p>{presentation}</p>
      <button type="button" onClick={onClose}>
        Close task
      </button>
    </div>
  ),
}))

describe('AllTasksWorkspace', () => {
  afterEach(cleanup)

  it('opens and closes the right-side task card without leaving All Tasks', () => {
    render(<AllTasksWorkspace />)

    expect(screen.queryByText('Brief Anisa on the strategy glue expectations')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open rollup task' }))
    expect(screen.getByText('Brief Anisa on the strategy glue expectations')).toBeInTheDocument()
    expect(screen.getByText('panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close task' }))
    expect(screen.queryByText('Brief Anisa on the strategy glue expectations')).toBeNull()
  })
})
