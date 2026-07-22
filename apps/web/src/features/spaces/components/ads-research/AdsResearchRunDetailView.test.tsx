import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import { AdsResearchRunDetailView } from './AdsResearchRunDetailView'

const mocks = vi.hoisted(() => ({
  listSavedAdSearches: vi.fn().mockResolvedValue([
    {
      id: 'search-1',
      mission_ids: ['mission-1'],
      created_at: '2026-07-20T12:05:00.000Z',
    },
    {
      id: 'search-2',
      mission_ids: ['mission-1'],
      created_at: '2026-07-20T12:06:00.000Z',
    },
  ]),
  getSavedAdSearch: vi.fn().mockImplementation((_spaceId: string, searchId: string) =>
    Promise.resolve(
      searchId === 'search-1'
        ? {
            id: 'search-1',
            title: 'Competitor webinar ads',
            platform: 'meta',
            results: [{ ad_id: 'ad-1', platform: 'meta' }],
          }
        : {
            id: 'search-2',
            title: 'Insurance education ads',
            platform: 'tiktok',
            results: [{ ad_id: 'ad-2', platform: 'tiktok' }],
          },
    ),
  ),
}))

vi.mock('../../services/ads-research.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listSavedAdSearches: mocks.listSavedAdSearches,
  getSavedAdSearch: mocks.getSavedAdSearch,
}))

vi.mock('./AdResultsBody', () => ({
  AdResultsBody: ({ ads }: { ads: Array<{ ad_id: string }> }) => (
    <div data-testid={`visual-ads-${ads[0]?.ad_id}`}>{ads.map((ad) => ad.ad_id).join(',')}</div>
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

const scriptDeliverable = {
  id: 'deliverable-1',
  title: 'Task 5 - ADS-R#4 - Draft Video Ad Scripts',
} as MissionDeliverable

const recommendationsDeliverable = {
  id: 'deliverable-2',
  title: 'Task 4 - ADS-R#3 - Recommended Ads and Draft Copy',
} as MissionDeliverable

const marketDeliverable = {
  id: 'deliverable-3',
  title: 'Task 3 - ADS-R#2 - Market and Competitive Research',
} as MissionDeliverable

describe('AdsResearchRunDetailView', () => {
  it('combines visual ad evidence and mission deliverables in one report', async () => {
    render(
      <AdsResearchRunDetailView
        run={run}
        deliverables={[scriptDeliverable, recommendationsDeliverable, marketDeliverable]}
        spaceId="space-1"
        onBack={vi.fn()}
        onOpenMission={vi.fn()}
      />,
    )

    expect(await screen.findByText('Competitor webinar ads')).toBeVisible()
    expect(screen.getByText('Insurance education ads')).toBeVisible()
    expect(screen.getByText('RESEARCH SUMMARY')).toBeVisible()
    expect(screen.getByText('We researched')).toBeVisible()
    expect(screen.getByText('What Blaze found')).toBeVisible()
    expect(screen.getByText('What Blaze created')).toBeVisible()
    expect(screen.getByText('What happens next')).toBeVisible()
    expect(screen.getByRole('button', { name: /Review recommended ads/i })).toBeVisible()
    expect(screen.getByText('2 angles')).toBeVisible()
    expect(screen.getByText('2 visual ads')).toBeVisible()
    expect(screen.getByText('3 outputs')).toBeVisible()
    expect(screen.getByTestId('visual-ads-ad-1')).toHaveTextContent('ad-1')
    expect(screen.queryByTestId('visual-ads-ad-2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Insurance education ads/i }))
    expect(screen.getByTestId('visual-ads-ad-2')).toHaveTextContent('ad-2')
    expect(screen.queryByTestId('visual-ads-ad-1')).not.toBeInTheDocument()
    expect(screen.getByText('Draft Video Ad Scripts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mission Details' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Rerun Research' })).not.toBeInTheDocument()
  })
})
