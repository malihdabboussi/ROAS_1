import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdsResearchRunsView } from './AdsResearchRunsView'

const mocks = vi.hoisted(() => ({
  fetchMissions: vi.fn().mockResolvedValue([]),
  fetchDeliverablesForMissions: vi.fn().mockResolvedValue({}),
  openFreshChatDrawer: vi.fn(),
  seedComposer: vi.fn(),
  ensureAgencyTeam: vi.fn().mockResolvedValue({
    ok: true,
    agents: [{ role_key: 'ads_manager', agent_key: 'blaze' }],
  }),
  listSavedAdSearches: vi.fn().mockResolvedValue([]),
  getSavedAdSearch: vi.fn(),
}))

const existingRun = {
  id: 'mission-previous',
  title: 'Ads Research',
  brief: 'Research the insurance education offer',
  created_at: '2026-07-20T12:00:00.000Z',
  updated_at: '2026-07-20T12:30:00.000Z',
  campaign_id: 'campaign-1',
  input: { playbook_id: 'ads-research' },
  subtask_done: 6,
  subtask_total: 6,
  status: 'complete',
}

vi.mock('@/lib/missions', () => ({
  fetchMissions: mocks.fetchMissions,
  fetchDeliverablesForMissions: mocks.fetchDeliverablesForMissions,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: { seedComposer: typeof mocks.seedComposer }) => unknown) =>
    selector({ seedComposer: mocks.seedComposer }),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (
    selector: (state: { openFreshChatDrawer: typeof mocks.openFreshChatDrawer }) => unknown,
  ) => selector({ openFreshChatDrawer: mocks.openFreshChatDrawer }),
}))

vi.mock('@/components/missions/MissionDetailModalAdapter', () => ({
  MissionDetailModal: () => null,
}))

vi.mock('../../services/ads-research.service', () => ({
  ensureAdsResearchAgencyTeam: mocks.ensureAgencyTeam,
  listSavedAdSearches: mocks.listSavedAdSearches,
  getSavedAdSearch: mocks.getSavedAdSearch,
}))

describe('AdsResearchRunsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens Blaze in chat with the Ads Research intake and current Space context', async () => {
    render(<AdsResearchRunsView spaceId="space-1" campaignId="campaign-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Run Research' }))

    await vi.waitFor(() => expect(mocks.openFreshChatDrawer).toHaveBeenCalledOnce())
    expect(mocks.ensureAgencyTeam).toHaveBeenCalledWith('campaign-1')
    expect(mocks.seedComposer).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: 'blaze',
        railIntent: 'new',
        workContext: {
          surface: 'spaces',
          spaceId: 'space-1',
          campaignId: 'campaign-1',
        },
        content: expect.stringContaining('What is this research for?'),
      }),
    )
    expect(mocks.seedComposer.mock.calls[0]?.[0].content).toContain('Standard or deep?')
    expect(mocks.seedComposer.mock.calls[0]?.[0].content).toContain('delegate_to_agent')
    expect(mocks.seedComposer.mock.calls[0]?.[0].content).toContain('target_agent_key: `vibey`')
    expect(mocks.seedComposer.mock.calls[0]?.[0].content).toContain(
      'input.playbook_id: `ads-research`',
    )
    expect(mocks.seedComposer.mock.calls[0]?.[0].content).toContain(
      'Do not send me to Mission Control',
    )
  })

  it('opens Blaze with a grounded replacement-run preflight', async () => {
    mocks.fetchMissions.mockResolvedValueOnce([existingRun])
    render(<AdsResearchRunsView spaceId="space-1" campaignId="campaign-1" />)

    fireEvent.click(await screen.findByText('Research the insurance education offer'))
    fireEvent.click(screen.getByRole('button', { name: 'Rerun Research' }))

    await vi.waitFor(() => expect(mocks.openFreshChatDrawer).toHaveBeenCalledOnce())
    expect(mocks.ensureAgencyTeam).toHaveBeenCalledWith('campaign-1')
    expect(mocks.seedComposer).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: 'blaze',
        railIntent: 'new',
        workContext: {
          surface: 'spaces',
          spaceId: 'space-1',
          campaignId: 'campaign-1',
        },
        content: expect.stringContaining('mission-previous'),
      }),
    )
    const prompt = mocks.seedComposer.mock.calls[0]?.[0].content
    expect(prompt).toContain('verify the client identity')
    expect(prompt).toContain('Customer Brain')
    expect(prompt).toContain('mounted Meta')
    expect(prompt).toContain('fresh replacement mission')
    expect(prompt).toContain('delegate_to_agent')
    expect(prompt).toContain('target_agent_key: `vibey`')
    expect(prompt).toContain('input.playbook_id: `ads-research`')
    expect(prompt).toContain('Do not reuse')
  })
})
