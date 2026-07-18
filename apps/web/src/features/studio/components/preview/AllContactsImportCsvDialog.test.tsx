import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AllContactsImportCsvDialog } from './AllContactsImportCsvDialog'

vi.mock('../../services/leads.service', () => ({
  importContactsToCampaign: vi.fn(),
  importCrmContactsBatch: vi.fn(),
}))

describe('AllContactsImportCsvDialog', () => {
  it('describes the CSV contract and exposes named controls', () => {
    const onClose = vi.fn()

    render(<AllContactsImportCsvDialog open onClose={onClose} onImported={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Import from CSV' })).toHaveAccessibleDescription(
      /Include an email column/,
    )
    expect(screen.getByLabelText('CSV file')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
