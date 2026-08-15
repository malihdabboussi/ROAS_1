import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreateTypePickerCard } from './CreateTypePickerCard'
import { CREATE_TYPE_PICKERS } from './shell-create-type-pickers'

describe('CreateTypePickerCard', () => {
  it('renders funnel type cards and reports the selected type', () => {
    const onSelect = vi.fn()
    render(
      <CreateTypePickerCard
        catalog={CREATE_TYPE_PICKERS.funnel}
        onSelect={onSelect}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('What kind of funnel would you like?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Lead magnet/i }))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-magnet', prompt: 'Create a lead magnet funnel for ' }),
    )
  })
})
