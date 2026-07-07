import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AddPeopleToChannelModal } from './AddPeopleToChannelModal'

const mocks = vi.hoisted(() => ({
  addRosterEntriesToChannel: vi.fn(),
  onMembersAdded: vi.fn(),
  onOpenChange: vi.fn(),
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

const roster = [
  {
    participant_id: 'human:user-1',
    kind: 'human',
    org_id: 'org-1',
    user_id: 'user-1',
    agent_key: null,
    display_name: 'Current User',
    avatar_url: null,
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: 'me@example.test',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: null,
  },
  {
    participant_id: 'human:user-2',
    kind: 'human',
    org_id: 'org-1',
    user_id: 'user-2',
    agent_key: null,
    display_name: 'Existing Human',
    avatar_url: null,
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: 'existing@example.test',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: null,
  },
  {
    participant_id: 'human:user-3',
    kind: 'human',
    org_id: 'org-1',
    user_id: 'user-3',
    agent_key: null,
    display_name: 'Ada Lovelace',
    avatar_url: null,
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: 'ada@example.test',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: null,
  },
  {
    participant_id: 'agent:atlas',
    kind: 'agent',
    org_id: 'org-1',
    user_id: null,
    agent_key: 'atlas',
    display_name: 'Atlas',
    avatar_url: null,
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: null,
  },
] as const

vi.mock('@/lib/channels/add-channel-members', () => ({
  addRosterEntriesToChannel: mocks.addRosterEntriesToChannel,
}))

vi.mock('@/lib/channels/use-add-people-roster', () => ({
  useAddPeopleRoster: () => ({
    currentUserId: 'user-1',
    roster,
    rosterLoaded: true,
    workspaceName: 'Olympus',
  }),
}))

describe('AddPeopleToChannelModal', () => {
  beforeEach(() => {
    mocks.addRosterEntriesToChannel.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('adds selected human and agent members while excluding current and existing members', async () => {
    render(
      <AddPeopleToChannelModal
        open
        channel={channel}
        purpose="addMembers"
        existingMemberKeys={new Set(['human:user-2'])}
        onMembersAdded={mocks.onMembersAdded}
        onOpenChange={mocks.onOpenChange}
      />,
    )

    expect(await screen.findByText(/Search for people in Olympus/i)).not.toBeNull()
    const searchInput = screen.getByPlaceholderText(/search by name/i)

    fireEvent.change(searchInput, { target: { value: 'current' } })
    await waitFor(() => {
      expect(screen.getByText(/No results for/i)).not.toBeNull()
    })

    fireEvent.change(searchInput, { target: { value: 'existing' } })
    await waitFor(() => {
      expect(screen.getByText(/No results for/i)).not.toBeNull()
    })

    fireEvent.change(searchInput, { target: { value: 'ada' } })
    fireEvent.mouseDown(await screen.findByRole('button', { name: /ada lovelace/i }))

    fireEvent.change(searchInput, { target: { value: 'atlas' } })
    fireEvent.mouseDown(await screen.findByRole('button', { name: /atlas/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Add 2' }))

    await waitFor(() => {
      expect(mocks.addRosterEntriesToChannel).toHaveBeenCalledWith('channel-a', [
        expect.objectContaining({ kind: 'human', user_id: 'user-3' }),
        expect.objectContaining({ kind: 'agent', agent_key: 'atlas' }),
      ])
    })
    expect(mocks.onMembersAdded).toHaveBeenCalledTimes(1)
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows the skip confirmation before closing a post-create modal', async () => {
    render(
      <AddPeopleToChannelModal
        open
        channel={channel}
        purpose="afterCreate"
        onMembersAdded={mocks.onMembersAdded}
        onOpenChange={mocks.onOpenChange}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /skip adding people/i }))
    expect(screen.getByText(/Skip adding people/i)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /go back/i }))
    expect(mocks.onOpenChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /skip adding people/i }))
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false)
  })
})
