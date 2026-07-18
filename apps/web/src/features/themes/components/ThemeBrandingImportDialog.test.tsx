import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeBrandingImportDialog } from './ThemeBrandingImportDialog'

describe('ThemeBrandingImportDialog', () => {
  it('names and describes the dialog and website URL field', () => {
    const onClose = vi.fn()

    render(<ThemeBrandingImportDialog open onClose={onClose} onImport={vi.fn()} />)

    expect(
      screen.getByRole('dialog', { name: 'Pull Branding from a Website' }),
    ).toHaveAccessibleDescription(
      "Drop in any public website. I'll grab the colors, fonts, and design system.",
    )
    expect(screen.getByLabelText('Website URL')).toHaveAccessibleDescription(
      "Drop in any public website. I'll grab the colors, fonts, and design system.",
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
