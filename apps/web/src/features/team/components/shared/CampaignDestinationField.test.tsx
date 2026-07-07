import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import { CampaignDestinationField } from './CampaignDestinationField'

function campaignFixture(id: string, name: string): Campaign {
  return {
    id,
    user_id: 'user-1',
    name,
    campaign_type: 'general',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
  }
}

describe('CampaignDestinationField', () => {
  it('renders campaign options and emits selected campaign ids or null', () => {
    const onChange = vi.fn()

    render(
      <CampaignDestinationField
        value="campaign-2"
        campaigns={[
          campaignFixture('campaign-1', 'Main Campaign'),
          campaignFixture('campaign-2', 'Launch Campaign'),
        ]}
        onChange={onChange}
      />,
    )

    const select = screen.getByRole('combobox')
    expect((select as HTMLSelectElement).value).toBe('campaign-2')
    expect(screen.getByRole('option', { name: 'No campaign' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Main Campaign' })).toBeTruthy()

    fireEvent.change(select, { target: { value: 'campaign-1' } })
    fireEvent.change(select, { target: { value: '' } })

    expect(onChange).toHaveBeenNthCalledWith(1, 'campaign-1')
    expect(onChange).toHaveBeenNthCalledWith(2, null)
  })
})
