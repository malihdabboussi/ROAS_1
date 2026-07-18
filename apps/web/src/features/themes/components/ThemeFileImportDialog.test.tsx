import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeFileImportDialog } from './ThemeFileImportDialog'

describe('ThemeFileImportDialog', () => {
  it('exposes a described dialog and keyboard-operable file picker', () => {
    const onClose = vi.fn()

    render(<ThemeFileImportDialog open onClose={onClose} onImport={vi.fn()} />)

    expect(
      screen.getByRole('dialog', { name: 'Extract Theme from File' }),
    ).toHaveAccessibleDescription('Upload a PDF, image, or document to extract its branding.')
    expect(screen.getByLabelText('Branding file')).toBeTruthy()

    const picker = screen.getByRole('button', { name: 'Choose branding file' })
    const click = vi.spyOn(HTMLInputElement.prototype, 'click')
    fireEvent.keyDown(picker, { key: 'Enter' })
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
