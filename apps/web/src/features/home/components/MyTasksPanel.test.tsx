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

    expect(screen.queryByRole('heading', { name: 'MY TASKS' })).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Everything assigned to you — grouped by when it’s due/),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All programs' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const search = screen.getByPlaceholderText('Search tasks…')
    expect(search).toHaveClass('input-glass')
    expect(search).toHaveClass('input-leading')
    expect(search.parentElement).not.toHaveClass('input-glass')
    expect(search.parentElement?.querySelector('svg')).toHaveClass('icon-left-center')
    expect(container.firstElementChild).toHaveClass('border-0')
  })
})
