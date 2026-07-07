import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsTabNavigation } from './settings-tab-navigation'

afterEach(cleanup)

describe('SettingsTabNavigation', () => {
  it('renders desktop nav items, conditional entries, and theme subtabs', () => {
    const onSectionChange = vi.fn()
    const onThemeTabChange = vi.fn()

    render(
      <SettingsTabNavigation
        mobileMode={false}
        activeSection="theme"
        onSectionChange={onSectionChange}
        themeTab="colors"
        onThemeTabChange={onThemeTabChange}
        presentationsCount={2}
        websitesCount={1}
        settingsLoading={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Agent' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Theme' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Funnel' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ads' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Presentation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Website' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Danger Zone' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Colors' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fonts' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Presentation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fonts' }))

    expect(onSectionChange).toHaveBeenCalledWith('presentation')
    expect(onThemeTabChange).toHaveBeenCalledWith('fonts')
  })

  it('omits presentation and website entries when there is no matching content', () => {
    render(
      <SettingsTabNavigation
        mobileMode={false}
        activeSection="agent"
        onSectionChange={vi.fn()}
        themeTab="colors"
        onThemeTabChange={vi.fn()}
        presentationsCount={1}
        websitesCount={0}
        settingsLoading={false}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Presentation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Website' })).toBeNull()
  })
})
