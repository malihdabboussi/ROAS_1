import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import { AdsResearchRunDetailView } from './AdsResearchRunDetailView'

const mocks = vi.hoisted(() => ({
  listSavedAdSearches: vi.fn().mockResolvedValue([
    {
      id: 'search-1',
      mission_ids: [],
      created_at: '2026-07-20T12:05:00.000Z',
    },
  ]),
  getSavedAdSearch: vi.fn().mockResolvedValue({
    id: 'search-1',
    title: 'Competitor webinar ads',
    platform: 'meta',
    results: [{ ad_id: 'ad-1', platform: 'meta' }],
  }),
}))

vi.mock('../../services/ads-research.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listSavedAdSearches: mocks.listSavedAdSearches,
  getSavedAdSearch: mocks.getSavedAdSearch,
}))

vi.mock('./AdResultsBody', () => ({
  AdResultsBody: ({ ads }: { ads: Array<{ ad_id: string }> }) => (
    <div data-testid="visual-ads">{ads.map((ad) => ad.ad_id).join(',')}</div>
  ),
}))

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: () => null,
}))

const run = {
  id: 'mission-1',
  title: 'Ads Research',
  brief: 'New webinar campaign',
  created_at: '2026-07-20T12:00:00.000Z',
  updated_at: '2026-07-20T12:30:00.000Z',
  started_at: '2026-07-20T12:00:00.000Z',
  completed_at: null,
  campaign_id: 'campaign-1',
} as Mission

const deliverable = {
  id: 'deliverable-1',
  title: 'Task 5 - ADS-R#4 - Draft Video Ad Scripts',
} as MissionDeliverable

describe('AdsResearchRunDetailView', () => {
  it('combines visual ad evidence and mission deliverables in one report', async () => {
    const onRerun = vi.fn()
    render(
      <AdsResearchRunDetailView
        run={run}
        deliverables={[deliverable]}
        spaceId="space-1"
        onBack={vi.fn()}
        onOpenMission={vi.fn()}
        onRerun={onRerun}
      />,
    )

    expect(await screen.findByText('Competitor webinar ads')).toBeVisible()
    expect(screen.getByTestId('visual-ads')).toHaveTextContent('ad-1')
    expect(screen.getByText('Draft Video Ad Scripts')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mission Details' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Rerun Research' }))
    expect(onRerun).toHaveBeenCalledOnce()
  })
})
