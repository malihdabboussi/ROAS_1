import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchConversations } from '@/lib/conversations'
import { AgencyClientChatsMissionsPanel } from './AgencyClientChatsMissionsPanel'

const shellMocks = vi.hoisted(() => ({
  openChatDrawer: vi.fn(),
  setWorkAreaOpen: vi.fn(),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (selector: (state: typeof shellMocks) => unknown) => selector(shellMocks),
}))

vi.mock('@/lib/conversations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/conversations')>()),
  fetchConversations: vi.fn(),
}))

vi.mock('@/components/missions/MissionDetailModalAdapter', () => ({
  MissionDetailModal: ({ mission }: { mission: { title: string } }) => (
    <div>Mission detail: {mission.title}</div>
  ),
}))

const mission = {
  id: 'mission-1',
  campaign_id: 'campaign-1',
  parent_mission_id: null,
  title: 'Build the launch plan',
  status: 'in_progress',
  updated_at: '2026-08-24T18:00:00.000Z',
}

describe('AgencyClientChatsMissionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchConversations).mockResolvedValue([
      {
        id: 'conversation-1',
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        title: ':male-construction-worker::skin-tone-3:',
        agent_id: 'vibey',
        status: 'active',
        metadata: {},
        created_at: '2026-08-24T17:00:00.000Z',
        updated_at: '2026-08-24T18:00:00.000Z',
        last_message: ':male-construction-worker::skin-tone-3:',
      },
    ])
  })

  afterEach(cleanup)

  it('loads campaign chats, hides raw emoji shortcodes, and opens the chat drawer', async () => {
    render(
      <AgencyClientChatsMissionsPanel
        campaignId="campaign-1"
        missions={[mission] as never}
        onMissionsChanged={vi.fn()}
      />,
    )

    expect(await screen.findByText('Client conversation')).toBeInTheDocument()
    expect(screen.queryByText(':male-construction-worker::skin-tone-3:')).not.toBeInTheDocument()
    expect(fetchConversations).toHaveBeenCalledWith('campaign-1')

    fireEvent.click(screen.getByRole('button', { name: /Client conversation/i }))
    expect(shellMocks.openChatDrawer).toHaveBeenCalledWith('conversation-1')
    expect(shellMocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
  })

  it('opens campaign missions in the canonical mission detail surface', async () => {
    render(
      <AgencyClientChatsMissionsPanel
        campaignId="campaign-1"
        missions={[mission] as never}
        onMissionsChanged={vi.fn()}
      />,
    )
    await waitFor(() => expect(fetchConversations).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Build the launch plan/i }))
    expect(screen.getByText('Mission detail: Build the launch plan')).toBeInTheDocument()
  })
})
