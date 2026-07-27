import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UserNotification } from '@/lib/notifications'
import { InboxFeed } from './InboxFeed'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toggleRead: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

const taskNotification: UserNotification = {
  id: 'notification-1',
  user_id: 'user-1',
  org_id: 'org-1',
  type: 'space_task_mention',
  title: 'You were mentioned on "Launch checklist"',
  body: 'Please review the final copy.',
  mission_id: null,
  action_url: '/spaces?space=space-1&item=task-1',
  read_at: null,
  channel_sent: {},
  metadata: null,
  inbox_bucket: 'primary',
  snoozed_until: null,
  cleared_at: null,
  created_at: '2026-07-26T12:00:00.000Z',
}

vi.mock('@/lib/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications')>()
  return {
    ...actual,
    useInboxTriage: () => ({
      view: 'primary',
      type: 'all',
      notifications: [taskNotification],
      counts: { primary: 23, other: 376, later: 0, cleared: 0 },
      loading: false,
      setView: vi.fn(),
      setType: vi.fn(),
      clear: vi.fn(),
      restore: vi.fn(),
      snooze: vi.fn(),
      unsnooze: vi.fn(),
      move: vi.fn(),
      toggleRead: mocks.toggleRead,
      clearCurrentView: vi.fn(),
      markAllRead: vi.fn(),
    }),
  }
})

describe('InboxFeed', () => {
  afterEach(cleanup)

  it('renders as a full-page, searchable two-pane surface', () => {
    const { container } = render(<InboxFeed presentation="page" />)

    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /All types/i })).toBeInTheDocument()
    expect(container.querySelector('section')).not.toHaveClass('section-card')
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search this view' })).toBeInTheDocument()
    expect(screen.getByText('Select something to review')).toBeInTheDocument()
  })

  it('selects a task, marks it read, and exposes details separately from its source', () => {
    const onOpenDetails = vi.fn()
    const { container } = render(<InboxFeed presentation="page" onOpenDetails={onOpenDetails} />)

    fireEvent.click(screen.getByRole('button', { name: /Launch checklist/i }))

    expect(mocks.toggleRead).toHaveBeenCalledWith(taskNotification)
    expect(screen.getByRole('button', { name: /Open task details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View in Space/i })).toBeInTheDocument()
    expect(container.querySelector('article')).toHaveClass('overflow-hidden')
    expect(container.querySelector('.overflow-y-auto')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Open task details/i }))
    expect(onOpenDetails).toHaveBeenCalledWith(taskNotification)

    fireEvent.click(screen.getByRole('button', { name: /View in Space/i }))
    expect(mocks.push).toHaveBeenCalledWith('/spaces?space=space-1&item=task-1')
  })

  it('keeps the two-pane body height-constrained so panes scroll independently', () => {
    const { container } = render(<InboxFeed presentation="page" />)
    const panes = container.querySelector('.flex.min-h-0.flex-1.overflow-hidden')
    expect(panes).toBeTruthy()
  })
})
