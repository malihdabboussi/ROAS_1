import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HierarchyViewBar } from './HierarchyViewBar'

describe('HierarchyViewBar', () => {
  it('renders hierarchy views and selects a view from the shared strip', () => {
    const onSelectView = vi.fn()
    render(
      <HierarchyViewBar
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'layout-grid' },
          { id: 'canvas', label: 'Canvas', icon: 'panels-top-left' },
        ]}
        activeViewId="overview"
        onSelectView={onSelectView}
        rightSlot={<button type="button">View settings</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'View settings' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Canvas' }))
    expect(onSelectView).toHaveBeenCalledWith('canvas')
  })
})
