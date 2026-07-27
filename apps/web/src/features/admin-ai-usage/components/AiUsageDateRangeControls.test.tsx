import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiUsageDateRangeControls } from './AiUsageDateRangeControls'

describe('AiUsageDateRangeControls', () => {
  afterEach(cleanup)

  it('selects a preset', () => {
    const onChange = vi.fn()
    render(<AiUsageDateRangeControls value={{ days: 7 }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '30 days' }))

    expect(onChange).toHaveBeenCalledWith({ days: 30 })
  })

  it('initializes custom dates, rejects reversed ranges, and applies a valid range', () => {
    const onChange = vi.fn()
    render(
      <AiUsageDateRangeControls
        value={{ days: 7 }}
        displayedRange={{ startDate: '2026-07-10', endDate: '2026-07-16' }}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-07-10')
    expect(screen.getByLabelText('End date')).toHaveValue('2026-07-16')

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-07-20' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-07-19' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-07-21' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledWith({
      startDate: '2026-07-20',
      endDate: '2026-07-21',
    })
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-07-20')
    expect(screen.getByLabelText('End date')).toHaveValue('2026-07-21')
  })
})
