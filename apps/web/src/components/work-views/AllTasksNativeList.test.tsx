import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '@/features/spaces/types'
import type { TaskRollupItem } from '@/lib/tasks'
import { AllTasksNativeList } from './AllTasksNativeList'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/features/spaces/components/ListView', () => ({
  ListView: ({
    items,
    onOpenDetail,
  }: {
    items: SpaceItem[]
    onOpenDetail?: (item: SpaceItem) => void
  }) => (
    <button type="button" onClick={() => onOpenDetail?.(items[0]!)}>
      Open {items[0]?.title}
    </button>
  ),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: {
      roster: []
      currentUserId: null
      loadRoster: () => Promise<void>
    }) => unknown,
  ) =>
    selector({
      roster: [],
      currentUserId: null,
      loadRoster: async () => undefined,
    }),
}))

const item: TaskRollupItem = {
  id: 'task-1',
  title: 'QA assignee',
  status: 'todo',
  due_at: null,
  assignee_user_id: null,
  assignees: [],
  space_id: 'space-1',
  space_title: 'General',
  campaign_id: null,
  campaign_name: null,
  program_id: null,
  program_name: null,
  source_url: '/spaces?space=space-1&item=task-1',
  created_at: '2026-08-16T12:00:00.000Z',
  updated_at: null,
}

describe('AllTasksNativeList', () => {
  afterEach(() => {
    cleanup()
    push.mockReset()
  })

  it('opens the Space item route when no side-card handler is provided', () => {
    render(<AllTasksNativeList items={[item]} reload={async () => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open QA assignee' }))
    expect(push).toHaveBeenCalledWith('/spaces?space=space-1&item=task-1')
  })

  it('keeps the list mounted and calls onOpenItem when a side-card handler is provided', () => {
    const onOpenItem = vi.fn()
    render(
      <AllTasksNativeList items={[item]} reload={async () => undefined} onOpenItem={onOpenItem} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open QA assignee' }))
    expect(onOpenItem).toHaveBeenCalledWith(item)
    expect(push).not.toHaveBeenCalled()
  })
})
