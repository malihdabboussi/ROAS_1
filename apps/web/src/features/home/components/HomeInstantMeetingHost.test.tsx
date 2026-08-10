import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeInstantMeetingHost } from './HomeInstantMeetingHost'

const mocks = vi.hoisted(() => ({
  resolveMeetingsSpaceId: vi.fn(),
  createInstantMeeting: vi.fn(),
}))

vi.mock('@/features/home/lib/resolve-meetings-space-id', () => ({
  resolveMeetingsSpaceId: mocks.resolveMeetingsSpaceId,
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  createInstantMeeting: mocks.createInstantMeeting,
}))

vi.mock('@/features/home/components/MeetingWorkspaceDialog', () => ({
  MeetingWorkspaceDialog: ({
    spaceId,
    meetingItemId,
    fallbackTitle,
  }: {
    spaceId: string
    meetingItemId: string
    fallbackTitle: string
  }) => (
    <div role="dialog" aria-label={`${fallbackTitle} meeting workspace`}>
      {spaceId}:{meetingItemId}
    </div>
  ),
}))

describe('HomeInstantMeetingHost', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('creates an impromptu workspace with participant matching context', async () => {
    mocks.resolveMeetingsSpaceId.mockResolvedValue('meetings-space')
    mocks.createInstantMeeting.mockResolvedValue({
      space_id: 'meetings-space',
      meeting_item_id: 'instant-meeting',
      conversation_id: 'meeting-chat',
    })
    const onCreated = vi.fn()

    render(<HomeInstantMeetingHost open onOpenChange={vi.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText('Call name'), {
      target: { value: 'Client strategy call' },
    })
    fireEvent.change(screen.getByLabelText('Participant emails (optional)'), {
      target: { value: 'CLIENT@example.com, teammate@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start workspace' }))

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Client strategy call meeting workspace' }),
      ).toHaveTextContent('meetings-space:instant-meeting')
    })
    expect(mocks.createInstantMeeting).toHaveBeenCalledWith('meetings-space', {
      title: 'Client strategy call',
      attendeeEmails: ['client@example.com', 'teammate@example.com'],
    })
    expect(onCreated).toHaveBeenCalled()
  })
})
