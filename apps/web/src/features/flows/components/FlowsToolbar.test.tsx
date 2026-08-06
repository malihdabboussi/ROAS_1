import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlowsToolbar } from './FlowsToolbar'

function renderToolbar(overrides: Partial<Parameters<typeof FlowsToolbar>[0]> = {}) {
  const props: Parameters<typeof FlowsToolbar>[0] = {
    view: 'grid',
    onViewChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    searchOpen: false,
    onSearchOpenChange: vi.fn(),
    draftFilter: 'all',
    onDraftFilterChange: vi.fn(),
    enabledFilter: 'all',
    onEnabledFilterChange: vi.fn(),
    triggerFilter: 'all',
    onTriggerFilterChange: vi.fn(),
    triggerFilterOptions: [],
    surfaceFilter: 'all',
    onSurfaceFilterChange: vi.fn(),
    incompleteOnly: false,
    onIncompleteOnlyChange: vi.fn(),
    sort: 'recent',
    onSortChange: vi.fn(),
    groupBy: 'none',
    onGroupByChange: vi.fn(),
    groupSort: 'asc',
    onGroupSortChange: vi.fn(),
    ...overrides,
  }

  render(<FlowsToolbar {...props} />)
  return props
}

describe('FlowsToolbar', () => {
  afterEach(() => cleanup())

  it('uses explicit pressed states and opens search without a competing motion wrapper', () => {
    const props = renderToolbar()

    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    expect(props.onViewChange).toHaveBeenCalledWith('list')

    fireEvent.click(screen.getByRole('button', { name: 'Search flows' }))
    expect(props.onSearchOpenChange).toHaveBeenCalledWith(true)
  })

  it('renders the canonical search field and closes it with Escape', () => {
    const props = renderToolbar({ searchOpen: true, search: 'launch' })
    const search = screen.getByRole('searchbox', { name: 'Search flows' })

    expect(search).toHaveClass('input-leading')
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(props.onSearchChange).toHaveBeenCalledWith('')
    expect(props.onSearchOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps all controls in one horizontally scrollable row', () => {
    renderToolbar()

    const toolbar = screen.getByRole('button', { name: 'Grid view' }).closest('.scrollbar-hide')
    expect(toolbar).toHaveClass('flex-nowrap', 'overflow-x-auto')
  })
})
