import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CrystallizeBrainModal } from './CrystallizeBrainModal'

vi.mock('../services/brain.service', () => ({
  crystallizeCortexMax: vi.fn(),
}))

describe('CrystallizeBrainModal', () => {
  it('describes the confirmation and exposes a named close action', () => {
    const onOpenChange = vi.fn()

    render(
      <CrystallizeBrainModal
        open
        onOpenChange={onOpenChange}
        brainId="brain-1"
        brainLabel="Campaign Brain"
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Crystallize Brain' })).toHaveAccessibleDescription(
      /send Atlas a task to create Cortex Max documents/,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
