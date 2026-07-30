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

  it('defaults to the contextual client and reports the launched mission to chat wiring', async () => {
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
        sourceConversationId="conversation-1"
        onClose={vi.fn()}
        onStarted={onStarted}
      />,
    )

    expect(screen.queryByText('Searchable campaign and space picker')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Static ad book/i })).toBeInTheDocument()
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
    expect(onStarted).toHaveBeenCalledWith('mission-1', 'Static Ad Production', 'space-1')
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
})
