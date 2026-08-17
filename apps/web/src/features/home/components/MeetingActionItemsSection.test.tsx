import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MeetingAction } from '@/features/home/services/meeting-workspace-api'
import type { TaskRollupItem } from '@/lib/tasks'
import { MeetingActionItemsSection } from './MeetingActionItemsSection'

const mocks = vi.hoisted(() => ({
  createMeetingAction: vi.fn(),
  updateMeetingActionStatus: vi.fn(),
  updateSpaceItem: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  useSpaceMappingIndex: vi.fn(),
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  createMeetingAction: mocks.createMeetingAction,
  updateMeetingActionStatus: mocks.updateMeetingActionStatus,
}))

vi.mock('@/lib/spaces', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/spaces')>()
  return {
    ...actual,
    updateSpaceItem: mocks.updateSpaceItem,
  }
})

vi.mock('@/lib/work-items', () => ({
  useSpaceMappingIndex: mocks.useSpaceMappingIndex,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/components/work-views/AllTasksNativeList', () => ({
  AllTasksNativeList: ({
    items,
    onAddItem,
    persistItem,
    onOpenItem,
  }: {
    items: TaskRollupItem[]
    onAddItem?: (title: string) => Promise<void>
    persistItem?: (item: TaskRollupItem, payload: { status?: string }) => Promise<void>
    onOpenItem?: (item: TaskRollupItem) => void
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <button type="button" onClick={() => onOpenItem?.(item)}>
            Open {item.title}
          </button>
          <span>{item.priority ?? 'No priority'}</span>
          <span>{item.space_title || 'No space'}</span>
          <span>{item.campaign_name ?? 'No campaign'}</span>
          <button type="button" onClick={() => void persistItem?.(item, { status: 'logged' })}>
            Reopen {item.title}
          </button>
        </div>
      ))}
      <button type="button" onClick={() => void onAddItem?.('Send recap to Nate')}>
        Add task
      </button>
    </div>
  ),
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

  it('adds a manual action item from the All Tasks add row', async () => {
    mocks.createMeetingAction.mockResolvedValue(action({}))
    mocks.useSpaceMappingIndex.mockReturnValue(null)
    const onCreated = vi.fn()

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[]}
        loading={false}
        onCreated={onCreated}
        onReload={async () => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

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
    mocks.useSpaceMappingIndex.mockReturnValue(null)
    const onCreated = vi.fn()
    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[action({ source_type: 'provider' })]}
        loading={false}
        onCreated={onCreated}
        onReload={async () => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(() => {
      expect(mocks.createMeetingAction).not.toHaveBeenCalled()
      expect(onCreated).not.toHaveBeenCalled()
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })
  })

  it('fills Client Workspace and Campaign Space from the mapping path', () => {
    mocks.useSpaceMappingIndex.mockReturnValue(
      new Map([['space-1', { spaceTitle: 'Meetings', pathLabel: 'ROAS · General · Meetings' }]]),
    )

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[action({ priority: 'high' })]}
        loading={false}
        onCreated={vi.fn()}
        onReload={async () => undefined}
      />,
    )

    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('Meetings')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('opens the canonical task card from the All Tasks row', () => {
    mocks.useSpaceMappingIndex.mockReturnValue(null)
    const dispatch = vi.spyOn(window, 'dispatchEvent')

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[action({})]}
        loading={false}
        onCreated={vi.fn()}
        onReload={async () => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Send recap to Nate' }))
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'vibey-open-artifact',
      }),
    )
    dispatch.mockRestore()
  })

  it('reopens a legacy meeting action through the meeting status API', async () => {
    mocks.useSpaceMappingIndex.mockReturnValue(null)
    mocks.updateMeetingActionStatus.mockResolvedValue(action({ status: 'confirmed' }))

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[action({ status: 'resolved' })]}
        loading={false}
        onCreated={vi.fn()}
        onReload={async () => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reopen Send recap to Nate' }))

    await waitFor(() => {
      expect(mocks.updateMeetingActionStatus).toHaveBeenCalledWith(
        'space-1',
        'meeting-1',
        'action-1',
        'confirmed',
      )
    })
  })
})
