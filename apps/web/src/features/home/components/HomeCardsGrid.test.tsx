import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_HOME_FEED_SCOPE } from '@/features/home/types/home-feed-scope'
import { HomeCardsGrid } from './HomeCardsGrid'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/features/home/hooks/use-home-layout', () => ({
  useHomeLayout: () => ({
    layout: { cardIds: ['my_tasks'], cardSizes: {}, cardRows: {} },
    editing: false,
    setEditing: vi.fn(),
    addCard: vi.fn(),
    removeCard: vi.fn(),
    reorderCards: vi.fn(),
    setCardSize: vi.fn(),
    setCardRows: vi.fn(),
  }),
}))

vi.mock('@/features/home/components/cards/HomeCardRenderer', () => ({
  HomeCardRenderer: ({ onExpandMyTasks }: { onExpandMyTasks: () => void }) => (
    <button type="button" onClick={onExpandMyTasks}>
      Expand my tasks
    </button>
  ),
}))

describe('HomeCardsGrid', () => {
  afterEach(() => {
    cleanup()
    push.mockReset()
  })

  it('opens All Tasks instead of the retired My Tasks overlay', () => {
    render(
      <HomeCardsGrid
        myTasksScope={{ ...DEFAULT_HOME_FEED_SCOPE }}
        updateMyTasksScope={vi.fn()}
        approvalScope={{ ...DEFAULT_HOME_FEED_SCOPE }}
        updateApprovalScope={vi.fn()}
        myTasksLoading={false}
        approvalLoading={false}
        myTasksItems={[]}
        approvalItems={[]}
        onOpenItem={vi.fn()}
        onNotificationClick={vi.fn()}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Expand my tasks' }))
    expect(push).toHaveBeenCalledWith('/all-tasks?scope=my')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
