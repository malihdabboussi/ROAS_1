import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCampaigns } from '@/lib/campaigns/campaign-api'
import { FlowComposerSpaceSelector } from './FlowComposerSpaceSelector'

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaigns: vi.fn(),
}))

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('FlowComposerSpaceSelector', () => {
  it('groups spaces by campaign and selects a space for Loop', async () => {
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
    const onSelectSpace = vi.fn()

    render(
      <FlowComposerSpaceSelector
        spaces={[
          {
            id: 'space-1',
            title: 'Lead intake',
            campaign_id: 'campaign-1',
            schema: { icon: 'inbox', icon_color: 'blue' },
          },
          {
            id: 'space-2',
            title: 'Standalone ops',
            campaign_id: null,
            schema: { icon: 'layout-grid', icon_color: 'default' },
          },
        ]}
        selectedSpaceId={null}
        onSelectSpace={onSelectSpace}
      />,
    )

    expect(screen.getByRole('button', { name: 'Loop scope: Create anything' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Loop scope: Create anything' }))

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search spaces...')
      expect(document.activeElement).toBe(searchInput)
    })

    await waitFor(() => {
      expect(screen.getByText('Summer campaign')).toBeTruthy()
    })
    expect(screen.getByText('Other spaces')).toBeTruthy()

    fireEvent.click(screen.getByRole('option', { name: /Lead intake/i }))

    expect(onSelectSpace).toHaveBeenCalledWith('space-1')
  })

  it('shows the selected space title in the inline composer control', async () => {
    vi.mocked(fetchCampaigns).mockResolvedValue([])

    render(
      <FlowComposerSpaceSelector
        spaces={[
          {
            id: 'space-1',
            title: 'Customer inbox',
            campaign_id: null,
            schema: null,
          },
        ]}
        selectedSpaceId="space-1"
        onSelectSpace={vi.fn()}
      />,
    )

    const selectedButton = screen.getByRole('button', { name: 'Loop space: Customer inbox' })
    expect(selectedButton).toBeTruthy()
    expect(selectedButton.textContent).toContain('Customer inbox')
  })

  it('filters spaces by search query', async () => {
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

    render(
      <FlowComposerSpaceSelector
        spaces={[
          {
            id: 'space-1',
            title: 'Lead intake',
            campaign_id: 'campaign-1',
            schema: null,
          },
          {
            id: 'space-2',
            title: 'Standalone ops',
            campaign_id: null,
            schema: null,
          },
        ]}
        selectedSpaceId={null}
        onSelectSpace={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Loop scope: Create anything' }))

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search spaces...')
      expect(document.activeElement).toBe(searchInput)
    })

    fireEvent.change(screen.getByPlaceholderText('Search spaces...'), {
      target: { value: 'lead' },
    })

    expect(screen.getByRole('option', { name: /Lead intake/i })).toBeTruthy()
    expect(screen.queryByRole('option', { name: /Standalone ops/i })).toBeNull()
  })
})
