import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ViewShareModal } from './ViewShareModal'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

const mocks = vi.hoisted(() => ({
  deleteSpaceViewShare: vi.fn(),
  fetchSpaceViewShares: vi.fn(),
  getActiveOrg: vi.fn(),
  toastError: vi.fn(),
  upsertSpaceViewShare: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

function SettingsDropdownMock({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
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
  )
}

vi.mock('@/features/studio/components/preview/SettingsDropdown', () => ({
  SettingsDropdown: SettingsDropdownMock,
}))

vi.mock('@/components/ui/forms/SettingsDropdown', () => ({
  SettingsDropdown: SettingsDropdownMock,
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: () => ({
    activeOrgId: 'org-1',
    getActiveOrg: mocks.getActiveOrg,
  }),
}))

vi.mock('@/lib/org/org-context-store', () => ({
  useOrgStore: () => ({
    activeOrgId: 'org-1',
    getActiveOrg: mocks.getActiveOrg,
  }),
}))

vi.mock('../services/spaces.service', () => ({
  deleteSpaceViewShare: mocks.deleteSpaceViewShare,
  fetchSpaceViewShares: mocks.fetchSpaceViewShares,
  upsertSpaceViewShare: mocks.upsertSpaceViewShare,
}))

vi.mock('./cells/AssigneeCell', () => ({
  RosterMemberAvatar: ({ entry }: { entry: TeamRosterEntry }) => (
    <span data-testid={`avatar-${entry.user_id}`} />
  ),
}))

function rosterEntry(overrides: Partial<TeamRosterEntry> = {}): TeamRosterEntry {
  return {
    participant_id: 'human:user-1',
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
  }
}

describe('ViewShareModal', () => {
  beforeEach(() => {
    mocks.fetchSpaceViewShares.mockResolvedValue({ effective_level: 'admin', shares: [] })
    mocks.upsertSpaceViewShare.mockImplementation(
      async (
        _spaceId: string,
        _viewId: string,
        input: { entity_type: 'user' | 'org'; entity_id: string; level: 'admin' | 'edit' | 'view' },
      ) => ({
        id: `${input.entity_type}:${input.entity_id}`,
        space_id: 'space-1',
        view_id: 'view-1',
        org_id: 'org-1',
        created_by: 'owner-1',
        created_at: '2026-06-21T00:00:00.000Z',
        ...input,
      }),
    )
    mocks.getActiveOrg.mockReturnValue({
      organizations: { name: 'Acme Workspace' },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads view shares and invites a roster member with the selected level', async () => {
    render(
      <ViewShareModal
        open
        onClose={vi.fn()}
        spaceId="space-1"
        viewId="view-1"
        viewName="Roadmap"
        roster={[rosterEntry()]}
      />,
    )

    await waitFor(() =>
      expect(mocks.fetchSpaceViewShares).toHaveBeenCalledWith('space-1', 'view-1'),
    )

    expect(screen.getByText('Share view')).toBeTruthy()
    expect(screen.getByText('Roadmap')).toBeTruthy()
    expect(screen.getByText(/Share this view with everyone in/).textContent).toContain(
      'Acme Workspace',
    )

    fireEvent.change(screen.getByPlaceholderText(/Type a teammate/), {
      target: { value: 'ada' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ada Lovelace Add/ }))

    await waitFor(() =>
      expect(mocks.upsertSpaceViewShare).toHaveBeenCalledWith('space-1', 'view-1', {
        entity_type: 'user',
        entity_id: 'user-1',
        level: 'view',
      }),
    )
  })
})
