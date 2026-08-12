import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import AppearancePageContent from './AppearancePageContent'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

describe('AppearancePageContent', () => {
  beforeEach(() => {
    useShellMenuDock.setState({ menuStyle: 'simple' })
  })

  it('offers Simple as the default and lets the user switch to Advanced', () => {
    render(<AppearancePageContent />)

    expect(screen.getByRole('button', { name: /Simple/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Advanced/ }))
    expect(useShellMenuDock.getState().menuStyle).toBe('advanced')
  })
})
