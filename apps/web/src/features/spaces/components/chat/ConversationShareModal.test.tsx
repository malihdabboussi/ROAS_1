import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationShareLevel } from '@/lib/conversations/conversation.types'
import { ConversationShareModal } from './ConversationShareModal'

const mocks = vi.hoisted(() => ({
  deleteConversationShare: vi.fn(),
  fetchConversationShares: vi.fn(),
  passOffConversationShare: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  upsertConversationShare: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/features/studio/components/preview/SettingsDropdown', () => ({
  SettingsDropdown: ({
    value,
    options,
    onChange,
    disabled,
  }: {
    value: string
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void
    disabled?: boolean
  }) => (
    <select
      aria-label="Permission"
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@/components/ui/forms/SettingsDropdown', () => ({
  SettingsDropdown: ({
    value,
    options,
    onChange,
    disabled,
  }: {
    value: string
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void
    disabled?: boolean
  }) => (
    <select
      aria-label="Permission"
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@/features/studio/services/chat.service', () => ({
  deleteConversationShare: mocks.deleteConversationShare,
  fetchConversationShares: mocks.fetchConversationShares,
  upsertConversationShare: mocks.upsertConversationShare,
}))

vi.mock('@/lib/conversations/conversations-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/conversations/conversations-api')>()
  return {
    ...actual,
    deleteConversationShare: mocks.deleteConversationShare,
    fetchConversationShares: mocks.fetchConversationShares,
    passOffConversationShare: mocks.passOffConversationShare,
    upsertConversationShare: mocks.upsertConversationShare,
  }
})

function conversation() {
  return {
    id: 'conversation-1',
    user_id: 'owner-1',
    campaign_id: null,
    title: 'Launch plan',
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
  } as const
}

function rosterEntry(overrides: Record<string, unknown> = {}) {
  return {
    participant_id: 'participant-1',
    kind: 'human',
    org_id: 'org-1',
    user_id: 'user-1',
    agent_key: null,
    display_name: 'Ada Lovelace',
    avatar_url: null,
    role_label: 'Engineer',
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: 'member',
    email: 'ada@example.com',
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: null,
    ...overrides,
  } as never
}

function share(overrides: {
  id: string
  entity_type: 'user' | 'org'
  entity_id: string
  level: ConversationShareLevel
}) {
  return {
    conversation_id: 'conversation-1',
    org_id: 'org-1',
    created_by: 'owner-1',
    created_at: '2026-06-21T00:00:00.000Z',
    ...overrides,
  }
}

function renderModal(overrides: { onSharesChanged?: () => void } = {}) {
  const onClose = vi.fn()
  const onSharesChanged = overrides.onSharesChanged ?? vi.fn()

  render(
    <ConversationShareModal
      activeOrgId="org-1"
      open
      conversation={conversation()}
      orgName="Acme Workspace"
      roster={[rosterEntry()]}
      onClose={onClose}
      onSharesChanged={onSharesChanged}
    />,
  )

  return { onClose, onSharesChanged }
}

describe('ConversationShareModal', () => {
  beforeEach(() => {
    mocks.deleteConversationShare.mockResolvedValue({ deleted: true })
    mocks.fetchConversationShares.mockResolvedValue({ effective_level: 'admin', shares: [] })
    mocks.passOffConversationShare.mockImplementation(
      async (_conversationId: string, input: { user_id: string; level?: ConversationShareLevel }) =>
        share({
          id: `user:${input.user_id}`,
          entity_type: 'user',
          entity_id: input.user_id,
          level: input.level ?? 'view',
        }),
    )
    mocks.upsertConversationShare.mockImplementation(
      async (
        _conversationId: string,
        input: { entity_type: 'user' | 'org'; entity_id: string; level: ConversationShareLevel },
      ) =>
        share({
          id: `${input.entity_type}:${input.entity_id}`,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          level: input.level,
        }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads existing conversation shares for the selected conversation', async () => {
    mocks.fetchConversationShares.mockResolvedValue({
      effective_level: 'admin',
      shares: [share({ id: 'share-org-1', entity_type: 'org', entity_id: 'org-1', level: 'edit' })],
    })

    renderModal()

    await waitFor(() =>
      expect(mocks.fetchConversationShares).toHaveBeenCalledWith('conversation-1'),
    )

    expect(screen.getByText('Share conversation')).toBeTruthy()
    expect(screen.getByText('Launch plan')).toBeTruthy()
    expect(screen.getByText('Acme Workspace')).toBeTruthy()
    expect(screen.getByText('edit')).toBeTruthy()
  })

  it('announces itself as a dismissible dialog', () => {
    const { onClose } = renderModal()

    expect(screen.getByRole('dialog', { name: 'Share conversation' })).toHaveAccessibleDescription(
      'Launch plan',
    )
    expect(screen.getByRole('textbox', { name: 'Invite by name or email' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Close share conversation' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('passes off to a roster member with a handoff notification by default', async () => {
    const { onSharesChanged } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('Invite by name or email'), {
      target: { value: 'ada' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() =>
      expect(mocks.passOffConversationShare).toHaveBeenCalledWith('conversation-1', {
        user_id: 'user-1',
        level: 'view',
        note: undefined,
        notify: true,
      }),
    )
    expect(mocks.upsertConversationShare).not.toHaveBeenCalled()
    expect(onSharesChanged).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Passed off — teammate notified.')
  })

  it('invites a roster member without notifying when the handoff toggle is off', async () => {
    const { onSharesChanged } = renderModal()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Notify teammate with handoff link' }))
    fireEvent.change(screen.getByPlaceholderText('Invite by name or email'), {
      target: { value: 'ada' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() =>
      expect(mocks.upsertConversationShare).toHaveBeenCalledWith('conversation-1', {
        entity_type: 'user',
        entity_id: 'user-1',
        level: 'view',
        notify: undefined,
        note: undefined,
      }),
    )
    expect(mocks.passOffConversationShare).not.toHaveBeenCalled()
    expect(onSharesChanged).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Share updated.')
  })

  it('removes an existing org share from the org switch', async () => {
    mocks.fetchConversationShares.mockResolvedValue({
      effective_level: 'admin',
      shares: [share({ id: 'share-org-1', entity_type: 'org', entity_id: 'org-1', level: 'edit' })],
    })
    const { onSharesChanged } = renderModal()

    const orgSwitch = await screen.findByRole('switch')
    fireEvent.click(orgSwitch)

    await waitFor(() =>
      expect(mocks.deleteConversationShare).toHaveBeenCalledWith('conversation-1', 'share-org-1'),
    )
    expect(onSharesChanged).toHaveBeenCalledTimes(1)
  })
})
