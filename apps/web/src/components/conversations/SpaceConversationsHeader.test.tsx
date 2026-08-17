import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceConversationsHeader } from './SpaceConversationsHeader'

afterEach(cleanup)

const headerProps = {
  query: '',
  onQueryChange: vi.fn(),
  onBack: vi.fn(),
  onNewConversation: vi.fn(),
  hideBackButton: true,
  hideHeaderBottomBorder: true,
  compactHeader: true,
  compactHeaderTitle: 'Recents',
  compactSearchOpen: false,
  onCompactSearchOpenChange: vi.fn(),
}

describe('SpaceConversationsHeader', () => {
  it('hides compact Recents actions until hover, then pins them while Filter is open', () => {
    const { rerender } = render(<SpaceConversationsHeader {...headerProps} />)

    const search = screen.getByRole('button', { name: 'Search conversations' })
    expect(search.parentElement).toHaveClass('opacity-0')

    rerender(<SpaceConversationsHeader {...headerProps} pinHeaderActions />)

    expect(screen.getByRole('button', { name: 'Search conversations' }).parentElement).toHaveClass(
      'opacity-100',
    )
    expect(
      screen.getByRole('button', { name: 'Search conversations' }).parentElement,
    ).not.toHaveClass('opacity-0')
  })
})
