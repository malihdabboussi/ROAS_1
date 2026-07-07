import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MissionControlToolbar,
  type MissionControlToolbarProps,
} from './MissionControlToolbar'

afterEach(() => {
  cleanup()
})

const baseProps: MissionControlToolbarProps = {
  statusFilter: 'open',
  onStatusFilterChange: vi.fn(),
  priorityFilters: [],
  onPriorityFiltersChange: vi.fn(),
  currentSort: 'updated_at.desc',
  onSortChange: vi.fn(),
  searchValue: '',
  onSearchChange: vi.fn(),
  viewMode: 'list',
  onViewModeChange: vi.fn(),
}

function renderToolbar(overrides: Partial<MissionControlToolbarProps> = {}) {
  const props: MissionControlToolbarProps = {
    ...baseProps,
    onStatusFilterChange: vi.fn(),
    onPriorityFiltersChange: vi.fn(),
    onSortChange: vi.fn(),
    onSearchChange: vi.fn(),
    onViewModeChange: vi.fn(),
    ...overrides,
  }

  return {
    props,
    ...render(<MissionControlToolbar {...props} />),
  }
}

function requireElement<T extends Element>(element: T | undefined, label: string): T {
  if (!element) {
    throw new Error(`Missing expected element: ${label}`)
  }
  return element
}

describe('MissionControlToolbar', () => {
  it('routes status, search, clear, and view mode actions through props', () => {
    const { props } = renderToolbar({ searchValue: 'Launch' })

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(props.onStatusFilterChange).toHaveBeenCalledWith('done')

    fireEvent.change(screen.getByPlaceholderText('Search missions...'), {
      target: { value: 'Follow up' },
    })
    expect(props.onSearchChange).toHaveBeenCalledWith('Follow up')

    const desktopSearch = screen.getByPlaceholderText('Search missions...')
    const desktopClearButton = desktopSearch.parentElement?.querySelector('button')
    expect(desktopClearButton).toBeDefined()
    fireEvent.click(desktopClearButton!)
    expect(props.onSearchChange).toHaveBeenCalledWith('')

    fireEvent.click(requireElement(screen.getAllByTitle('Kanban view')[1], 'desktop view toggle'))
    expect(props.onViewModeChange).toHaveBeenCalledWith('kanban')
  })

  it('toggles priority filters from the dropdown without closing selected priority choices', () => {
    const { props } = renderToolbar({ priorityFilters: ['urgent'] })

    fireEvent.click(
      requireElement(screen.getAllByTitle('Filter by priority')[1], 'desktop priority toggle'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'High' }))

    expect(props.onPriorityFiltersChange).toHaveBeenCalledWith(['urgent', 'high'])
    expect(screen.getByRole('button', { name: 'Urgent' })).toBeDefined()
  })

  it('routes sort selection and closes the sort dropdown', () => {
    const { container, props } = renderToolbar()
    const buttons = Array.from(container.querySelectorAll('button'))

    fireEvent.click(requireElement(buttons[buttons.length - 1], 'desktop sort toggle'))
    fireEvent.click(screen.getByRole('button', { name: /Oldest first/i }))

    expect(props.onSortChange).toHaveBeenCalledWith('created_at.asc')
    expect(screen.queryByRole('button', { name: /Oldest first/i })).toBeNull()
  })

  it('closes open dropdowns on outside click and rerenders without state churn', () => {
    const { rerender } = renderToolbar()

    fireEvent.click(
      requireElement(screen.getAllByTitle('Filter by priority')[1], 'desktop priority toggle'),
    )
    expect(screen.getByRole('button', { name: 'Any priority' })).toBeDefined()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: 'Any priority' })).toBeNull()

    rerender(<MissionControlToolbar {...baseProps} searchValue="Updated" />)
    expect(screen.getAllByDisplayValue('Updated')).toHaveLength(2)
  })
})
