import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { AdSearchResultItem, SavedAdSearch } from '../../services/ads-research.service'
import { AdsResearchAngleSection } from './AdsResearchAngleSection'

const mocks = vi.hoisted(() => ({
  updateSavedAdSearch: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/ads-research.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateSavedAdSearch: mocks.updateSavedAdSearch,
}))

vi.mock('./AdResultsBody', () => ({
  AdResultsBody: ({
    ads,
    onAdClick,
  }: {
    ads: AdSearchResultItem[]
    onAdClick: (ad: AdSearchResultItem) => void
  }) => (
    <button type="button" onClick={() => onAdClick(ads[0]!)}>
      Open creative
    </button>
  ),
}))

vi.mock('./AdAnalysisPanel', () => ({
  AdAnalysisPanel: ({
    ad,
    researchContext,
    onAdPatch,
    onClose,
  }: {
    ad: AdSearchResultItem
    researchContext?: { angleTitle: string; query: string }
    onAdPatch: (patch: Partial<AdSearchResultItem>) => void
    onClose: () => void
  }) => (
    <div>
      <p>Creative details for {ad.advertiser_name}</p>
      <p>Research angle: {researchContext?.angleTitle}</p>
      <p>Research query: {researchContext?.query}</p>
      {ad.transcript ? <p>{ad.transcript}</p> : null}
      <button type="button" onClick={() => onAdPatch({ transcript: 'Persisted transcript' })}>
        Analyze creative
      </button>
      <button type="button" onClick={onClose}>
        Close creative
      </button>
    </div>
  ),
}))

const ad: AdSearchResultItem = {
  ad_id: 'ad-1',
  platform: 'meta',
  advertiser_name: 'Acme Insurance',
  advertiser_id: 'advertiser-1',
  format: 'video',
  creative_text: 'Learn how to build your book.',
  image_url: 'https://example.com/cover.jpg',
  video_url: 'https://example.com/video.mp4',
  landing_url: null,
  first_shown: '2026-07-01T00:00:00.000Z',
  last_shown: '2026-07-20T00:00:00.000Z',
  days_running: 20,
  reach_estimate: '10K-50K',
  is_active: true,
  details_link: 'https://example.com/ad',
}

const search: SavedAdSearch = {
  id: 'search-1',
  platform: 'meta',
  kind: 'topic',
  title: 'Angle 2: Insurance education ads',
  query: 'insurance education',
  advertiser: null,
  filters: {},
  result_count: 1,
  mission_ids: ['mission-1'],
  created_at: '2026-07-20T00:00:00.000Z',
  last_run_at: '2026-07-20T00:00:00.000Z',
  results: [ad],
  next_page_token: null,
}

describe('AdsResearchAngleSection', () => {
  it('opens the in-app creative analysis and persists generated analysis to the saved search', async () => {
    render(
      <AdsResearchAngleSection
        search={search}
        spaceId="space-1"
        index={0}
        expanded
        onToggle={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open creative' }))
    expect(screen.getByText('Creative details for Acme Insurance')).toBeVisible()
    expect(screen.getByText('Research angle: Insurance education ads')).toBeVisible()
    expect(screen.getByText('Research query: insurance education')).toBeVisible()
    expect(screen.queryByText('Angle 2: Insurance education ads')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Analyze creative' }))

    await waitFor(() =>
      expect(mocks.updateSavedAdSearch).toHaveBeenCalledWith('space-1', 'search-1', {
        results: [{ ...ad, transcript: 'Persisted transcript' }],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close creative' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open creative' }))
    expect(screen.getByText('Persisted transcript')).toBeVisible()
  })
})
