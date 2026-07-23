import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import { AdsResearchProductionPath } from './AdsResearchProductionPath'

const mocks = vi.hoisted(() => ({
  completeHumanMissionSubtask: vi.fn().mockResolvedValue({ ok: true, deliverable_id: null }),
  createMission: vi.fn().mockResolvedValue({
    id: 'launch-1',
    input: {
      playbook_id: 'meta-ads-launch',
      playbook_kickoff: { source_mission_id: 'research-1' },
    },
  }),
  fetchMissions: vi.fn().mockResolvedValue([]),
  fetchSubtasks: vi
    .fn()
    .mockResolvedValueOnce([
      {
        id: 'gate-1',
        title: 'Gate 1 - Approve research recommendations',
        status: 'awaiting_human',
        output: {},
      },
    ])
    .mockResolvedValueOnce([]),
}))

vi.mock('@/lib/missions', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  completeHumanMissionSubtask: mocks.completeHumanMissionSubtask,
  createMission: mocks.createMission,
  fetchMissions: mocks.fetchMissions,
  fetchSubtasks: mocks.fetchSubtasks,
}))

const run = {
  id: 'research-1',
  campaign_id: 'campaign-1',
  input: { playbook_id: 'ads-research' },
} as unknown as Mission

const recommendations = {
  id: 'recommendations-1',
  title: 'ADS-R#3 - Recommended Ads and Draft Copy',
  content: '<h2>Concept 1: The Referral Ceiling Video</h2><h2>Concept 2: Producer Scorecard</h2>',
} as MissionDeliverable

describe('AdsResearchProductionPath', () => {
  it('persists selected concepts at the human gate and starts a linked launch mission', async () => {
    render(
      <AdsResearchProductionPath
        run={run}
        deliverables={[recommendations]}
        spaceId="space-1"
        onOpenRecommendations={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /The Referral Ceiling Video/i }))
    fireEvent.click(screen.getByRole('button', { name: /Approve and start production/i }))

    await waitFor(() =>
      expect(mocks.completeHumanMissionSubtask).toHaveBeenCalledWith(
        'research-1',
        'gate-1',
        expect.stringContaining('The Referral Ceiling Video (recording)'),
      ),
    )
    expect(mocks.createMission).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: 'campaign-1',
        space_id: 'space-1',
        idempotency_key: 'ads-research-production-research-1',
        input: expect.objectContaining({
          playbook_id: 'meta-ads-launch',
          playbook_kickoff: expect.objectContaining({
            source_mission_id: 'research-1',
            approved_concepts: [
              expect.objectContaining({
                title: 'The Referral Ceiling Video',
                route: 'recording',
              }),
            ],
          }),
        }),
      }),
    )
    expect(await screen.findByText('Meta Ads Launch started')).toBeVisible()
  })
})
