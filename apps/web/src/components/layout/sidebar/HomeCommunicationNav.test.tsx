import { Profiler, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeCommunicationNav } from './HomeCommunicationNav'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createChannel: vi.fn(),
  updateChannel: vi.fn(),
  markRead: vi.fn(),
  stashPendingChannelAddPeople: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/components/channels', () => ({
  ChannelIcon: ({ channel }: { channel: { name?: string } | null | undefined }) => (
    <span data-testid={`channel-icon-${channel?.name ?? 'unknown'}`} />
  ),
  ChannelListActionsHost: ({ menuChannel }: { menuChannel: { name: string } | null }) =>
    menuChannel ? <div data-testid="channel-actions-host">{menuChannel.name}</div> : null,
  CreateChannelModal: ({
    open,
    onCreate,
  }: {
    open: boolean
    onCreate: (payload: { name: string; is_private: boolean }) => Promise<{ id: string }>
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => void onCreate({ name: 'new-channel', is_private: false })}
      >
        Create mocked channel
      </button>
    ) : null,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/channels', () => ({
  stashPendingChannelAddPeople: mocks.stashPendingChannelAddPeople,
  useChannelUnread: () => ({
    counts: { 'channel-a': 2, 'channel-b': 0 },
    markRead: mocks.markRead,
  }),
  useChannels: (enabled = true) => ({
    channels: enabled
      ? [
          {
            id: 'channel-b',
            org_id: 'org-1',
            user_id: 'user-1',
            name: 'beta',
            description: null,
            is_private: true,
            metadata: null,
            created_at: '2026-06-24T00:00:00.000Z',
            updated_at: '2026-06-24T00:00:00.000Z',
          },
          {
            id: 'channel-a',
            org_id: 'org-1',
            user_id: 'user-1',
            name: 'alpha',
            description: null,
            is_private: false,
            metadata: null,
            created_at: '2026-06-24T00:00:00.000Z',
            updated_at: '2026-06-24T00:00:00.000Z',
          },
        ]
      : [],
    loading: false,
    createChannel: mocks.createChannel,
    updateChannel: mocks.updateChannel,
  }),
}))

describe('HomeCommunicationNav', () => {
  beforeEach(() => {
    mocks.createChannel.mockResolvedValue({
      id: 'channel-new',
      org_id: 'org-1',
      user_id: 'user-1',
      name: 'new-channel',
      description: null,
      is_private: false,
      metadata: null,
      created_at: '2026-06-24T00:00:00.000Z',
      updated_at: '2026-06-24T00:00:00.000Z',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders sorted channels, marks active channel read, and settles without render churn', async () => {
    let commits = 0

    render(
      <Profiler id="home-communication-nav" onRender={() => (commits += 1)}>
        <HomeCommunicationNav pathname="/home/channels/channel-a" />
      </Profiler>,
    )

    expect(screen.getByRole('link', { name: /alpha/i }).getAttribute('href')).toBe(
      '/home/channels/channel-a',
    )
    expect(screen.getByRole('link', { name: /beta/i }).getAttribute('href')).toBe(
      '/home/channels/channel-b',
    )

    await waitFor(() => {
      expect(mocks.markRead).toHaveBeenCalledWith('channel-a')
    })

    fireEvent.click(screen.getByRole('button', { name: /mark all channels as read/i }))
    expect(mocks.markRead).toHaveBeenCalledWith('channel-a')
    expect(commits).toBeLessThan(8)
  })

  it('creates a channel through the modal and stashes pending add-people state', async () => {
    const onNavigate = vi.fn()

    render(<HomeCommunicationNav pathname="/home/channels" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: /new channel/i }))
    fireEvent.click(await screen.findByRole('button', { name: /create mocked channel/i }))

    await waitFor(() => {
      expect(mocks.createChannel).toHaveBeenCalledWith({
        name: 'new-channel',
        is_private: false,
      })
    })
    expect(mocks.stashPendingChannelAddPeople).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'channel-new' }),
    )
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/home/channels/channel-new')
  })
})
