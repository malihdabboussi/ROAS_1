import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AvatarDropdown } from './AvatarDropdown'

describe('AvatarDropdown', () => {
  afterEach(cleanup)

  it('renders a full-width labeled account row in an expanded sidebar', () => {
    render(
      <AvatarDropdown
        displayName="Dylan Vanas"
        email="dylan@example.com"
        avatarUrl={null}
        initials="DV"
        sidebarCollapsed={false}
      />,
    )

    const trigger = screen.getByRole('button')
    expect(trigger).toHaveClass('w-full', 'text-left')
    expect(screen.getByText('Dylan Vanas')).toBeInTheDocument()
    expect(screen.getByText('dylan@example.com')).toBeInTheDocument()
  })

  it('keeps the compact sidebar trigger icon-only', () => {
    render(
      <AvatarDropdown
        displayName="Dylan Vanas"
        email="dylan@example.com"
        avatarUrl={null}
        initials="DV"
        sidebarCollapsed
      />,
    )

    expect(screen.getByText('DV')).toBeInTheDocument()
    expect(screen.queryByText('Dylan Vanas')).not.toBeInTheDocument()
  })
})
