import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InboxFeed } from './InboxFeed'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications')>()
  return {
    ...actual,
    useInboxTriage: () => ({
      view: 'primary',
      type: 'all',
      notifications: [],
      counts: { primary: 23, other: 376, later: 0, cleared: 0 },
      loading: false,
      setView: vi.fn(),
      setType: vi.fn(),
      clear: vi.fn(),
      restore: vi.fn(),
      snooze: vi.fn(),
      unsnooze: vi.fn(),
      move: vi.fn(),
      toggleRead: vi.fn(),
    }),
  }
})

describe('InboxFeed', () => {
  afterEach(cleanup)

  it('renders as a full-page surface with an explicit selected filter', () => {
    const { container } = render(<InboxFeed presentation="page" />)

    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /All types/i })).toBeInTheDocument()
    expect(container.querySelector('section')).not.toHaveClass('section-card')
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
  })
})
