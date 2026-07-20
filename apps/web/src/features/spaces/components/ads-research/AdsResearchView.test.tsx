import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { useAdsResearchToolbarBridgeStore } from '../../store/use-ads-research-toolbar-bridge'
import { AdsResearchView } from './AdsResearchView'

vi.mock('./AdsResearchRunsView', () => ({
  AdsResearchRunsView: ({ campaignId }: { campaignId: string | null }) => (
    <div data-testid="research-runs" data-campaign-id={campaignId ?? ''} />
  ),
}))

vi.mock('./AdsResearchLibraryView', () => ({
  AdsResearchLibraryView: () => <div data-testid="library-search" />,
}))

describe('AdsResearchView', () => {
  it('opens on Research Runs and keeps Library Search available', () => {
    render(
      <AdsResearchView
        view={{ id: 'view-1', type: 'ads_research', name: 'Ads Research' }}
        items={[]}
        researchContext={{ spaceId: 'space-1', campaignId: 'campaign-1' }}
      />,
    )

    expect(screen.getByTestId('research-runs')).toHaveAttribute('data-campaign-id', 'campaign-1')
    expect(screen.queryByTestId('library-search')).not.toBeInTheDocument()
    expect(useAdsResearchToolbarBridgeStore.getState().surface).toBe('runs')

    fireEvent.click(screen.getByRole('button', { name: 'Library Search' }))
    expect(screen.getByTestId('library-search')).toBeVisible()
    expect(useAdsResearchToolbarBridgeStore.getState().surface).toBe('library')
  })
})
