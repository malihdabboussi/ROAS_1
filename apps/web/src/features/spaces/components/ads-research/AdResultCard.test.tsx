import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdSearchResultItem } from '../../services/ads-research.service'
import { AdResultCard } from './AdResultCard'

const brokenVideo = {
  ad_id: 'video-1',
  platform: 'tiktok',
  advertiser_name: 'BUPA Insurance Limited',
  advertiser_id: 'bupa',
  format: 'video',
  creative_text: null,
  image_url: 'https://expired.example.com/cover.jpg',
  video_url: 'https://example.com/video.mp4',
  landing_url: null,
  first_shown: '2026-02-01T00:00:00.000Z',
  last_shown: '2026-07-01T00:00:00.000Z',
  days_running: 150,
  reach_estimate: '1M-10M',
  is_active: true,
  details_link: 'https://example.com/ad',
} satisfies AdSearchResultItem

afterEach(cleanup)

describe('AdResultCard', () => {
  it('shows the complete creative without cropping it', () => {
    render(<AdResultCard ad={brokenVideo} saved={false} saving={false} onClick={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'Ad creative preview' })).toHaveClass('object-contain')
    expect(screen.getByRole('img', { name: 'Ad creative preview' })).not.toHaveClass('object-cover')
  })

  it('replaces an expired image with a compact intentional media fallback', () => {
    render(<AdResultCard ad={brokenVideo} saved={false} saving={false} onClick={vi.fn()} />)

    fireEvent.error(screen.getByRole('img', { name: 'Ad creative preview' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Preview unavailable')).toBeVisible()
    expect(screen.getByText('Open the original ad')).toBeVisible()
    expect(screen.getByText('BUPA Insurance Limited')).toBeVisible()
  })
})
