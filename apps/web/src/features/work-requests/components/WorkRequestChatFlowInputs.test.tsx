import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkRequestDateStep } from './WorkRequestChatFlowInputs'

afterEach(cleanup)

describe('WorkRequestDateStep', () => {
  it('lets you pick a due date from ClickUp-style presets', () => {
    const onContinue = vi.fn()
    render(
      <WorkRequestDateStep
        value=""
        busy={false}
        required={false}
        onContinue={onContinue}
        onSkip={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Tomorrow/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tomorrow/ }))
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onContinue.mock.calls[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
