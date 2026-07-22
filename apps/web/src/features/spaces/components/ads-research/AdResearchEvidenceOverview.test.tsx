import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { AdSearchResultItem } from '../../services/ads-research.service'
import { AdResearchEvidenceOverview } from './AdResearchEvidenceOverview'

const ad = {
  ad_id: 'ad-1',
  platform: 'meta',
  advertiser_name: 'Acme Insurance',
  advertiser_id: 'acme',
  format: 'video',
  creative_text: 'Learn how to build your book.',
  image_url: null,
  video_url: null,
  landing_url: 'https://acme.example.com/webinar/register',
  first_shown: '2026-07-01T00:00:00.000Z',
  last_shown: '2026-07-20T00:00:00.000Z',
  days_running: 20,
  reach_estimate: '10K-50K',
  is_active: true,
  details_link: 'https://example.com/ad',
} satisfies AdSearchResultItem

describe('AdResearchEvidenceOverview', () => {
  it('shows the collected evidence before a deep analysis is requested', () => {
    const onDeepAnalyze = vi.fn()
    render(
      <AdResearchEvidenceOverview
        ad={ad}
        researchContext={{ angleTitle: 'Insurance education', query: 'insurance education' }}
        analyzing={false}
        analyzeError={null}
        onDeepAnalyze={onDeepAnalyze}
      />,
    )

    expect(screen.getByText('Learn how to build your book.')).toBeVisible()
    expect(screen.getByText('Meta Ads')).toBeVisible()
    expect(screen.getByText('acme.example.com')).toBeVisible()
    expect(screen.getByText(/Blaze saved this as evidence for Insurance education/i)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Deep analyze' }))
    expect(onDeepAnalyze).toHaveBeenCalledOnce()
  })
})
