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

const staticAdProductionQuestions = [
  {
    id: 'static_ad_production_mode',
    text: 'Which kind of static ad should I create?',
    type: 'single_choice' as const,
    required: true,
    options: [
      {
        id: 'validate_messaging',
        label: 'Validate messaging angles',
        description: 'Turn approved message angles into clear visual hooks.',
      },
      {
        id: 'image_brief',
        label: 'Image brief',
        description: 'Build a qualified image brief, then generate the finished visual ads.',
      },
      {
        id: 'static_ad_book',
        label: 'Static ad book',
        description: 'Choose from proven static ad layouts.',
      },
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

  it('shows the canonical static-ad production choices as clickable numbered options', () => {
    const onSubmit = vi.fn()
    render(
      <ClarificationCard
        title="Choose a static ad direction"
        questions={staticAdProductionQuestions}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole('button', { name: /Validate messaging angles/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /Image brief/ })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /Static ad book/ })).toHaveTextContent('3')

    fireEvent.click(screen.getByRole('button', { name: /Static ad book/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onSubmit).toHaveBeenCalledWith({
      static_ad_production_mode: 'static_ad_book',
    })
  })
})
