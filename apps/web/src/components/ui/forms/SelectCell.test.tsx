import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SelectCell } from './SelectCell'

const priorityField = {
  id: 'priority',
  name: 'Priority',
  type: 'select' as const,
  options: [
    { id: 'low', label: 'Low', color: 'slate' },
    { id: 'medium', label: 'Medium', color: 'blue' },
    { id: 'high', label: 'High', color: 'orange' },
  ],
}

const callKindField = {
  id: 'call_kind',
  name: 'Call Kind',
  type: 'select' as const,
  options: [
    { id: 'personal', label: 'Personal', color: 'emerald' },
    { id: 'team', label: 'Team', color: 'violet' },
  ],
}

describe('SelectCell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the selected priority and emits the selected option id', () => {
    const onChange = vi.fn()

    render(<SelectCell field={priorityField} value="medium" onChange={onChange} />)

    expect(screen.getByRole('button', { name: /medium/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /medium/i }))
    fireEvent.click(screen.getByRole('button', { name: /high/i }))

    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('shows the option label for generic selects in list cells (not only the color dot)', () => {
    render(<SelectCell field={callKindField} value="personal" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /personal/i })).toBeTruthy()
    expect(screen.getByText('Personal')).toBeTruthy()
  })
})
