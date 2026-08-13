import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fetchCampaignAssetSummary } from '@/features/studio/services/campaign.service'
import { CanvasResourcePicker } from './CanvasResourcePicker'

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaignAssetSummary: vi.fn(),
}))

describe('CanvasResourcePicker', () => {
  it('places a selected campaign resource as a typed Canvas reference', async () => {
    vi.mocked(fetchCampaignAssetSummary).mockResolvedValue({
      offers: [],
      funnels: [{ id: 'funnel-1', name: 'Webinar funnel' }],
      ads: [],
      sequences: [{ id: 'sequence-1', name: 'Reminder emails' }],
      presentations: [],
      avatars: [],
    })
    const onSelect = vi.fn()

    render(
      <CanvasResourcePicker campaignId="campaign-1" onClose={vi.fn()} onSelect={onSelect} />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'Webinar funnel' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Webinar funnel' }))

    expect(fetchCampaignAssetSummary).toHaveBeenCalledWith('campaign-1')
    expect(onSelect).toHaveBeenCalledWith({ id: 'funnel-1', title: 'Webinar funnel', type: 'funnels' })
  })
})
