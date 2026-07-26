import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_HOME_FEED_SCOPE } from '@/features/home/types/home-feed-scope'
import { MyTasksPanel } from './MyTasksPanel'

vi.mock('@/features/home/components/HomeFeedScopePicker', () => ({
  HomeFeedScopePicker: ({ showSummary }: { showSummary?: boolean }) => (
    <button type="button">{showSummary ? 'All programs' : 'Filter'}</button>
  ),
}))

describe('MyTasksPanel', () => {
  afterEach(cleanup)

  it('renders the page presentation without dialog chrome or nested search styling', () => {
    const { container } = render(
      <MyTasksPanel
        open
        onOpenChange={vi.fn()}
        scope={{ ...DEFAULT_HOME_FEED_SCOPE }}
        updateScope={vi.fn()}
        loading={false}
        items={[]}
        onOpenItem={vi.fn()}
        presentation="page"
      />,
    )

    expect(screen.getByRole('heading', { name: 'MY TASKS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All programs' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const search = screen.getByPlaceholderText('Search tasks…')
    expect(search).toHaveClass('input-glass')
    expect(search.parentElement).not.toHaveClass('input-glass')
    expect(container.firstElementChild).toHaveClass('border-0')
  })
})
