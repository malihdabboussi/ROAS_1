import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChannelListActionsHost } from './ChannelListActionsHost'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  writeText: vi.fn(),
  updateChannel: vi.fn(),
  deleteChannel: vi.fn(),
  toggleChannelFavorite: vi.fn(),
  reloadMembers: vi.fn(),
  onCloseMenu: vi.fn(),
  onDeleted: vi.fn(),
  onMarkAsRead: vi.fn(),
  onRename: vi.fn(),
  addRosterEntriesToChannel: vi.fn(),
  triggerSpaceChannelBrainstormCreate: vi.fn(),
  startBrainstorm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const channel = {
  id: 'channel-a',
  org_id: 'org-1',
  user_id: 'user-1',
  name: 'alpha',
  description: null,
  is_private: false,
  metadata: null,
  created_at: '2026-06-24T00:00:00.000Z',
  updated_at: '2026-06-24T00:00:00.000Z',
  can_manage: true,
  is_favorite: false,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/lib/channels', () => ({
  addRosterEntriesToChannel: mocks.addRosterEntriesToChannel,
  getChannelIconColorId: () => 'default',
  getChannelIconName: () => 'hash',
  channelsService: {
    startBrainstorm: mocks.startBrainstorm,
  },
  triggerSpaceChannelBrainstormCreate: mocks.triggerSpaceChannelBrainstormCreate,
  useCanManageChannel: () => true,
  useAddPeopleRoster: () => ({
    currentUserId: 'user-1',
    roster: [],
    rosterLoaded: true,
    workspaceName: 'Olympus',
  }),
  useChannelMembers: () => ({
    members: [
      { id: 'member-human', member_type: 'user', user_id: 'user-2' },
      { id: 'member-agent', member_type: 'agent', agent_key: 'atlas' },
    ],
    reload: mocks.reloadMembers,
  }),
  useChannels: () => ({
    channels: [channel],
    updateChannel: mocks.updateChannel,
    deleteChannel: mocks.deleteChannel,
    toggleChannelFavorite: mocks.toggleChannelFavorite,
  }),
}))

vi.mock('@/components/channels/ChannelActionsMenu', () => ({
  ChannelActionsMenu: ({
    open,
    onAddMembers,
    onCopyLink,
    onDelete,
    onMarkAsRead,
    onOpenSettings,
    onRename,
    onStartBrainstorm,
    onToggleFavorite,
  }: {
    open: boolean
    onAddMembers: () => void
    onCopyLink: () => void
    onDelete: () => void
    onMarkAsRead: () => void
    onOpenSettings: () => void
    onRename: () => void
    onStartBrainstorm: () => void
    onToggleFavorite: () => void
  }) =>
    open ? (
      <div role="menu">
        <button type="button" onClick={onCopyLink}>
          Copy link
        </button>
        <button type="button" onClick={onMarkAsRead}>
          Mark read
        </button>
        <button type="button" onClick={onToggleFavorite}>
          Toggle favorite
        </button>
        <button type="button" onClick={onRename}>
          Rename
        </button>
        <button type="button" onClick={onAddMembers}>
          Add members
        </button>
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
        <button type="button" onClick={onStartBrainstorm}>
          Start brainstorm
        </button>
        <button type="button" onClick={onDelete}>
          Delete channel
        </button>
      </div>
    ) : null,
}))

vi.mock('@/components/channels/AddPeopleToChannelModal', () => ({
  channelMembersToRosterKeys: (
    members: Array<{ member_type: string; user_id?: string; agent_key?: string }>,
  ) => {
    const keys = new Set<string>()
    for (const member of members) {
      if (member.member_type === 'user' && member.user_id) keys.add(`human:${member.user_id}`)
      if (member.member_type === 'agent' && member.agent_key) keys.add(`agent:${member.agent_key}`)
    }
    return keys
  },
  AddPeopleToChannelModal: ({
    open,
    existingMemberKeys,
  }: {
    open: boolean
    existingMemberKeys: Set<string>
  }) =>
    open ? (
      <div data-testid="add-people-modal">
        {Array.from(existingMemberKeys).sort().join(',')}
      </div>
    ) : null,
}))

vi.mock('@/components/channels/ChannelSettingsModal', () => ({
  ChannelSettingsModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="settings-modal" /> : null,
}))

vi.mock('@/components/channels/StartBrainstormModal', () => ({
  StartBrainstormModal: ({
    open,
    onStart,
  }: {
    open: boolean
    onStart: (agentKeys: string[]) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onStart(['atlas', 'nova'])}>
        Run brainstorm
      </button>
    ) : null,
}))

describe('ChannelListActionsHost', () => {
  beforeEach(() => {
    mocks.writeText.mockResolvedValue(undefined)
    mocks.deleteChannel.mockResolvedValue(undefined)
    mocks.updateChannel.mockResolvedValue({ channel })
    mocks.toggleChannelFavorite.mockResolvedValue(undefined)
    mocks.startBrainstorm.mockResolvedValue({ message: { id: 'thread-1' } })
    Object.assign(navigator, {
      clipboard: { writeText: mocks.writeText },
    })
    window.history.replaceState({}, '', '/home/channels/channel-a')
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/')
  })

  function renderHost(extraProps: Partial<React.ComponentProps<typeof ChannelListActionsHost>> = {}) {
    return render(
      <ChannelListActionsHost
        menuChannel={channel}
        menuAnchor={{ top: 20, left: 30 }}
        onCloseMenu={mocks.onCloseMenu}
        onDeleted={mocks.onDeleted}
        onMarkAsRead={mocks.onMarkAsRead}
        onRename={mocks.onRename}
        {...extraProps}
      />,
    )
  }

  it('wires menu actions to channel side effects without render churn', async () => {
    renderHost()

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))
    await waitFor(() => {
      expect(mocks.writeText).toHaveBeenCalledWith('http://localhost:3000/home/channels/channel-a')
    })

    fireEvent.click(screen.getByRole('button', { name: /mark read/i }))
    expect(mocks.onMarkAsRead).toHaveBeenCalledWith('channel-a')

    fireEvent.click(screen.getByRole('button', { name: /toggle favorite/i }))
    expect(mocks.toggleChannelFavorite).toHaveBeenCalledWith('channel-a')

    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    expect(mocks.onRename).toHaveBeenCalledWith(expect.objectContaining({ id: 'channel-a' }))
  })

  it('opens member/settings modals and deletes the active channel through the existing flow', async () => {
    renderHost()

    fireEvent.click(screen.getByRole('button', { name: /add members/i }))
    expect(screen.getByTestId('add-people-modal').textContent).toBe('agent:atlas,human:user-2')

    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByTestId('settings-modal')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /delete channel/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mocks.deleteChannel).toHaveBeenCalledWith('channel-a')
    })
    expect(mocks.onDeleted).toHaveBeenCalledWith('channel-a')
    expect(mocks.push).toHaveBeenCalledWith('/home/channels')
  })

  it('uses the mounted space brainstorm handler before opening the fallback modal', async () => {
    renderHost({ spaceActiveChannelId: 'channel-a' })
    fireEvent.click(screen.getByRole('button', { name: /start brainstorm/i }))
    expect(mocks.triggerSpaceChannelBrainstormCreate).toHaveBeenCalledWith('channel-a')

    cleanup()
    renderHost({ spaceActiveChannelId: 'other-channel', spaceId: 'space-1' })
    fireEvent.click(screen.getByRole('button', { name: /start brainstorm/i }))
    fireEvent.click(screen.getByRole('button', { name: /run brainstorm/i }))

    await waitFor(() => {
      expect(mocks.startBrainstorm).toHaveBeenCalledWith('channel-a', {
        agent_keys: ['atlas', 'nova'],
        space_id: 'space-1',
      })
    })
    expect(mocks.push).toHaveBeenCalledWith('/home/channels/channel-a?thread=thread-1')
  })
})
