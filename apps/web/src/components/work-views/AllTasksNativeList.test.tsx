import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    onAddItemInGroup,
    onSubmitItem,
    quickAddOnSubmitItem,
  }: {
    items: SpaceItem[]
    onOpenDetail?: (item: SpaceItem) => void
    onAddItemInGroup?: (title: string) => Promise<void>
    onSubmitItem?: (title: string) => Promise<void>
    quickAddOnSubmitItem?: (title: string) => Promise<void>
  }) => (
    <div>
      <button type="button" onClick={() => onOpenDetail?.(items[0]!)}>
        Open {items[0]?.title}
      </button>
      <button
        type="button"
        onClick={() =>
          void (quickAddOnSubmitItem ?? onAddItemInGroup ?? onSubmitItem)?.('New task')
        }
      >
        Add task
      </button>
    </div>
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

  it('creates through onAddItem instead of blocking the composer', async () => {
    const onAddItem = vi.fn().mockResolvedValue(undefined)
    const reload = vi.fn().mockResolvedValue(undefined)
    render(<AllTasksNativeList items={[item]} reload={reload} onAddItem={onAddItem} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await waitFor(() => {
      expect(onAddItem).toHaveBeenCalledWith('New task')
      expect(reload).toHaveBeenCalled()
    })
  })

  it('lets the owner clear a canonical stale-task review', async () => {
    const onReviewItem = vi.fn().mockResolvedValue(undefined)
    const reload = vi.fn().mockResolvedValue(undefined)
    render(
      <AllTasksNativeList
        items={[
          {
            ...item,
            custom_data: {
              action_lifecycle: { review_state: 'needs_review', review_reason: 'inactive' },
            },
          },
        ]}
        reload={reload}
        onReviewItem={onReviewItem}
      />,
    )

    expect(screen.getByText('Are these still open?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Still open' }))
    await waitFor(() => {
      expect(onReviewItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }), 'open')
      expect(reload).toHaveBeenCalled()
    })
  })
})
