import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TaskDetailHeader } from './TaskDetailHeader'

describe('TaskDetailHeader', () => {
  afterEach(cleanup)

  it('makes the Space and view breadcrumb crumbs navigable', () => {
    const onNavigateToSpace = vi.fn()
    const onNavigateToView = vi.fn()

    render(
      <TaskDetailHeader
        committedTitle="Build Impact Elite GHL workflows"
        liveTitle="Build Impact Elite GHL workflows"
        spaceName="The Lab 2026 Live Event"
        viewName="Overview"
        viewType="list"
        onNavigateToSpace={onNavigateToSpace}
        onNavigateToView={onNavigateToView}
        onShare={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'The Lab 2026 Live Event' }))
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }))

    expect(onNavigateToSpace).toHaveBeenCalledOnce()
    expect(onNavigateToView).toHaveBeenCalledOnce()
  })
})
