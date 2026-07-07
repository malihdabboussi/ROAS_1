import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClarificationCard } from './ClarificationCard'

const questions = [
  {
    id: 'goal',
    text: 'What should Loop optimize?',
    type: 'single_choice' as const,
    required: true,
    options: [
      { id: 'speed', label: 'Speed' },
      { id: 'quality', label: 'Quality', description: 'Prefer stronger guardrails' },
    ],
  },
]

describe('ClarificationCard', () => {
  afterEach(cleanup)

  it('keeps required-answer validation and submit payload behavior', () => {
    const onSubmit = vi.fn()
    render(<ClarificationCard title="Flow choices" questions={questions} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.queryByText('Please answer this question to continue')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Quality/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onSubmit).toHaveBeenCalledWith({ goal: 'quality' })
    expect(screen.getByText('Submitting...')).toBeTruthy()
  })

  it('renders skipped and submitted summary states', () => {
    const { rerender } = render(
      <ClarificationCard title="Flow choices" questions={questions} status="skipped" />,
    )

    expect(screen.getByText('Skipped')).toBeTruthy()

    rerender(
      <ClarificationCard
        title="Flow choices"
        questions={questions}
        status="submitted"
        answers={{ goal: 'speed' }}
      />,
    )

    expect(screen.getByText('What should Loop optimize?')).toBeTruthy()
    expect(screen.getByText('Speed')).toBeTruthy()
  })
})
