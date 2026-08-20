import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMission } from '@/lib/missions'
import { QuickMissionsHubModal } from './QuickMissionsHubModal'

vi.mock('./QuickMissionCampaignSpaceSelect', () => ({
  QuickMissionCampaignSpaceSelect: () => <div>Searchable campaign and space picker</div>,
}))

vi.mock('@/lib/missions', () => ({
  createMission: vi.fn(),
  resolveMissionCreateToastMessage: vi.fn(() => 'Could not start mission'),
}))

describe('QuickMissionsHubModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('prefills but requires confirmation of the contextual client before mission context', async () => {
    vi.mocked(createMission).mockResolvedValue({ id: 'mission-1' } as never)
    const onStarted = vi.fn()

    render(
      <QuickMissionsHubModal
        open
        clients={[
          { spaceId: 'space-1', campaignId: 'campaign-1', title: 'Current Course' },
          { spaceId: 'space-2', campaignId: 'campaign-2', title: 'Another Course' },
        ]}
        initialPlaybookKey="static-ad-production"
        initialClientSpaceId="space-1"
        parentMissionId="mission-parent"
        sourceConversationId="conversation-1"
        onClose={vi.fn()}
        onStarted={onStarted}
      />,
    )

    expect(screen.getByText('Choose the client campaign.')).toBeInTheDocument()
    expect(screen.getByText('Searchable campaign and space picker')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('button', { name: /Static ad book/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Write for me' })).toHaveClass('button-glass-primary')

    fireEvent.click(screen.getByRole('button', { name: /Static ad book/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Myth vs. system/i }))
    fireEvent.change(screen.getByLabelText('Offer and audience context'), {
      target: { value: 'A course for agency owners.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run mission' }))

    await waitFor(() =>
      expect(createMission).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Static Ad Production — Current Course',
          campaign_id: 'campaign-1',
          space_id: 'space-1',
          parent_mission_id: 'mission-parent',
          input: {
            playbook_id: 'static-ad-production',
            source_conversation_id: 'conversation-1',
            source_surface: 'chat_quick_mission',
            playbook_kickoff: expect.objectContaining({
              production_mode: 'static_ad_book',
              copy_mode: 'write_for_me',
              offer_context: 'A course for agency owners.',
            }),
          },
        }),
      ),
    )
    expect(onStarted).toHaveBeenCalledWith(
      'mission-1',
      'Static Ad Production — Current Course',
      'space-1',
      'conversation-1',
    )
  })

  it('dismisses the launcher while mission creation continues in the background', async () => {
    let resolveMission: ((mission: { id: string }) => void) | undefined
    vi.mocked(createMission).mockReturnValue(
      new Promise((resolve) => {
        resolveMission = resolve
      }) as never,
    )
    const onClose = vi.fn()
    const onStarted = vi.fn()

    render(
      <QuickMissionsHubModal
        open
        clients={[{ spaceId: 'space-1', campaignId: 'campaign-1', title: 'Current Course' }]}
        initialPlaybookKey="webinar-fulfillment"
        initialClientSpaceId="space-1"
        sourceConversationId="conversation-1"
        onClose={onClose}
        onStarted={onStarted}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run mission' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onStarted).not.toHaveBeenCalled()

    resolveMission?.({ id: 'mission-background' })
    await waitFor(() =>
      expect(onStarted).toHaveBeenCalledWith(
        'mission-background',
        'Webinar Fulfillment — Current Course',
        'space-1',
        'conversation-1',
      ),
    )
  })

  it('creates a chat source before launching a mission from the blank chat', async () => {
    vi.mocked(createMission).mockResolvedValue({ id: 'mission-new-chat' } as never)
    const onResolveSourceConversation = vi.fn(async () => 'conversation-new-chat')
    const onStarted = vi.fn()

    render(
      <QuickMissionsHubModal
        open
        clients={[{ spaceId: 'space-1', campaignId: 'campaign-1', title: 'Current Course' }]}
        initialPlaybookKey="webinar-fulfillment"
        initialClientSpaceId="space-1"
        onClose={vi.fn()}
        onResolveSourceConversation={onResolveSourceConversation}
        onStarted={onStarted}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run mission' }))

    await waitFor(() =>
      expect(onResolveSourceConversation).toHaveBeenCalledWith({
        missionTitle: 'Webinar Fulfillment — Current Course',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
      }),
    )
    expect(createMission).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          source_conversation_id: 'conversation-new-chat',
          source_surface: 'chat_quick_mission',
        }),
      }),
    )
    expect(onStarted).toHaveBeenCalledWith(
      'mission-new-chat',
      'Webinar Fulfillment — Current Course',
      'space-1',
      'conversation-new-chat',
    )
  })

  it('shows a searchable campaign and space picker when the chat is unscoped', () => {
    render(
      <QuickMissionsHubModal
        open
        clients={[{ spaceId: 'space-1', campaignId: 'campaign-1', title: 'Current Course' }]}
        initialPlaybookKey="static-ad-production"
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Choose the client campaign.')).toBeInTheDocument()
    expect(screen.getByText('Searchable campaign and space picker')).toBeInTheDocument()
  })

  it('defaults video production to skill-written copy and preserves its chat source', async () => {
    vi.mocked(createMission).mockResolvedValue({ id: 'mission-video' } as never)

    render(
      <QuickMissionsHubModal
        open
        clients={[{ spaceId: 'space-1', campaignId: 'campaign-1', title: 'Current Course' }]}
        initialPlaybookKey="ig-organic-video"
        initialClientSpaceId="space-1"
        sourceConversationId="conversation-1"
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Write for me' })).toHaveClass('button-glass-primary')
    fireEvent.change(screen.getByLabelText('Offer and audience context'), {
      target: { value: 'A course for agency owners.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run mission' }))

    await waitFor(() =>
      expect(createMission).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: 'campaign-1',
          space_id: 'space-1',
          input: {
            playbook_id: 'ig-organic-video-ad',
            source_conversation_id: 'conversation-1',
            source_surface: 'chat_quick_mission',
            playbook_kickoff: expect.objectContaining({
              copy_mode: 'write_for_me',
              offer_context: 'A course for agency owners.',
              selected_scene_ids: ['golden-hour-infinity-pool', 'hillside-pool-terrace'],
            }),
          },
        }),
      ),
    )
  })

  it('starts task cleanup with the selected call window', async () => {
    vi.mocked(createMission).mockResolvedValue({ id: 'mission-cleanup' } as never)

    render(
      <QuickMissionsHubModal
        open
        clients={[{ spaceId: 'space-1', campaignId: 'campaign-1', title: 'Personal Ops' }]}
        initialPlaybookKey="task-cleanup"
        initialClientSpaceId="space-1"
        sourceConversationId="conversation-1"
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'This week' })).toHaveClass('button-glass-primary')
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))
    fireEvent.change(screen.getByLabelText('Client filter (optional)'), {
      target: { value: 'Yasir' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run mission' }))

    await waitFor(() =>
      expect(createMission).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task Cleanup — Personal Ops',
          campaign_id: 'campaign-1',
          space_id: 'space-1',
          input: {
            playbook_id: 'task-cleanup',
            source_conversation_id: 'conversation-1',
            source_surface: 'chat_quick_mission',
            playbook_kickoff: {
              window: 'last_7d',
              client_context: 'Yasir',
            },
          },
        }),
      ),
    )
  })
})
