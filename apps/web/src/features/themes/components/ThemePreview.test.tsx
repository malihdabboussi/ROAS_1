import { Profiler } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DESIGN_SETTINGS, type UserThemeColors } from '@/lib/themes'
import { ThemePreview } from './ThemePreview'

const COLORS: UserThemeColors = {
  primary: '#123456',
  primaryForeground: '#ffffff',
  secondaryAccent1: '#654321',
  secondaryAccent2: '#abcdef',
  heading: '#111111',
  body: '#333333',
  pageBackground: '#fefefe',
  cardBackground: '#fafafa',
  border: '#dedede',
  input: '#eeeeee',
}

function makeDesignSettings() {
  return {
    ...DEFAULT_DESIGN_SETTINGS,
    blocks: {
      ...DEFAULT_DESIGN_SETTINGS.blocks,
      borderRadius: 'xl' as const,
      shadow: 'lg' as const,
      borderWidth: 'thin' as const,
    },
    buttons: {
      shape: 'pill' as const,
      shadow: 'md' as const,
    },
  }
}

describe('ThemePreview', () => {
  it('renders the themed landing-page preview and generated scoped CSS', async () => {
    const { container } = render(
      <ThemePreview
        colors={COLORS}
        designSettings={makeDesignSettings()}
        fontHeading="Inter"
        fontBody="Roboto"
      />,
    )

    expect(screen.getByText('Theme Preview')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'THIS IS YOUR PAGE THEME' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'YOUR COLOR PALETTE' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'FORM ELEMENTS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'DESIGN SETTINGS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Theme' })).toBeInTheDocument()
    expect(screen.getByText('Extra Large')).toBeInTheDocument()
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.getByText('Pill')).toBeInTheDocument()

    const style = container.querySelector('style')
    expect(style?.textContent).toContain('--color-primary: #123456')
    expect(style?.textContent).toContain('--font-heading: "Inter", sans-serif;')

    const fontLink = container.querySelector('link[rel="stylesheet"]')
    expect(fontLink?.getAttribute('href')).toContain('family=Inter')
    expect(fontLink?.getAttribute('href')).toContain('family=Roboto')
  })

  it('settles after rerender without repeated render churn', async () => {
    let commits = 0

    const { rerender } = render(
      <Profiler id="theme-preview" onRender={() => (commits += 1)}>
        <ThemePreview colors={COLORS} designSettings={makeDesignSettings()} />
      </Profiler>,
    )

    rerender(
      <Profiler id="theme-preview" onRender={() => (commits += 1)}>
        <ThemePreview
          colors={{ ...COLORS, primary: '#224466' }}
          designSettings={makeDesignSettings()}
        />
      </Profiler>,
    )

    await waitFor(() => expect(commits).toBeLessThan(8))
  })
})
