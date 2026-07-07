import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskExecutionStatusIndicator } from './TaskExecutionStatusIndicator'

describe('TaskExecutionStatusIndicator', () => {
  it('renders a static status-colored dot when no task agent is running', () => {
    const { container } = render(<TaskExecutionStatusIndicator color="yellow" active={false} />)

    const root = container.firstElementChild as HTMLElement

    expect(root.className).not.toContain('animate-pulse')
    expect(root.getAttribute('aria-label')).toBeNull()
    expect(root.getAttribute('data-agent-working')).toBeNull()
    expect(root.querySelector('.bg-yellow-500')).not.toBeNull()
  })

  it('renders a pulsing status-colored orb while the task agent is running', () => {
    render(<TaskExecutionStatusIndicator color="amber" active />)

    const indicator = screen.getByLabelText('Agent is working on this task')

    expect(indicator.className).toContain('animate-pulse')
    expect(indicator.getAttribute('data-agent-working')).toBe('true')
    expect(indicator.querySelector('.bg-amber-500')).not.toBeNull()
  })
})
