import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MeetingAction } from '@/features/home/services/meeting-workspace-api'
import { MeetingActionItemsSection } from './MeetingActionItemsSection'

const mocks = vi.hoisted(() => ({
  createMeetingAction: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  transferItemToSpace: vi.fn(),
  useSpaceMappingGroups: vi.fn(),
  useSpaceMappingIndex: vi.fn(),
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  createMeetingAction: mocks.createMeetingAction,
}))

vi.mock('@/lib/work-items', () => ({
  transferItemToSpace: mocks.transferItemToSpace,
  useSpaceMappingGroups: mocks.useSpaceMappingGroups,
  useSpaceMappingIndex: mocks.useSpaceMappingIndex,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

function action(overrides: Partial<MeetingAction>): MeetingAction {
  return {
    id: 'action-1',
    title: 'Send recap to Nate',
    source_type: 'manual',
    status: 'confirmed',
    canonical_assignee_name: null,
    canonical_assignee_email: null,
    evidence: {},
    ...overrides,
  }
}

describe('MeetingActionItemsSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('adds a manual action item from the header + control', async () => {
    mocks.createMeetingAction.mockResolvedValue(action({}))
    const onCreated = vi.fn()

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={onCreated}
        onMoved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add action item' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New action item' }), {
      target: { value: 'Send recap to Nate' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(mocks.createMeetingAction).toHaveBeenCalledWith('space-1', 'meeting-1', {
        title: 'Send recap to Nate',
      })
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'action-1', title: 'Send recap to Nate' }),
      )
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })
  })

  it('skips creating when the same action text is already listed', async () => {
    const onCreated = vi.fn()
    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[action({ source_type: 'provider' })]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={onCreated}
        onMoved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add action item' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New action item' }), {
      target: { value: 'send recap to nate' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(mocks.createMeetingAction).not.toHaveBeenCalled()
      expect(onCreated).not.toHaveBeenCalled()
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })
  })

  it('shows the current mapping inline and relocates a follow-up action through the cell', async () => {
    mocks.useSpaceMappingIndex.mockReturnValue(
      new Map([['space-1', { spaceTitle: 'Meetings', pathLabel: 'ROAS · General · Meetings' }]]),
    )
    mocks.useSpaceMappingGroups.mockReturnValue([
      {
        campaignId: 'campaign-1',
        label: 'Acme Co · Launch',
        spaces: [{ id: 'space-2', title: 'Ad Production', visibility: 'team' }],
      },
    ])
    mocks.transferItemToSpace.mockResolvedValue({})
    const onMoved = vi.fn()
    const movable = action({ evidence: { origin: 'meetings_space_follow_up' } })

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[movable]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={vi.fn()}
        onMoved={onMoved}
      />,
    )

    const cell = screen.getByRole('button', {
      name: 'Change mapping for Send recap to Nate — currently in Meetings',
    })
    expect(cell.textContent).toContain('Meetings')
    fireEvent.click(cell)
    fireEvent.click(await screen.findByRole('button', { name: /Ad Production/ }))

    await waitFor(() => {
      expect(mocks.transferItemToSpace).toHaveBeenCalledWith('space-1', 'action-1', 'space-2')
      expect(onMoved).toHaveBeenCalledWith(expect.objectContaining({ id: 'action-1' }))
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Moved to Ad Production.')
    })
  })

  it('falls back to a generic mapping label while the index is loading', () => {
    mocks.useSpaceMappingIndex.mockReturnValue(null)
    const movable = action({ evidence: { origin: 'meetings_space_follow_up' } })

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[movable]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={vi.fn()}
        onMoved={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Change mapping for Send recap to Nate — currently in this space',
      }),
    ).toBeTruthy()
  })

  it('hides the mapping cell for actions that are not relocatable space items', () => {
    mocks.useSpaceMappingIndex.mockReturnValue(
      new Map([['space-1', { spaceTitle: 'Meetings', pathLabel: 'ROAS · General · Meetings' }]]),
    )
    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[action({ evidence: {} })]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={vi.fn()}
        onMoved={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /Change mapping for Send recap to Nate/ }),
    ).toBeNull()
  })

  it('explains provider-reported completion instead of showing an unexplained check', () => {
    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[
          action({
            status: 'resolved',
            source_type: 'provider',
            evidence: { provider_evidence: { completed_in_provider: true } },
          }),
        ]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={vi.fn()}
        onMoved={vi.fn()}
      />,
    )

    expect(screen.getByText('Marked complete in Fathom')).toBeInTheDocument()
  })
})
