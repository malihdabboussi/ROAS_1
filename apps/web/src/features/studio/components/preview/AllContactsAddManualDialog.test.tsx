import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AllContactsAddManualDialog } from './AllContactsAddManualDialog'

vi.mock('../../services/leads.service', () => ({
  createCrmContact: vi.fn(),
  importContactsToCampaign: vi.fn(),
}))

describe('AllContactsAddManualDialog', () => {
  it('names the dialog, close action, and every contact field', () => {
    const onClose = vi.fn()

    render(<AllContactsAddManualDialog open onClose={onClose} onCreated={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Add contact' })).toHaveAccessibleDescription(
      'Enter the contact details you want to save.',
    )
    expect(screen.getByLabelText('First name')).toBeTruthy()
    expect(screen.getByLabelText('Last name')).toBeTruthy()
    expect(screen.getByLabelText('Email')).toBeRequired()
    expect(screen.getByLabelText('Phone')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
