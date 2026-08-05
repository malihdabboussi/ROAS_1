import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingActionItemsSection } from './MeetingActionItemsSection'

const mocks = vi.hoisted(() => ({
  createMeetingAction: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  createMeetingAction: mocks.createMeetingAction,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

describe('MeetingActionItemsSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('adds a manual action item from the header + control', async () => {
    mocks.createMeetingAction.mockResolvedValue({
      id: 'action-1',
      title: 'Send recap to Nate',
      source_type: 'manual',
      status: 'confirmed',
      canonical_assignee_name: null,
      canonical_assignee_email: null,
      evidence: {},
    })
    const onCreated = vi.fn()

    render(
      <MeetingActionItemsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        actions={[]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={onCreated}
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
        actions={[
          {
            id: 'action-1',
            title: 'Send recap to Nate',
            source_type: 'provider',
            status: 'confirmed',
            canonical_assignee_name: null,
            canonical_assignee_email: null,
            evidence: {},
          },
        ]}
        loading={false}
        onToggle={vi.fn()}
        onCreated={onCreated}
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
})
