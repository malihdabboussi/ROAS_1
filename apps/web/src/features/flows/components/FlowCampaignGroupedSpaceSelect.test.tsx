import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCampaigns } from '@/lib/campaigns/campaign-api'
import { FlowCampaignGroupedSpaceSelect } from './FlowCampaignGroupedSpaceSelect'

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaigns: vi.fn(),
}))

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('FlowCampaignGroupedSpaceSelect', () => {
  it('groups spaces by campaign with search', async () => {
    vi.mocked(fetchCampaigns).mockResolvedValue([
      {
        id: 'campaign-1',
        user_id: 'user-1',
        name: 'Summer campaign',
        campaign_type: 'marketing',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-23T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ])
    const onChange = vi.fn()

    render(
      <FlowCampaignGroupedSpaceSelect
        spaces={[
          { id: 'space-1', title: 'Lead intake', campaign_id: 'campaign-1' },
          { id: 'space-2', title: 'Standalone ops', campaign_id: null },
        ]}
        value=""
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select space' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search campaigns & spaces…')).toBeTruthy()
    })

    await waitFor(() => {
      expect(screen.getAllByText('Summer campaign').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Other spaces').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Lead intake/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /Standalone ops/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Lead intake/i }))
    expect(onChange).toHaveBeenCalledWith('space-1')
  })
})
