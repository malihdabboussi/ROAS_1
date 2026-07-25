import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SidebarHomeFlyout } from './SidebarHomeFlyout'

describe('SidebarHomeFlyout', () => {
  afterEach(cleanup)

  it('renders every Home destination and marks the nested route active', () => {
    render(<SidebarHomeFlyout pathname="/home/meetings" />)

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/home')
    expect(screen.getByRole('link', { name: 'Inbox' }).getAttribute('href')).toBe('/home/inbox')
    expect(screen.getByRole('link', { name: 'My Tasks' }).getAttribute('href')).toBe(
      '/home/my-tasks',
    )
    expect(
      screen
        .getByRole('link', { name: 'Meetings' })
        .classList.contains('nav-glass-selected-purple'),
    ).toBe(true)
    expect(
      screen.getByRole('link', { name: 'Home' }).classList.contains('nav-glass-selected-purple'),
    ).toBe(false)
  })
})
